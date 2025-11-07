// Replit Auth integration
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isDevelopment = process.env.NODE_ENV === 'development';
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: isDevelopment ? 'lax' : 'none',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await db
    .insert(users)
    .values({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
        profileImageUrl: claims["profile_image_url"],
        updatedAt: new Date(),
      },
    });
}

export async function setupAuth(app: Express) {
  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Replit Auth");
  }
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required for Replit Auth");
  }
  if (!process.env.REPL_ID) {
    throw new Error("REPL_ID is required for Replit Auth");
  }

  console.log("[Replit Auth] Initializing authentication system");
  
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Get the Replit domain for OAuth callbacks
  const getReplitDomain = () => {
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      return `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    }
    return null;
  };

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string, protocol: string = 'https') => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const callbackURL = `${protocol}://${domain}/api/callback`;
      console.log(`[Replit Auth] Registering strategy for ${callbackURL}`);
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Always use Replit domain for OAuth callbacks (Replit OIDC doesn't accept localhost)
    const domain = getReplitDomain() || req.get('host') || req.hostname;
    const protocol = 'https'; // Replit domains are always HTTPS
    ensureStrategy(domain, protocol);
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Always use Replit domain for OAuth callbacks
    const domain = getReplitDomain() || req.get('host') || req.hostname;
    const protocol = 'https';
    ensureStrategy(domain, protocol);
    passport.authenticate(`replitauth:${domain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const domain = getReplitDomain() || req.get('host') || req.hostname;
    const protocol = 'https';
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${protocol}://${domain}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
