import { intersection } from 'martinez-polygon-clipping';
import { sectorTerritory } from './sector-enclaves';

type Point = [number, number];
type SectorBoundary = {
  id: string; name: string; color: string; faction: string;
  points: Point[]; isContested?: boolean | null;
};

function bounds(points: Point[]) {
  return {
    minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])),
    minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])),
  };
}

/** Derived from saved borders, never creates duplicate or stale sector records. */
export function getContestedOverlaps(sectors: SectorBoundary[]) {
  const eligible = sectors.filter(s => !s.isContested && s.points.length >= 3);
  const boxes = eligible.map(s => bounds(s.points));
  const territories = eligible.map(s => sectorTerritory(s, sectors));
  const overlaps: { id: string; name: string; colors: [string, string]; path: string }[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i], b = eligible[j], ab = boxes[i], bb = boxes[j];
      if (a.faction.trim().toLowerCase() === b.faction.trim().toLowerCase()) continue;
      if (ab.maxX <= bb.minX || bb.maxX <= ab.minX || ab.maxY <= bb.minY || bb.maxY <= ab.minY) continue;
      if (!territories[i].length || !territories[j].length) continue;
      const result = intersection(territories[i], territories[j]) as Point[][][] | null;
      if (!result?.length) continue;
      // Retain interior rings; evenodd rendering keeps holes unpainted.
      const polygons = result.filter(poly => {
        const ring = poly[0];
        if (!ring || ring.length < 4) return false;
        const area = ring.reduce((sum, p, k) => {
          const next = ring[(k + 1) % ring.length];
          return sum + p[0] * next[1] - next[0] * p[1];
        }, 0);
        return Math.abs(area) > 0.001;
      });
      if (!polygons.length) continue;
      overlaps.push({
        id: `${i}-${j}`,
        name: `${a.name} / ${b.name} — Contested (${a.faction} / ${b.faction})`,
        colors: [a.color, b.color],
        path: polygons.flatMap(poly => poly.map(ring => `M ${ring.map(p => p.join(' ')).join(' L ')} Z`)).join(' '),
      });
    }
  }
  return overlaps;
}