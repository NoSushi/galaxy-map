import { useId, useMemo } from 'react';
import type { Sector } from '@/lib/data';
import { getContestedOverlaps } from '@/lib/contested-overlaps';

export function AutoContestedAreas({ sectors }: { sectors: Sector[] }) {
  const prefix = useId().replace(/:/g, '');
  const areas = useMemo(() => getContestedOverlaps(sectors), [sectors]);
  return (
    <g className="pointer-events-none" data-testid="automatic-contested-areas">
      <defs>
        {areas.map(area => (
          <pattern key={area.id} id={`${prefix}-contested-${area.id}`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="20" fill={`hsl(${area.colors[0]})`} />
            <rect x="10" width="10" height="20" fill={`hsl(${area.colors[1]})`} />
          </pattern>
        ))}
      </defs>
      {areas.map(area => (
        <path key={area.id} d={area.path} fill={`url(#${prefix}-contested-${area.id})`}
          fillRule="evenodd" fillOpacity={0.5} stroke="white" strokeOpacity={0.4}
          strokeWidth={1} strokeDasharray="5 5" aria-label={area.name}>
          <title>{area.name}</title>
        </path>
      ))}
    </g>
  );
}