import { previewAppendixRegions, type AppendixEntry, type RegionPlanet } from "./appendix-matching";
import { previewRegionImport } from "./region-reference";

interface CombinedCandidate {
  id: string;
  name: string;
  previous: string | null;
  region: string;
  source: "pdf" | "rings";
  ringRegion: string | null;
  sourceName: string;
  sourceRegion: string;
  page: number | null;
}

export function previewCombinedRegions(
  planets: (RegionPlanet & { x: number; y: number })[],
  entries: AppendixEntry[],
) {
  const rings = previewRegionImport(planets);
  // Match against blanks to retain ALL authoritative PDF matches, including
  // those already equal to the current value. These must also block ring fills.
  const pdf = previewAppendixRegions(planets.map(p => ({ ...p, oversector: null })), entries);
  const pdfById = new Map(pdf.candidates.map(p => [p.id, p]));
  const ringById = new Map(rings.candidates.map(p => [p.id, p]));
  const pdfChanges = previewAppendixRegions(planets, entries);
  const changingPdfIds = new Set(pdfChanges.candidates.map(p => p.id));
  const candidates = planets.flatMap<CombinedCandidate>(planet => {
    const match = pdfById.get(planet.id);
    const ring = ringById.get(planet.id);
    const previous = planet.oversector?.trim() || null;
    if (match) {
      if (!changingPdfIds.has(planet.id)) return [];
      return [{ ...match, previous, source: "pdf" as const, ringRegion: ring?.region ?? null }];
    }
    if (!ring) return [];
    return [{
      ...ring, previous, source: "rings" as const, ringRegion: ring.region,
      sourceName: "Map rings", sourceRegion: ring.region, page: null,
    }];
  });
  const changedIds = new Set(candidates.map(p => p.id));
  const ringReview = new Map(rings.review.map(p => [p.id, p.reason]));
  const review = pdfChanges.review.filter(p => !changedIds.has(p.id)).map(p => ({
    ...p, reason: [p.reason, ringReview.get(p.id) ?? (p.current ? "Existing region preserved" : "")].filter(Boolean).join("; "),
  }));
  const counts: Record<string, number> = {};
  for (const p of candidates) counts[p.region] = (counts[p.region] ?? 0) + 1;
  return {
    candidates, review, counts, total: planets.length, sourceEntries: entries.length,
    matched: pdf.matched + candidates.filter(p => p.source === "rings").length,
    unchanged: planets.length - candidates.length,
    filled: candidates.filter(p => !p.previous).length,
    corrected: candidates.filter(p => p.previous).length,
    pdfUpdates: candidates.filter(p => p.source === "pdf").length,
    ringUpdates: candidates.filter(p => p.source === "rings").length,
  };
}