import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

const databaseUrl = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set.");
}

export const db = drizzle({
  connection: databaseUrl,
  schema,
  ws: ws,
});
