// Environment configuration for Replit Auth and application
export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  replId: process.env.REPL_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
