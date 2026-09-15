import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { mapOverlays, planets } from "@shared/schema";
import { previewRegionImport, regionReferenceOverlay } from "@shared/region-reference";
import { storage } from "./storage";

export async function getRegionImportPreview() {
  const [allPlanets, overlay] = await Promise.all([
    storage.getAllPlanets(),
    storage.getMapOverlay(regionReferenceOverlay.id),
  ]);
  return { ...previewRegionImport(allPlanets), overlayInstalled: !!overlay };
}

/** Called only by the authenticated, explicitly confirmed in-app operation. */
export async function applyRegionImport() {
  const assetPath = resolve(process.cwd(), process.env.NODE_ENV === "production"
    ? "dist/public/galactic-regions-reference.webp"
    : "client/public/galactic-regions-reference.webp");
  const imageData = `data:image/webp;base64,${(await readFile(assetPath)).toString("base64")}`;
  return db.transaction(async tx => {
    // Recompute from current positions, protecting concurrent planet edits.
    const current = await tx.select().from(planets).for("update");
    const preview = previewRegionImport(current);
    if (preview.candidates.length) {
      const updates = JSON.stringify(preview.candidates.map(item => ({ id: item.id, region: item.region })));
      await tx.execute(sql`
        UPDATE planets AS p SET oversector = changes.region
        FROM jsonb_to_recordset(${updates}::jsonb) AS changes(id text, region text)
        WHERE p.id = changes.id AND (p.oversector IS NULL OR btrim(p.oversector) = '')
      `);
    }
    const overlay = { ...regionReferenceOverlay, imageData };
    await tx.insert(mapOverlays).values(overlay).onConflictDoUpdate({
      target: mapOverlays.id,
      set: overlay,
    });
    return { updated: preview.candidates.length, review: preview.review.length };
  });
}