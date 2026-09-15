import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Explicit, additive migration only. Never push the full schema to this DB:
// unrelated map tables may contain externally managed columns.
if (!process.env.CUSTOM_DATABASE_URL) throw new Error("CUSTOM_DATABASE_URL is required; refusing to migrate the fallback database");
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.CUSTOM_DATABASE_URL });
try {
  const counts = async () => (await pool.query(
    `SELECT (SELECT count(*) FROM planets) AS planets,
            (SELECT count(*) FROM sectors) AS sectors,
            (SELECT count(*) FROM hyperspace_lanes) AS lanes`
  )).rows[0];
  console.log("Map records before:", await counts());
  await pool.query(`CREATE TABLE IF NOT EXISTS map_overlays (
    id varchar(64) PRIMARY KEY,
    name text NOT NULL,
    image_data text NOT NULL,
    x integer NOT NULL DEFAULT 0,
    y integer NOT NULL DEFAULT 0,
    width integer NOT NULL DEFAULT 5000 CHECK (width >= 100 AND width <= 100000),
    height integer NOT NULL DEFAULT 5000 CHECK (height >= 100 AND height <= 100000),
    opacity integer NOT NULL DEFAULT 50 CHECK (opacity >= 0 AND opacity <= 100)
  )`);
  console.log("Map records after:", await counts());
  console.log("Overlay table ready.");
} finally {
  await pool.end();
}