import { sql } from "drizzle-orm";
import { db } from "./db";
import { planets } from "@shared/schema";
import entries from "@shared/appendix-regions.json";
import { previewAppendixRegions } from "@shared/appendix-matching";
const regionFields = { id: planets.id, name: planets.name, oversector: planets.oversector };

export async function getAppendixPreview() {
  return previewAppendixRegions(await db.select(regionFields).from(planets), entries);
}

/** User-confirmed operation. Never creates planets or changes coordinates. */
export async function applyAppendixRegions() {
  return db.transaction(async tx => {
    const existing = await tx.select(regionFields).from(planets).for("update");
    const preview = previewAppendixRegions(existing, entries);
    if (preview.candidates.length) {
      const changes = JSON.stringify(preview.candidates.map(item => ({ id: item.id, region: item.region })));
      await tx.execute(sql`
        UPDATE planets AS p SET oversector = changes.region
        FROM jsonb_to_recordset(${changes}::jsonb) AS changes(id text, region text)
        WHERE p.id = changes.id
      `);
    }
    return { updated: preview.candidates.length, filled: preview.filled, corrected: preview.corrected, review: preview.review.length };
  });
}