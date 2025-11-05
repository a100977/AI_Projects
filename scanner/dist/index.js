// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/airtable.ts
import Airtable from "airtable";
var airtablePAT = process.env.AIRTABLE_API_KEY;
var airtableBaseId = process.env.AIRTABLE_BASE_ID;
if (!airtablePAT || !airtableBaseId) {
  console.warn("[AirTable] Missing credentials. Set AIRTABLE_API_KEY (PAT) and AIRTABLE_BASE_ID environment variables.");
}
var airtable = new Airtable({
  apiKey: airtablePAT,
  endpointUrl: "https://api.airtable.com"
});
var base = airtable.base(airtableBaseId || "");
var TABLES = {
  USERS: "Users",
  PORTFOLIOS: "Portfolios",
  STOCKS: "Stocks",
  STOCK_ANALYSIS: "Stock Analysis"
};
async function findUserByEmail(email) {
  try {
    const records = await base(TABLES.USERS).select({
      filterByFormula: `{Email Address} = '${email}'`,
      maxRecords: 1
    }).firstPage();
    if (records.length === 0) return null;
    return {
      id: records[0].id,
      fields: records[0].fields
    };
  } catch (error) {
    console.error("[AirTable] Error finding user:", error);
    throw error;
  }
}
async function createUser(user) {
  try {
    const record = await base(TABLES.USERS).create({
      "Full Name": user["Full Name"] || "",
      "Email Address": user["Email Address"] || "",
      "Google ID": user["Google ID"],
      "Subscription Tier": user["Subscription Tier"] || "Free",
      "Date Joined": (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    });
    return {
      id: record.id,
      fields: record.fields
    };
  } catch (error) {
    console.error("[AirTable] Error creating user:", error);
    throw error;
  }
}
async function updateUser(recordId, updates) {
  try {
    const record = await base(TABLES.USERS).update(recordId, updates);
    return {
      id: record.id,
      fields: record.fields
    };
  } catch (error) {
    console.error("[AirTable] Error updating user:", error);
    throw error;
  }
}
async function getUserPortfolios(userRecordId) {
  try {
    const records = await base(TABLES.PORTFOLIOS).select({
      filterByFormula: `SEARCH('${userRecordId}', ARRAYJOIN({User}))`,
      sort: [{ field: "Date Added", direction: "desc" }]
    }).all();
    return records.map((record) => ({
      id: record.id,
      fields: record.fields
    }));
  } catch (error) {
    console.error("[AirTable] Error getting user portfolios:", error);
    throw error;
  }
}
async function createPortfolio(portfolio) {
  try {
    const record = await base(TABLES.PORTFOLIOS).create({
      "Name": portfolio.Name,
      "User": portfolio.User,
      "Stock": portfolio.Stock || [],
      "Notes": portfolio.Notes || "",
      "Date Added": (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    });
    return {
      id: record.id,
      fields: record.fields
    };
  } catch (error) {
    console.error("[AirTable] Error creating portfolio:", error);
    throw error;
  }
}
async function updatePortfolio(recordId, updates) {
  try {
    const record = await base(TABLES.PORTFOLIOS).update(recordId, updates);
    return {
      id: record.id,
      fields: record.fields
    };
  } catch (error) {
    console.error("[AirTable] Error updating portfolio:", error);
    throw error;
  }
}
async function deletePortfolio(recordId) {
  try {
    await base(TABLES.PORTFOLIOS).destroy(recordId);
  } catch (error) {
    console.error("[AirTable] Error deleting portfolio:", error);
    throw error;
  }
}
async function findStockBySymbol(symbol) {
  try {
    const records = await base(TABLES.STOCKS).select({
      filterByFormula: `{Ticker Symbol} = '${symbol}'`,
      maxRecords: 1
    }).firstPage();
    if (records.length === 0) return null;
    return {
      id: records[0].id,
      fields: records[0].fields
    };
  } catch (error) {
    console.error("[AirTable] Error finding stock:", error);
    throw error;
  }
}
async function createStock(stock) {
  try {
    const record = await base(TABLES.STOCKS).create(stock);
    return {
      id: record.id,
      fields: record.fields
    };
  } catch (error) {
    console.error("[AirTable] Error creating stock:", error);
    throw error;
  }
}
async function getStocksByIds(stockIds) {
  try {
    if (stockIds.length === 0) return [];
    const records = await base(TABLES.STOCKS).select({
      filterByFormula: `OR(${stockIds.map((id) => `RECORD_ID() = '${id}'`).join(", ")})`
    }).all();
    return records.map((record) => ({
      id: record.id,
      fields: record.fields
    }));
  } catch (error) {
    console.error("[AirTable] Error getting stocks:", error);
    throw error;
  }
}
async function getAnalysisForStocks(stockIds, analysisDate) {
  try {
    if (stockIds.length === 0) return [];
    const date = analysisDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const stockFilters = stockIds.map((id) => `SEARCH('${id}', ARRAYJOIN({Stock}))`).join(", ");
    const filterFormula = `AND(OR(${stockFilters}), {Analysis Date} = '${date}')`;
    const records = await base(TABLES.STOCK_ANALYSIS).select({
      filterByFormula: filterFormula,
      sort: [{ field: "Total Score", direction: "desc" }]
    }).all();
    return records.map((record) => ({
      id: record.id,
      fields: record.fields
    }));
  } catch (error) {
    console.error("[AirTable] Error getting analysis:", error);
    throw error;
  }
}
async function createAnalysis(analysis) {
  try {
    const record = await base(TABLES.STOCK_ANALYSIS).create(analysis);
    return {
      id: record.id,
      fields: record.fields
    };
  } catch (error) {
    console.error("[AirTable] Error creating analysis:", error);
    throw error;
  }
}
async function getTopAnalysis(limit = 10, analysisDate) {
  try {
    const date = analysisDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const records = await base(TABLES.STOCK_ANALYSIS).select({
      filterByFormula: `{Analysis Date} = '${date}'`,
      sort: [{ field: "Total Score", direction: "desc" }],
      maxRecords: limit
    }).all();
    return records.map((record) => ({
      id: record.id,
      fields: record.fields
    }));
  } catch (error) {
    console.error("[AirTable] Error getting top analysis:", error);
    throw error;
  }
}

// server/marketData.ts
import axios2 from "axios";
var YAHOO_FINANCE_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
async function fetchStockData(symbol, range = "6mo", interval = "1d") {
  try {
    const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}`;
    const response = await axios2.get(url, {
      params: {
        range,
        interval
      },
      timeout: 1e4
    });
    if (response.data.chart.error) {
      throw new Error(`Yahoo Finance API error: ${response.data.chart.error.description}`);
    }
    const result = response.data.chart.result[0];
    if (!result) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const dates = timestamps.map((ts) => new Date(ts * 1e3).toISOString().split("T")[0]);
    const prices = quotes.close.filter((p) => p !== null && p !== void 0);
    const volumes = quotes.volume.filter((v) => v !== null && v !== void 0);
    if (prices.length === 0) {
      throw new Error(`No valid price data for symbol: ${symbol}`);
    }
    return {
      symbol,
      prices,
      volumes,
      dates
    };
  } catch (error) {
    if (axios2.isAxiosError(error)) {
      console.error(`[MarketData] Error fetching ${symbol}:`, error.message);
      throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
    }
    throw error;
  }
}
async function fetchMultipleStocks(symbols, range = "6mo", interval = "1d") {
  const results = /* @__PURE__ */ new Map();
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      try {
        const data = await fetchStockData(symbol, range, interval);
        return { symbol, data };
      } catch (error) {
        console.error(`[MarketData] Failed to fetch ${symbol}:`, error);
        return { symbol, data: null };
      }
    });
    const batchResults = await Promise.all(promises);
    for (const { symbol, data } of batchResults) {
      if (data) {
        results.set(symbol, data);
      }
    }
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
  }
  return results;
}
async function validateStockSymbol(symbol) {
  try {
    await fetchStockData(symbol, "5d", "1d");
    return true;
  } catch (error) {
    return false;
  }
}
async function searchStocks(query) {
  const commonStocks = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "NVDA", name: "NVIDIA Corporation" },
    { symbol: "META", name: "Meta Platforms Inc." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "BRK.B", name: "Berkshire Hathaway Inc." },
    { symbol: "JPM", name: "JPMorgan Chase & Co." },
    { symbol: "V", name: "Visa Inc." },
    { symbol: "MA", name: "Mastercard Inc." },
    { symbol: "WMT", name: "Walmart Inc." },
    { symbol: "JNJ", name: "Johnson & Johnson" },
    { symbol: "PG", name: "Procter & Gamble Co." },
    { symbol: "KO", name: "The Coca-Cola Company" },
    { symbol: "PEP", name: "PepsiCo Inc." },
    { symbol: "MCD", name: "McDonald's Corporation" },
    { symbol: "AMD", name: "Advanced Micro Devices Inc." },
    { symbol: "PLTR", name: "Palantir Technologies Inc." },
    { symbol: "COIN", name: "Coinbase Global Inc." },
    { symbol: "RBLX", name: "Roblox Corporation" },
    { symbol: "SNOW", name: "Snowflake Inc." },
    { symbol: "NET", name: "Cloudflare Inc." },
    { symbol: "DDOG", name: "Datadog Inc." },
    { symbol: "CRWD", name: "CrowdStrike Holdings Inc." },
    { symbol: "ZS", name: "Zscaler Inc." }
  ];
  const upperQuery = query.toUpperCase();
  return commonStocks.filter(
    (stock) => stock.symbol.includes(upperQuery) || stock.name.toUpperCase().includes(upperQuery)
  );
}

// server/screener.ts
function calculateSMA(prices, period) {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}
function calculateEMA(prices, period) {
  if (prices.length < period) return 0;
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}
function calculateMACD(prices) {
  if (prices.length < 26) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const macdValues = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }
  const signalLine = calculateEMA(macdValues, 9);
  const histogram = macdLine - signalLine;
  return { macdLine, signalLine, histogram };
}
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter((c) => c > 0);
  const losses = recentChanges.filter((c) => c < 0).map((c) => Math.abs(c));
  const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return rsi;
}
function calculateIndicators(data) {
  const { prices, volumes } = data;
  const currentPrice = prices[prices.length - 1];
  return {
    sma10: calculateSMA(prices, 10),
    sma50: calculateSMA(prices, 50),
    sma200: calculateSMA(prices, 200),
    rsi: calculateRSI(prices, 14),
    ...calculateMACD(prices),
    volumeRatio: volumes[volumes.length - 1] / calculateSMA(volumes, 20),
    high52w: Math.max(...prices),
    currentPrice,
    avgVolume20: calculateSMA(volumes, 20)
  };
}
function scoreSMABreakout(price, indicators) {
  let score = 0;
  if (price > indicators.sma200) {
    score += 10;
  }
  if (price > indicators.sma50) {
    score += 8;
  }
  if (indicators.sma10 > indicators.sma50) {
    score += 7;
  }
  return score;
}
function scoreMACDIndicator(indicators) {
  let score = 0;
  if (indicators.macdLine > 0) {
    score += 8;
  }
  if (indicators.macdLine > indicators.signalLine) {
    score += 12;
  }
  return score;
}
function scoreRSI(rsi) {
  if (rsi >= 50 && rsi <= 70) {
    return 20;
  } else if (rsi >= 40 && rsi < 50) {
    return 12;
  } else if (rsi > 70 && rsi <= 80) {
    return 10;
  } else if (rsi > 80) {
    return 5;
  }
  return 0;
}
function scoreVolume(volumeRatio) {
  if (volumeRatio >= 2) {
    return 15;
  } else if (volumeRatio >= 1.5) {
    return 10;
  } else if (volumeRatio >= 1.2) {
    return 5;
  }
  return 0;
}
function scoreHighBreakout(price, high52w) {
  const percentFromHigh = (high52w - price) / high52w * 100;
  if (percentFromHigh <= 0) {
    return 15;
  } else if (percentFromHigh <= 5) {
    return 10;
  } else if (percentFromHigh <= 10) {
    return 5;
  }
  return 0;
}
function generateAlerts(indicators) {
  const alerts = [];
  if (indicators.sma50 > indicators.sma200 && indicators.sma10 > indicators.sma50) {
    alerts.push("GOLDEN_CROSS");
  }
  if (indicators.volumeRatio >= 3) {
    alerts.push("VOLUME_SURGE_3X");
  }
  if (indicators.currentPrice >= indicators.high52w) {
    alerts.push("NEW_52W_HIGH");
  }
  if (indicators.macdLine > indicators.signalLine && indicators.histogram > 0) {
    alerts.push("MACD_BULLISH_CROSSOVER");
  }
  return alerts;
}
function getRecommendation(totalScore) {
  if (totalScore >= 70) return "STRONG BUY";
  if (totalScore >= 50) return "BUY";
  if (totalScore >= 30) return "WATCH";
  return "PASS";
}
function analyzeStock(data) {
  const indicators = calculateIndicators(data);
  const scores = {
    sma: scoreSMABreakout(indicators.currentPrice, indicators),
    macd: scoreMACDIndicator(indicators),
    rsi: scoreRSI(indicators.rsi),
    volume: scoreVolume(indicators.volumeRatio),
    highBreakout: scoreHighBreakout(indicators.currentPrice, indicators.high52w)
  };
  const totalScore = scores.sma + scores.macd + scores.rsi + scores.volume + scores.highBreakout;
  const alerts = generateAlerts(indicators);
  const recommendation = getRecommendation(totalScore);
  const priceChange = data.prices.length >= 2 ? (data.prices[data.prices.length - 1] - data.prices[data.prices.length - 2]) / data.prices[data.prices.length - 2] * 100 : 0;
  return {
    symbol: data.symbol,
    totalScore,
    scores,
    indicators,
    recommendation,
    alerts,
    priceChange
  };
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    // Sync user with AirTable on login
    syncUser: protectedProcedure.mutation(async ({ ctx }) => {
      const { user } = ctx;
      let airtableUser = await findUserByEmail(user.email);
      if (!airtableUser) {
        airtableUser = await createUser({
          "Full Name": user.name || "",
          "Email Address": user.email,
          "Google ID": user.openId,
          "Subscription Tier": "Free"
        });
      } else if (!airtableUser.fields["Google ID"]) {
        airtableUser = await updateUser(airtableUser.id, {
          "Google ID": user.openId
        });
      }
      return {
        airtableId: airtableUser.id,
        subscriptionTier: airtableUser.fields["Subscription Tier"] || "Free"
      };
    })
  }),
  portfolios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const user = await findUserByEmail(ctx.user.email);
      if (!user) {
        return [];
      }
      const portfolios = await getUserPortfolios(user.id);
      const result = await Promise.all(portfolios.map(async (p) => {
        const stockIds = p.fields.Stock || [];
        const stocks = await getStocksByIds(stockIds);
        return {
          id: p.id,
          name: p.fields.Name,
          notes: p.fields.Notes || "",
          stocks: stocks.map((s) => ({
            id: s.id,
            symbol: s.fields["Ticker Symbol"],
            name: s.fields["Stock Name"],
            price: s.fields["Current Price"]
          })),
          stockCount: stocks.length,
          dateAdded: p.fields["Date Added"]
        };
      }));
      return result;
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(1).max(100),
      notes: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const user = await findUserByEmail(ctx.user.email);
      if (!user) {
        throw new Error("User not found in AirTable. Please refresh the page.");
      }
      const tier = user.fields["Subscription Tier"] || "Free";
      const existingPortfolios = await getUserPortfolios(user.id);
      if (tier === "Free" && existingPortfolios.length >= 1) {
        throw new Error("Free tier limited to 1 portfolio. Upgrade to Pro for 5 portfolios.");
      }
      if (tier === "Pro" && existingPortfolios.length >= 5) {
        throw new Error("Pro tier limited to 5 portfolios. Upgrade to Premium for unlimited.");
      }
      const portfolio = await createPortfolio({
        Name: input.name,
        User: [user.id],
        Notes: input.notes
      });
      return {
        id: portfolio.id,
        name: portfolio.fields.Name,
        notes: portfolio.fields.Notes || "",
        stocks: [],
        stockCount: 0
      };
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.string(),
      name: z2.string().min(1).max(100).optional(),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const updates = {};
      if (input.name) updates.Name = input.name;
      if (input.notes !== void 0) updates.Notes = input.notes;
      const portfolio = await updatePortfolio(input.id, updates);
      return {
        id: portfolio.id,
        name: portfolio.fields.Name,
        notes: portfolio.fields.Notes || ""
      };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.string() })).mutation(async ({ input }) => {
      await deletePortfolio(input.id);
      return { success: true };
    }),
    addStock: protectedProcedure.input(z2.object({
      portfolioId: z2.string(),
      symbol: z2.string().toUpperCase()
    })).mutation(async ({ ctx, input }) => {
      const isValid = await validateStockSymbol(input.symbol);
      if (!isValid) {
        throw new Error(`Invalid stock symbol: ${input.symbol}`);
      }
      let stock = await findStockBySymbol(input.symbol);
      if (!stock) {
        const stockData = await fetchMultipleStocks([input.symbol]);
        const data = stockData.get(input.symbol);
        stock = await createStock({
          "Ticker Symbol": input.symbol,
          "Stock Name": input.symbol,
          // Will be updated with real name later
          "Current Price": data?.prices[data.prices.length - 1]
        });
      }
      const user = await findUserByEmail(ctx.user.email);
      const tier = user?.fields["Subscription Tier"] || "Free";
      const stockLimit = tier === "Free" ? 10 : tier === "Pro" ? 50 : Infinity;
      const portfolios = await getUserPortfolios(user.id);
      const portfolio = portfolios.find((p) => p.id === input.portfolioId);
      if (!portfolio) {
        throw new Error("Portfolio not found");
      }
      const currentStocks = portfolio.fields.Stock || [];
      if (currentStocks.includes(stock.id)) {
        throw new Error("Stock already in portfolio");
      }
      if (currentStocks.length >= stockLimit) {
        throw new Error(`${tier} tier limited to ${stockLimit} stocks per portfolio.`);
      }
      await updatePortfolio(input.portfolioId, {
        Stock: [...currentStocks, stock.id]
      });
      return { success: true, stockId: stock.id };
    }),
    removeStock: protectedProcedure.input(z2.object({
      portfolioId: z2.string(),
      stockId: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const user = await findUserByEmail(ctx.user.email);
      const portfolios = await getUserPortfolios(user.id);
      const portfolio = portfolios.find((p) => p.id === input.portfolioId);
      if (!portfolio) {
        throw new Error("Portfolio not found");
      }
      const currentStocks = portfolio.fields.Stock || [];
      const updatedStocks = currentStocks.filter((id) => id !== input.stockId);
      await updatePortfolio(input.portfolioId, {
        Stock: updatedStocks
      });
      return { success: true };
    })
  }),
  screener: router({
    getResults: protectedProcedure.input(z2.object({
      portfolioId: z2.string(),
      date: z2.string().optional()
    })).query(async ({ ctx, input }) => {
      const user = await findUserByEmail(ctx.user.email);
      const portfolios = await getUserPortfolios(user.id);
      const portfolio = portfolios.find((p) => p.id === input.portfolioId);
      if (!portfolio) {
        throw new Error("Portfolio not found");
      }
      const stockIds = portfolio.fields.Stock || [];
      if (stockIds.length === 0) {
        return [];
      }
      const stocks = await getStocksByIds(stockIds);
      const analyses = await getAnalysisForStocks(stockIds, input.date);
      return stocks.map((stock) => {
        const analysis = analyses.find((a) => a.fields.Stock[0] === stock.id);
        if (!analysis) {
          return {
            stockId: stock.id,
            symbol: stock.fields["Ticker Symbol"],
            name: stock.fields["Stock Name"],
            price: stock.fields["Current Price"],
            hasAnalysis: false
          };
        }
        return {
          stockId: stock.id,
          symbol: stock.fields["Ticker Symbol"],
          name: stock.fields["Stock Name"],
          hasAnalysis: true,
          totalScore: analysis.fields["Total Score"],
          recommendation: analysis.fields.Recommendation,
          currentPrice: analysis.fields["Current Price"],
          priceChange: analysis.fields["Price Change Percent"],
          alerts: analysis.fields.Alerts ? analysis.fields.Alerts.split(", ") : [],
          scores: {
            sma: analysis.fields["SMA Score"],
            macd: analysis.fields["MACD Score"],
            rsi: analysis.fields["RSI Score"],
            volume: analysis.fields["Volume Score"],
            high: analysis.fields["High Score"]
          },
          indicators: {
            sma10: analysis.fields["SMA 10"],
            sma50: analysis.fields["SMA 50"],
            sma200: analysis.fields["SMA 200"],
            rsi: analysis.fields["RSI Value"],
            macdLine: analysis.fields["MACD Line"],
            signalLine: analysis.fields["Signal Line"],
            volumeRatio: analysis.fields["Volume Ratio"],
            high52w: analysis.fields["52 Week High"]
          }
        };
      });
    }),
    getTopOpportunities: protectedProcedure.input(z2.object({
      limit: z2.number().min(1).max(50).default(10),
      date: z2.string().optional()
    })).query(async ({ input }) => {
      const analyses = await getTopAnalysis(input.limit, input.date);
      const stockIds = analyses.map((a) => a.fields.Stock[0]);
      const stocks = await getStocksByIds(stockIds);
      return analyses.map((analysis) => {
        const stock = stocks.find((s) => s.id === analysis.fields.Stock[0]);
        return {
          symbol: stock?.fields["Ticker Symbol"] || "",
          name: stock?.fields["Stock Name"] || "",
          totalScore: analysis.fields["Total Score"],
          currentPrice: analysis.fields["Current Price"],
          priceChange: analysis.fields["Price Change Percent"],
          recommendation: analysis.fields.Recommendation,
          alerts: analysis.fields.Alerts ? analysis.fields.Alerts.split(", ") : []
        };
      });
    }),
    runScreener: protectedProcedure.input(z2.object({
      portfolioId: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const user = await findUserByEmail(ctx.user.email);
      const portfolios = await getUserPortfolios(user.id);
      const portfolio = portfolios.find((p) => p.id === input.portfolioId);
      if (!portfolio) {
        throw new Error("Portfolio not found");
      }
      const stockIds = portfolio.fields.Stock || [];
      if (stockIds.length === 0) {
        throw new Error("Portfolio has no stocks");
      }
      const stocks = await getStocksByIds(stockIds);
      const symbols = stocks.map((s) => s.fields["Ticker Symbol"]);
      const stockDataMap = await fetchMultipleStocks(symbols);
      const results = [];
      for (const [symbol, data] of Array.from(stockDataMap.entries())) {
        const stock = stocks.find((s) => s.fields["Ticker Symbol"] === symbol);
        if (!stock) continue;
        const analysis = analyzeStock(data);
        await createAnalysis({
          Stock: [stock.id],
          "Analysis Date": (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          "Total Score": analysis.totalScore,
          "SMA Score": analysis.scores.sma,
          "MACD Score": analysis.scores.macd,
          "RSI Score": analysis.scores.rsi,
          "Volume Score": analysis.scores.volume,
          "High Score": analysis.scores.highBreakout,
          "Current Price": analysis.indicators.currentPrice,
          "Price Change Percent": analysis.priceChange / 100,
          Recommendation: analysis.recommendation,
          Alerts: analysis.alerts.join(", "),
          "SMA 10": analysis.indicators.sma10,
          "SMA 50": analysis.indicators.sma50,
          "SMA 200": analysis.indicators.sma200,
          "RSI Value": analysis.indicators.rsi,
          "MACD Line": analysis.indicators.macdLine,
          "Signal Line": analysis.indicators.signalLine,
          "Volume Ratio": analysis.indicators.volumeRatio,
          "52 Week High": analysis.indicators.high52w
        });
        results.push(analysis);
      }
      return { success: true, count: results.length };
    }),
    searchStocks: publicProcedure.input(z2.object({ query: z2.string().min(1) })).query(async ({ input }) => {
      return await searchStocks(input.query);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
