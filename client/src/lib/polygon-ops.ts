import { diff as martinezDiff, intersection as martinezIntersect } from 'martinez-polygon-clipping';

type Pt = [number, number];
type Ring = Pt[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

function toPolygon(pts: Pt[]): Polygon {
  if (pts.length === 0) return [[]];
  const ring: Pt[] = [...pts];
  const first = ring[0], last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return [ring];
}

function fromMultiPolygon(result: MultiPolygon | null): Pt[][] {
  if (!result || result.length === 0) return [];
  return result
    .map((polygon: Polygon) => {
      const ring = polygon[0];
      if (!ring || ring.length < 3) return null;
      const isClosed =
        ring[ring.length - 1][0] === ring[0][0] &&
        ring[ring.length - 1][1] === ring[0][1];
      const pts: Pt[] = (isClosed ? ring.slice(0, -1) : ring) as Pt[];
      return pts.length >= 3 ? pts : null;
    })
    .filter((p: Pt[] | null): p is Pt[] => p !== null);
}

export function polygonArea(pts: Pt[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2;
}

/**
 * Computes subject minus clip using the Martinez polygon clipping algorithm.
 * Returns zero or more result polygons (disconnected pieces).
 */
export function polygonDifference(subject: Pt[], clip: Pt[]): Pt[][] {
  if (subject.length < 3 || clip.length < 3) return [subject];
  try {
    const result = martinezDiff(toPolygon(subject), toPolygon(clip)) as unknown as MultiPolygon | null;
    const polys = fromMultiPolygon(result);
    return polys.length > 0 ? polys : [subject];
  } catch (e) {
    console.warn('polygonDifference error:', e);
    return [subject];
  }
}

/**
 * Computes the intersection (overlapping area) of two polygons.
 * Returns zero or more result polygons.
 */
export function polygonIntersection(a: Pt[], b: Pt[]): Pt[][] {
  if (a.length < 3 || b.length < 3) return [];
  try {
    const result = martinezIntersect(toPolygon(a), toPolygon(b)) as unknown as MultiPolygon | null;
    return fromMultiPolygon(result ?? []);
  } catch (e) {
    console.warn('polygonIntersection error:', e);
    return [];
  }
}
