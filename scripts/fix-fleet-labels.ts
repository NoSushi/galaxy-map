import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";
import { fleets } from "../shared/schema";

async function main() {
  const databaseUrl = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("No DATABASE_URL set");

  const db = drizzle({ connection: databaseUrl, schema, ws });

  // Check current state
  const allFleets = await db.select({ id: fleets.id, name: fleets.name, labelMode: fleets.labelMode }).from(fleets);
  console.log(`Found ${allFleets.length} fleets`);
  const counts: Record<string, number> = {};
  for (const f of allFleets) {
    const m = f.labelMode ?? 'null';
    counts[m] = (counts[m] || 0) + 1;
  }
  console.log("Current labelMode distribution:", counts);

  // Set all fleets to 'hover'
  const result = await db.update(fleets).set({ labelMode: 'hover' });
  console.log("Updated all fleets to labelMode='hover'");

  // Verify
  const updated = await db.select({ id: fleets.id, name: fleets.name, labelMode: fleets.labelMode }).from(fleets);
  const counts2: Record<string, number> = {};
  for (const f of updated) {
    const m = f.labelMode ?? 'null';
    counts2[m] = (counts2[m] || 0) + 1;
  }
  console.log("After update distribution:", counts2);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
