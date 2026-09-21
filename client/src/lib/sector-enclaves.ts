import { diff } from 'martinez-polygon-clipping';

type Point = [number, number];
type Boundary = { id: string; points: Point[] };
type Geometry = Point[][][];

// Explicit political relationship, not a rule that all contained sectors
// are peaceful. Stable IDs keep this relationship intact after renaming.
const enclaveParents: Record<string, string> = {
  s1783184732363: 's1776765155304', // The Meridian inside The Empire
};

function closed(points: Point[]): Point[] {
  const first = points[0], last = points[points.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? points : [...points, first];
}

/** Preserve saved outlines; exclude explicitly recognised enclaves at display time. */
export function sectorTerritory(sector: Boundary, sectors: Boundary[]): Geometry {
  if (sector.points.length < 3) return [];
  let territory: Geometry = [[closed(sector.points)]];
  for (const enclave of sectors) {
    if (enclaveParents[enclave.id] !== sector.id || enclave.points.length < 3) continue;
    territory = (diff(territory, [[closed(enclave.points)]]) as Geometry | null) ?? [];
    if (!territory.length) break;
  }
  return territory;
}

export function territoryPath(geometry: Geometry): string {
  return geometry.flatMap(polygon => polygon.map(ring =>
    `M ${ring.map(point => point.join(' ')).join(' L ')} Z`
  )).join(' ');
}