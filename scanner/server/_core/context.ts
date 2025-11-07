import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "@shared/schema";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get user from Replit Auth session
    if (opts.req.isAuthenticated && opts.req.isAuthenticated()) {
      const reqUser = (opts.req as any).user;
      if (reqUser?.claims?.sub) {
        const userId = reqUser.claims.sub;
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        user = dbUser || null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
