export interface AppendixEntry {
  name: string;
  region: string;
  page: number;
}
export interface RegionPlanet {
  id: string;
  name: string;
  oversector?: string | null;
}

// Only typography is normalized. No fuzzy spelling matches, suffix removal,
// or invented aliases: e.g. Yavin and Yavin IV remain different names.
export function normalizeSystemName(name: string): string {
  return name.normalize("NFKC").toLowerCase()
    .replace(/[‘’ʼ]/g, "'").replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ").trim();
}

export function canonicalRegion(region: string): string {
  const aliases: Record<string, string> = {
    "core worlds": "Core",
    "core": "Core",
    "colonies": "The Colonies",
    "the colonies": "The Colonies",
    "expansion region": "The Expansion Region",
    "the expansion region": "The Expansion Region",
    "outer rim territories": "Outer Rim",
    "outer rim": "Outer Rim",
  };
  return aliases[region.trim().toLowerCase()] ?? region.trim();
}

export function previewAppendixRegions(planets: RegionPlanet[], entries: AppendixEntry[]) {
  const index = new Map<string, AppendixEntry[]>();
  for (const entry of entries) {
    const key = normalizeSystemName(entry.name);
    index.set(key, [...(index.get(key) ?? []), entry]);
  }
  const nameCounts = new Map<string, number>();
  for (const planet of planets) {
    const key = normalizeSystemName(planet.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const candidates: {
    id: string; name: string; previous: string | null; region: string;
    sourceName: string; sourceRegion: string; page: number;
  }[] = [];
  const review: { id: string; name: string; current: string | null; reason: string }[] = [];
  let unchanged = 0;
  for (const planet of planets) {
    const key = normalizeSystemName(planet.name);
    const matches = index.get(key) ?? [];
    const current = planet.oversector?.trim() || null;
    let reason: string | undefined;
    if (nameCounts.get(key)! > 1) reason = "Multiple existing planets share this name";
    else if (!matches.length) reason = "No unambiguous name match in the extracted appendix";
    else if (new Set(matches.map(row => canonicalRegion(row.region))).size > 1) {
      reason = "Appendix lists conflicting regions for this name";
    }
    if (reason) {
      review.push({ id: planet.id, name: planet.name, current, reason });
      continue;
    }
    const match = matches[0];
    const region = canonicalRegion(match.region);
    if (current && canonicalRegion(current).toLowerCase() === region.toLowerCase()) {
      unchanged++;
      continue;
    }
    candidates.push({
      id: planet.id, name: planet.name, previous: current, region,
      sourceName: match.name, sourceRegion: match.region, page: match.page,
    });
  }
  const counts: Record<string, number> = {};
  for (const candidate of candidates) counts[candidate.region] = (counts[candidate.region] ?? 0) + 1;
  return {
    candidates, review, unchanged, counts, total: planets.length,
    matched: unchanged + candidates.length,
    filled: candidates.filter(candidate => !candidate.previous).length,
    corrected: candidates.filter(candidate => candidate.previous).length,
    sourceEntries: entries.length,
  };
}