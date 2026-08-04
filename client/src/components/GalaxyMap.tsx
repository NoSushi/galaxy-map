import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMap, Planet, Fleet, HyperspaceLane, Sector } from '@/lib/data';
import { polygonIntersection } from '@/lib/polygon-ops';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Crown, Ship, Plus, Pencil, AlertTriangle, GitMerge, X, Crosshair } from 'lucide-react';
import { TargetingOverlay } from './TargetingOverlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// ── Snap-to-polyline helper ────────────────────────────────────────────────
// Returns the closest point on a polyline to (px, py)
function snapToPolyline(px: number, py: number, poly: [number, number][]): [number, number] {
  let minDist = Infinity;
  let best: [number, number] = [px, py];
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[i + 1];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let cx: number, cy: number;
    if (lenSq === 0) { cx = ax; cy = ay; }
    else { const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq)); cx = ax + t * dx; cy = ay + t * dy; }
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < minDist) { minDist = dist; best = [cx, cy]; }
  }
  return best;
}

// ── Polygon helpers (local) ────────────────────────────────────────────────
function _ptInPoly(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function _segIntersect(a1: [number,number], a2: [number,number], b1: [number,number], b2: [number,number]): boolean {
  const d1x = a2[0]-a1[0], d1y = a2[1]-a1[1], d2x = b2[0]-b1[0], d2y = b2[1]-b1[1];
  const cross = d1x*d2y - d1y*d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((b1[0]-a1[0])*d2y - (b1[1]-a1[1])*d2x) / cross;
  const u = ((b1[0]-a1[0])*d1y - (b1[1]-a1[1])*d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
function _polysOverlap(a: [number,number][], b: [number,number][]): boolean {
  for (const [x,y] of a) if (_ptInPoly(x, y, b)) return true;
  for (const [x,y] of b) if (_ptInPoly(x, y, a)) return true;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      if (_segIntersect(a[i], a[(i+1)%a.length], b[j], b[(j+1)%b.length])) return true;
  return false;
}

const FACTION_COLORS: Record<string, string> = {
  'Galactic Republic': '210 80% 55%',
  'Empire': '0 75% 50%',
  'Hutt Cartel': '45 80% 50%',
  'Chiss Ascendancy': '240 70% 55%',
  'Independent': '137, 41%, 31%',
};

interface PlanetMarkerProps {
  planet: Planet;
  pad: number;
  isSelected: boolean;
  isHovered: boolean;
  hasOtherHovered: boolean;
  isLaneStart: boolean;
  planetUnlocked: boolean;
  showLabels: boolean;
  editMode: boolean;
  hasBrokenImage: boolean;
  shouldLoadImage: boolean;
  onImageError: (id: string) => void;
  onClick: (e: React.MouseEvent, planet: Planet) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onMouseDown: (e: React.MouseEvent, planet: Planet) => void;
}

type LabelMode = 'normal' | 'top' | 'hover';

const FACTION_DOT_CLASSES: Record<string, string> = {
  'Empire': 'bg-destructive shadow-[0_0_12px_hsl(var(--destructive))]',
  'Hutt Cartel': 'bg-yellow-500 shadow-[0_0_12px_#eab308]',
  'Chiss Ascendancy': 'bg-indigo-500 shadow-[0_0_12px_#6366f1]',
  'Galactic Republic': 'bg-primary shadow-[0_0_12px_hsl(var(--primary))]',
};
const INDEPENDENT_DOT_STYLE = { backgroundColor: 'hsl(140, 52%, 55%)' };
const INDEPENDENT_DOT_SHADOW = 'shadow-[0_0_12px_hsl(140,90%,45%)]';
const NAMED_FACTIONS = ['Empire', 'Hutt Cartel', 'Chiss Ascendancy', 'Galactic Republic'];

const PlanetMarker = React.memo<PlanetMarkerProps>(({
  planet, pad, isSelected, isHovered, hasOtherHovered, isLaneStart,
  planetUnlocked, showLabels, editMode, hasBrokenImage, shouldLoadImage,
  onImageError, onClick, onMouseEnter, onMouseLeave, onMouseDown
}) => {
  const shouldHide = !isSelected && !isHovered && (planet.isMinor || hasOtherHovered);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Only mount the <img> element when zoomed in enough — prevents image
  // requests at low zoom. Once loaded, imgLoaded stays true for this mount.
  const hasCustomImage = shouldLoadImage && !!planet.markerImage?.trim() && !hasBrokenImage;

  const isIndependent = !NAMED_FACTIONS.includes(planet.faction || '');
  const dotClass = FACTION_DOT_CLASSES[planet.faction || ''] ?? INDEPENDENT_DOT_SHADOW;

  // Coloured faction dot — shown at low zoom and as placeholder while image loads
  const FactionDot = (
    <div
      className={cn(
        "rounded-full relative transition-all",
        planet.isMinor ? "w-2.5 h-2.5" : "w-5 h-5",
        dotClass,
        isSelected && "scale-125",
        isLaneStart && "bg-primary shadow-[0_0_20px_hsl(var(--primary))] scale-150"
      )}
      style={isIndependent && !isLaneStart ? INDEPENDENT_DOT_STYLE : undefined}
    >
      {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75" />}
    </div>
  );

  return (
    <div
      tabIndex={-1}
      className={cn(
        "absolute outline-none focus:outline-none focus-visible:outline-none select-none",
        editMode && planetUnlocked ? "cursor-move" : "cursor-pointer",
        isLaneStart && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
      )}
      style={{
        left: planet.x + pad, top: planet.y + pad,
        // translate3d keeps this element in the parent's GPU compositing context so
        // it is rasterised at the CURRENT zoom scale — avoids the CSS-scale blur
        transform: 'translate3d(-50%, -50%, 0)',
        zIndex: (planet.labelMode as LabelMode) === 'top' ? 30 : isLaneStart ? 20 : (isHovered ? 20 : undefined),
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={(e) => onClick(e, planet)}
      onMouseEnter={() => onMouseEnter(planet.id)}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => onMouseDown(e, planet)}
    >
      <div className="relative">
        {planet.isWarzone && (
          <>
            <div className="absolute inset-[-8px] rounded-full border-2 border-destructive/70 animate-ping pointer-events-none" />
            <div className="absolute inset-[-8px] rounded-full border border-destructive/40 pointer-events-none" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-6 text-destructive drop-shadow-[0_0_6px_hsl(var(--destructive))] pointer-events-none" title="Active Warzone">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/>
              </svg>
            </div>
          </>
        )}
        {planet.isCapital && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 text-yellow-400 drop-shadow-[0_0_5px_currentColor] animate-bounce pointer-events-none">
            <Crown className="w-5 h-5 fill-yellow-400/20" />
          </div>
        )}
        {!planet.isCapital && planet.isPowerbaseCapital && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-4 text-amber-500 drop-shadow-[0_0_4px_currentColor] pointer-events-none">
            <Crown className="w-3.5 h-3.5 fill-amber-500/20" />
          </div>
        )}

        {hasCustomImage ? (
          <div className={cn("relative transition-all duration-300", isSelected ? "scale-125 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "hover:scale-110")}>
            {/* Pulsing placeholder shown while image fetches */}
            {!imgLoaded && (
              <div className={cn(
                "rounded-full animate-pulse bg-white/20",
                planet.isMinor ? "w-5 h-5" : "w-10 h-10"
              )} />
            )}
            <img
              src={planet.markerImage!}
              alt=""
              className={cn(
                "object-contain pointer-events-none transition-opacity duration-300",
                planet.isMinor ? "w-5 h-5" : "w-10 h-10",
                imgLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
              )}
              onLoad={() => setImgLoaded(true)}
              onError={() => onImageError(planet.id)}
              style={{ color: 'transparent' }}
            />
            {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75" />}
          </div>
        ) : (
          FactionDot
        )}
      </div>
      {(() => {
        const lm = (planet.labelMode as LabelMode) || 'normal';
        const showLabel = lm === 'hover'
          ? (isHovered || isSelected)
          : lm === 'top'
            ? showLabels
            : showLabels && !shouldHide;
        return showLabel ? (
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded text-[10px] font-display tracking-widest whitespace-nowrap bg-background/80 border uppercase pointer-events-none",
              isSelected ? "border-primary text-primary shadow-[0_0_15px_hsl(var(--primary)/0.4)]" : "border-border/60 text-foreground/90",
            )}
          >
            {planet.name}
          </div>
        ) : null;
      })()}
    </div>
  );
});

export const GalaxyMap = () => {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const { 
    planets, sectors, lanes, fleets, factionList,
    showLanes, showSectors, showLabels, showOverlay,
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    selectedFleet, setSelectedFleet,
    editMode, updatePlanet, updateSectorPoints, updateFleet, addLane, addSector, updateLanePathPoints,
    laneDrawMode, setLaneDrawMode,
    sectorDrawMode, setSectorDrawMode,
    searchQuery, filters,
    setGetViewportCenter,
    targetedPlanet, setTargetedPlanet,
    targetedFleet, setTargetedFleet,
    unlockedPlanetIds, lockPlanet,
  } = useMap();

  const mapWidth = 5000;
  const mapHeight = 5000; 
  
  const [draggingPlanet, setDraggingPlanet] = useState<string | null>(null);
  const [draggingSectorPoint, setDraggingSectorPoint] = useState<{sectorId: string, pointIndex: number} | null>(null);
  const [draggingFleet, setDraggingFleet] = useState<string | null>(null);
  const [draggingLanePoint, setDraggingLanePoint] = useState<{laneId: string, pointIndex: number} | null>(null);
  const [sectorSnapPoint, setSectorSnapPoint] = useState<[number, number] | null>(null);

  const SECTOR_SNAP_RADIUS = 45;

  const closestPointOnSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] => {
    const abx = bx - ax, aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq === 0) return [ax, ay];
    let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return [ax + t * abx, ay + t * aby];
  };

  const findSectorSnapPoint = (x: number, y: number, currentSectorId: string): [number, number] | null => {
    let best: [number, number] | null = null;
    let bestDist = SECTOR_SNAP_RADIUS;

    for (const s of sectors) {
      if (s.id === currentSectorId) continue;
      for (const p of s.points) {
        const d = Math.sqrt((p[0] - x) ** 2 + (p[1] - y) ** 2);
        if (d < bestDist) {
          bestDist = d;
          best = [p[0], p[1]];
        }
      }
    }
    if (best) return best;

    for (const s of sectors) {
      if (s.id === currentSectorId) continue;
      for (let i = 0; i < s.points.length; i++) {
        const a = s.points[i];
        const b = s.points[(i + 1) % s.points.length];
        const [cx, cy] = closestPointOnSegment(x, y, a[0], a[1], b[0], b[1]);
        const d = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
        if (d < bestDist) {
          bestDist = d;
          best = [cx, cy];
        }
      }
    }
    return best;
  };

  // Waypoint snap-to-route:
  // 1. User clicks "SNAP NODES" → snapActive = true, planets hidden, all lane nodes visible
  // 2. User clicks any node on any lane → snapFirstNode set (gold highlight)
  // 3. User clicks a node on a DIFFERENT lane → first node moves to second node's position, done
  const [snapActive, setSnapActive] = useState(false);
  const [snapFirstNode, setSnapFirstNode] = useState<{ laneId: string; pointIndex: number; x: number; y: number } | null>(null);
  const exitSnapMode = useCallback(() => { setSnapActive(false); setSnapFirstNode(null); }, []);
  
  const [drawingMode, setDrawingMode] = useState<'sector' | 'lane' | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [laneDrawStartPlanet, setLaneDrawStartPlanet] = useState<string | null>(null);
  const [laneDrawPoints, setLaneDrawPoints] = useState<[number, number][]>([]);
  const [isLaneDrawing, setIsLaneDrawing] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  const [sectorDrawPoints, setSectorDrawPoints] = useState<[number, number][]>([]);
  const [isSectorDrawing, setIsSectorDrawing] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{ type: 'planet' | 'fleet' | 'lane'; id: string } | null>(null);

  // Overlap dialog state
  const [pendingSector, setPendingSector] = useState<Sector | null>(null);
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [overlappingSectors, setOverlappingSectors] = useState<Sector[]>([]);
  const [overlapChoice, setOverlapChoice] = useState<'erase' | 'contested' | null>(null);
  const [contestFaction1, setContestFaction1] = useState('');
  const [contestFaction2, setContestFaction2] = useState('');
  const [laneTooltipPos, setLaneTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Viewport transform — tracked at a throttled rate for culling/LOD
  const [viewTransform, setViewTransform] = useState({ scale: 0.2, posX: 0, posY: 0 });
  const transformThrottleRef = useRef(0);

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Targeting overlay state (shared between planets and fleets)
  const [overlayTarget, setOverlayTarget] = useState<{ name: string; type: 'planet' | 'fleet'; x: number; y: number } | null>(null);
  const [overlayScreenPos, setOverlayScreenPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Scale used for both the fly-to pan and the overlay animation
  const FLY_SCALE = 0.4;
  const FLY_DURATION = 700; // ms camera takes to fly to target

  const flyToTarget = useCallback((mapX: number, mapY: number, name: string, type: 'planet' | 'fleet') => {
    const PAD = 500;
    const ref = transformRef.current;
    const container = mapContainerRef.current;
    if (!ref || !container) return;

    const rect = container.getBoundingClientRect();
    const flyX = rect.width / 2 - (mapX + PAD) * FLY_SCALE;
    const flyY = rect.height / 2 - (mapY + PAD) * FLY_SCALE;
    ref.setTransform(flyX, flyY, FLY_SCALE, FLY_DURATION);

    const timer = setTimeout(() => {
      const { scale, positionX, positionY } = ref.instance.transformState;
      const screenX = (mapX + PAD) * scale + positionX;
      const screenY = (mapY + PAD) * scale + positionY;
      setOverlayTarget({ name, type, x: mapX, y: mapY });
      setOverlayScreenPos({ x: screenX, y: screenY, w: rect.width, h: rect.height });
    }, FLY_DURATION + 60);

    return timer;
  }, []);

  useEffect(() => {
    if (!targetedPlanet) return;
    const timer = flyToTarget(targetedPlanet.x, targetedPlanet.y, targetedPlanet.name, 'planet');
    return () => { if (timer) clearTimeout(timer); };
  }, [targetedPlanet]);

  useEffect(() => {
    if (!targetedFleet) return;
    const timer = flyToTarget(targetedFleet.x, targetedFleet.y, targetedFleet.name, 'fleet');
    return () => { if (timer) clearTimeout(timer); };
  }, [targetedFleet]);

  const handleOverlayZoom = useCallback(() => {
    if (!overlayTarget || !transformRef.current || !mapContainerRef.current) return;
    const container = mapContainerRef.current;
    const rect = container.getBoundingClientRect();
    const targetScale = 1.2;
    const newX = rect.width / 2 - (overlayTarget.x + pad) * targetScale;
    const newY = rect.height / 2 - (overlayTarget.y + pad) * targetScale;
    transformRef.current.setTransform(newX, newY, targetScale, 500);
  }, [overlayTarget]);

  const handleOverlayComplete = useCallback(() => {
    setOverlayTarget(null);
    setOverlayScreenPos(null);
    setTargetedPlanet(null);
    setTargetedFleet(null);
  }, [setTargetedPlanet, setTargetedFleet]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (transformRef.current) {
        transformRef.current.centerView(0.2, 0);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setGetViewportCenter(() => {
      const ref = transformRef.current;
      if (!ref) return { x: mapWidth / 2, y: mapHeight / 2 };
      const state = ref.instance.transformState;
      const { scale, positionX, positionY } = state;
      const container = ref.instance.wrapperComponent;
      if (!container) return { x: mapWidth / 2, y: mapHeight / 2 };
      const rect = container.getBoundingClientRect();
      const centerScreenX = rect.width / 2;
      const centerScreenY = rect.height / 2;
      const mapX = (centerScreenX - positionX) / scale - pad;
      const mapY = (centerScreenY - positionY) / scale - pad;
      return { x: Math.round(mapX), y: Math.round(mapY) };
    });
  }, [setGetViewportCenter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') {
        setLaneDrawMode(false);
        setLaneDrawStartPlanet(null);
        setLaneDrawPoints([]);
        setIsLaneDrawing(false);
        setSectorDrawMode(false);
        setSectorDrawPoints([]);
        setIsSectorDrawing(false);
        setIsDrawing(false);
        setDrawingMode(null);
        setDrawingPoints([]);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // LOD thresholds
  const ZOOM_HIDE_MINOR = 0.18;     // minor planets hidden only at galaxy-level zoom
  const ZOOM_HIDE_JUNCTIONS = 0.15; // junction dots hidden only at full galaxy view
  const ZOOM_LOAD_IMAGES = 0.25;    // planet images load once slightly zoomed in
  const CULL_MARGIN = 400;

  const visibleBounds = useMemo(() => {
    const cw = mapContainerRef.current?.clientWidth ?? 1400;
    const ch = mapContainerRef.current?.clientHeight ?? 900;
    const { scale, posX, posY } = viewTransform;
    const pad = 500;
    return {
      minX: (-posX / scale) - pad - CULL_MARGIN,
      minY: (-posY / scale) - pad - CULL_MARGIN,
      maxX: (-posX / scale) - pad + cw / scale + CULL_MARGIN,
      maxY: (-posY / scale) - pad + ch / scale + CULL_MARGIN,
    };
  }, [viewTransform]);

  const filteredPlanets = useMemo(() => {
    const { minX, minY, maxX, maxY } = visibleBounds;
    const isLowZoom = viewTransform.scale < ZOOM_HIDE_MINOR;
    return planets.filter(p => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFaction = filters.faction === 'All' || p.faction === filters.faction;
      const matchesHabitable = filters.habitable === 'All' ||
                               (filters.habitable === 'Yes' ? p.habitable : !p.habitable);
      const matchesEnv = filters.environment === 'All' || p.environment === filters.environment;
      if (!matchesSearch || !matchesFaction || !matchesHabitable || !matchesEnv) return false;
      // LOD: hide minor planets at low zoom (always show selected)
      if (isLowZoom && p.isMinor && p.id !== selectedPlanet?.id) return false;
      // Viewport culling
      return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    });
  }, [planets, searchQuery, filters, visibleBounds, viewTransform.scale, selectedPlanet?.id]);

  // O(1) planet lookups
  const planetById = useMemo(() => {
    const m = new Map<string, Planet>();
    planets.forEach(p => m.set(p.id, p));
    return m;
  }, [planets]);

  // Pre-computed lane paths — avoid recalculating every render
  const lanePaths = useMemo(() => {
    const paths = new Map<string, string | null>();
    for (const lane of lanes) {
      const p1 = planetById.get(lane.planetIds[0]);
      if (!p1) { paths.set(lane.id, null); continue; }
      const isLoop = lane.planetIds[1] === lane.planetIds[0];
      const p2 = lane.planetIds[1] && !isLoop ? planetById.get(lane.planetIds[1]) : null;
      let path: string | null = null;
      if (lane.pathPoints && lane.pathPoints.length > 0) {
        const pts: number[][] = [[p1.x, p1.y], ...lane.pathPoints];
        if (p2) pts.push([p2.x, p2.y]);
        if (isLoop) pts.push([p1.x, p1.y]);
        path = `M ${pts.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
      } else if (p2) {
        path = `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
      }
      paths.set(lane.id, path);
    }
    return paths;
  }, [lanes, planetById]);

  // Viewport-culled collections for rendering
  const filteredFleets = useMemo(() => {
    const { minX, minY, maxX, maxY } = visibleBounds;
    return fleets.filter(f => f.x >= minX && f.x <= maxX && f.y >= minY && f.y <= maxY);
  }, [fleets, visibleBounds]);

  const filteredLanes = useMemo(() => {
    if (!showLanes) return [];
    const { minX, minY, maxX, maxY } = visibleBounds;
    const LM = 800;
    return lanes.filter(lane => {
      const p1 = planetById.get(lane.planetIds[0]);
      const p2 = lane.planetIds[1] ? planetById.get(lane.planetIds[1]) : null;
      if (p1 && p1.x >= minX - LM && p1.x <= maxX + LM && p1.y >= minY - LM && p1.y <= maxY + LM) return true;
      if (p2 && p2.x >= minX - LM && p2.x <= maxX + LM && p2.y >= minY - LM && p2.y <= maxY + LM) return true;
      if (lane.pathPoints?.some(pt => pt[0] >= minX - LM && pt[0] <= maxX + LM && pt[1] >= minY - LM && pt[1] <= maxY + LM)) return true;
      // Always keep selected lane visible
      if (selectedLane?.id === lane.id) return true;
      return false;
    });
  }, [lanes, planetById, visibleBounds, showLanes, selectedLane?.id]);

  const filteredSectors = useMemo(() => {
    if (!showSectors) return [];
    const { minX, minY, maxX, maxY } = visibleBounds;
    return sectors.filter(sector => {
      if (sector.points.length < 3) return false;
      // Always show selected sector
      if (selectedSector?.id === sector.id) return true;
      const xs = sector.points.map(p => p[0]);
      const ys = sector.points.map(p => p[1]);
      const sMinX = Math.min(...xs), sMaxX = Math.max(...xs);
      const sMinY = Math.min(...ys), sMaxY = Math.max(...ys);
      return sMinX <= maxX && sMaxX >= minX && sMinY <= maxY && sMaxY >= minY;
    });
  }, [sectors, visibleBounds, showSectors, selectedSector?.id]);

  // Memoized hovered lane lookup
  const hoveredLane = useMemo(
    () => hoveredItem?.type === 'lane' ? lanes.find(l => l.id === hoveredItem.id) ?? null : null,
    [hoveredItem, lanes]
  );

  // Stable planet-marker callbacks
  const handleImageError = useCallback((id: string) => {
    setBrokenImages(prev => new Set(prev).add(id));
  }, []);
  const handlePlanetMouseEnter = useCallback((id: string) => {
    setHoveredItem({ type: 'planet', id });
  }, []);
  const handlePlanetMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  // Throttled transform update — updates viewport culling/LOD bounds
  const handleTransformed = useCallback((_ref: ReactZoomPanPinchRef, state: { scale: number; positionX: number; positionY: number }) => {
    const now = Date.now();
    if (now - transformThrottleRef.current < 60) return;
    transformThrottleRef.current = now;
    setViewTransform({ scale: state.scale, posX: state.positionX, posY: state.positionY });
  }, []);

  const pad = 500;
  const totalWidth = mapWidth + pad * 2;
  const totalHeight = mapHeight + pad * 2;

  const getMapCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * totalWidth;
    const rawY = ((e.clientY - rect.top) / rect.height) * totalHeight;
    const x = Math.round(rawX - pad);
    const y = Math.round(rawY - pad);
    return { x, y };
  };

  const isInLaneCreation = laneDrawMode || laneDrawStartPlanet !== null || isLaneDrawing;
  const isInSectorCreation = sectorDrawMode || isSectorDrawing;
  const isInAnyDrawCreation = isInLaneCreation || isInSectorCreation;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode) return;
    const { x, y } = getMapCoords(e);

    if (isSectorDrawing) {
      const last = sectorDrawPoints[sectorDrawPoints.length - 1];
      if (last) {
        const dx = x - last[0];
        const dy = y - last[1];
        if (Math.sqrt(dx*dx + dy*dy) > 15) {
          setSectorDrawPoints(prev => [...prev, [x, y]]);
        }
      }
      return;
    }

    if (isLaneDrawing) {
      if (shiftHeld) {
        const start = laneDrawPoints[0];
        if (start) {
          setLaneDrawPoints([start, [x, y]]);
        }
      } else {
        const last = laneDrawPoints[laneDrawPoints.length - 1];
        if (last) {
          const dx = x - last[0];
          const dy = y - last[1];
          if (Math.sqrt(dx*dx + dy*dy) > 15) {
            setLaneDrawPoints(prev => [...prev, [x, y]]);
          }
        }
      }
      return;
    }

    if (isDrawing && drawingMode) {
      const last = drawingPoints[drawingPoints.length - 1];
      if (last) {
        const dx = x - last[0];
        const dy = y - last[1];
        if (shiftHeld) {
          setDrawingPoints([drawingPoints[0], [x, y]]);
        } else if (Math.sqrt(dx*dx + dy*dy) > 15) {
          setDrawingPoints(prev => [...prev, [x, y]]);
        }
      }
      return;
    }

    if (draggingPlanet) {
      const planet = planets.find(p => p.id === draggingPlanet);
      if (planet) updatePlanet({ ...planet, x, y }, { x, y });
    } else if (draggingSectorPoint) {
      const sector = sectors.find(s => s.id === draggingSectorPoint.sectorId);
      if (sector) {
        const snap = findSectorSnapPoint(x, y, sector.id);
        setSectorSnapPoint(snap);
        const finalPoint: [number, number] = snap ?? [x, y];
        const newPoints = [...sector.points] as [number, number][];
        newPoints[draggingSectorPoint.pointIndex] = finalPoint;
        updateSectorPoints(sector.id, newPoints);
      }
    } else if (draggingFleet) {
      const fleet = fleets.find(f => f.id === draggingFleet);
      if (fleet) updateFleet({ ...fleet, x, y });
    } else if (draggingLanePoint) {
      const lane = lanes.find(l => l.id === draggingLanePoint.laneId);
      if (lane && lane.pathPoints) {
        const newPoints = [...lane.pathPoints] as [number, number][];
        newPoints[draggingLanePoint.pointIndex] = [x, y];
        updateLanePathPoints(lane.id, newPoints);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isSectorDrawing) {
      if (sectorDrawPoints.length > 4) {
        const origin = sectorDrawPoints[0];
        const last = sectorDrawPoints[sectorDrawPoints.length - 1];
        const closeRadius = 60;
        const distToOrigin = Math.sqrt((last[0] - origin[0]) ** 2 + (last[1] - origin[1]) ** 2);
        
        if (distToOrigin < closeRadius) {
          const newSector: Sector = {
            id: `s${Date.now()}`,
            name: 'New Sector',
            color: `${Math.round(Math.random() * 360)} 50% 50%`,
            points: sectorDrawPoints,
            faction: 'Independent',
          };
          const overlapping = sectors.filter(s =>
            s.points.length >= 3 && _polysOverlap(s.points as [number,number][], sectorDrawPoints)
          );
          if (overlapping.length > 0) {
            setPendingSector(newSector);
            setOverlappingSectors(overlapping);
            setOverlapChoice(null);
            setContestFaction1(overlapping[0].faction || 'Independent');
            setContestFaction2('Independent');
            setOverlapDialogOpen(true);
          } else {
            addSector(newSector);
          }
        }
      }
      setSectorDrawPoints([]);
      setIsSectorDrawing(false);
      setSectorDrawMode(false);
      return;
    }
    if (isLaneDrawing && laneDrawStartPlanet) {
      const { x, y } = getMapCoords(e);
      const hitRadius = 20;
      const endPlanet = planets.find(p => {
        if (p.id === laneDrawStartPlanet && laneDrawPoints.length < 10) return false;
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) < hitRadius;
      });
      finalizeLane(endPlanet?.id);
      return;
    }
    if (isDrawing && drawingMode) {
      if (drawingPoints.length > 2) {
        if (drawingMode === 'sector' && selectedSector) {
          updateSectorPoints(selectedSector.id, drawingPoints);
        } else if (drawingMode === 'lane' && selectedLane) {
          updateLanePathPoints(selectedLane.id, drawingPoints);
        }
      }
      setIsDrawing(false);
      setDrawingPoints([]);
      setDrawingMode(null);
      return;
    }
    // Fleet dropped: auto-assign to a warzone theatre if released on/near a warzone planet
    if (draggingFleet) {
      const fleet = fleets.find(f => f.id === draggingFleet);
      if (fleet) {
        const DROP_RADIUS = 60;
        const warzone = planets.find(p =>
          p.isWarzone && Math.hypot(fleet.x - p.x, fleet.y - p.y) < DROP_RADIUS
        );
        if (warzone && fleet.warzonePlanetId !== warzone.id) {
          updateFleet({ ...fleet, warzonePlanetId: warzone.id });
          toast({
            title: "Fleet deployed to warzone",
            description: `${fleet.name} joined the ${warzone.name} theatre.`,
          });
        } else if (!warzone && fleet.warzonePlanetId) {
          const prev = planets.find(p => p.id === fleet.warzonePlanetId);
          updateFleet({ ...fleet, warzonePlanetId: null });
          toast({
            title: "Fleet withdrawn",
            description: `${fleet.name} left the ${prev?.name ?? "warzone"} theatre.`,
          });
        }
      }
    }
    setDraggingPlanet(null);
    setDraggingSectorPoint(null);
    setSectorSnapPoint(null);
    setDraggingFleet(null);
    setDraggingLanePoint(null);
  };

  const startDrawing = (mode: 'sector' | 'lane', e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawingMode(mode);
    setIsDrawing(true);
    setDrawingPoints([]);
  };

  const handleOverlapConfirm = () => {
    if (!pendingSector || !overlapChoice) return;

    if (overlapChoice === 'erase') {
      // Add new sector, clip existing overlapping sectors around it
      addSector(pendingSector, { clip: true });
    } else {
      // CONTESTED: add both sectors as-is, then create a new sector for the intersection area
      addSector(pendingSector, { clip: false });

      overlappingSectors.forEach((existing, exIdx) => {
        const intersections = polygonIntersection(
          existing.points as [number, number][],
          pendingSector.points as [number, number][]
        );
        intersections.forEach((pts, ptIdx) => {
          if (pts.length < 3) return;
          const contestedSector: Sector = {
            id: `s${Date.now()}_contested_${exIdx}_${ptIdx}`,
            name: `${existing.name} / ${pendingSector.name} Contested`,
            color: existing.color,
            points: pts,
            faction: contestFaction1,
            isContested: true,
            contestedFaction1: contestFaction1,
            contestedFaction2: contestFaction2,
          };
          addSector(contestedSector, { clip: false });
        });
      });
    }

    setOverlapDialogOpen(false);
    setPendingSector(null);
    setOverlappingSectors([]);
    setOverlapChoice(null);
  };

  const handleOverlapCancel = () => {
    setOverlapDialogOpen(false);
    setPendingSector(null);
    setOverlappingSectors([]);
    setOverlapChoice(null);
  };

  useEffect(() => {
    if (laneDrawMode) {
      setLaneDrawStartPlanet(null);
      setLaneDrawPoints([]);
      setIsLaneDrawing(false);
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
      setSelectedFleet(null);
      setSectorDrawMode(false);
    } else {
      setLaneDrawStartPlanet(null);
      setLaneDrawPoints([]);
      setIsLaneDrawing(false);
    }
  }, [laneDrawMode]);

  useEffect(() => {
    if (sectorDrawMode) {
      setSectorDrawPoints([]);
      setIsSectorDrawing(false);
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
      setSelectedFleet(null);
      setLaneDrawMode(false);
    } else {
      setSectorDrawPoints([]);
      setIsSectorDrawing(false);
    }
  }, [sectorDrawMode]);

  const handlePlanetMouseDownForLane = (e: React.MouseEvent, planet: Planet) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!laneDrawStartPlanet) {
      setLaneDrawStartPlanet(planet.id);
      setLaneDrawPoints([[planet.x, planet.y]]);
      setIsLaneDrawing(true);
    }
  };

  const handlePlanetMouseDownStable = useCallback((e: React.MouseEvent, planet: Planet) => {
    if (isInAnyDrawCreation && laneDrawMode && !laneDrawStartPlanet) {
      handlePlanetMouseDownForLane(e, planet);
      return;
    }
    if (isInAnyDrawCreation) return;
    if (editMode && unlockedPlanetIds.has(planet.id)) setDraggingPlanet(planet.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInAnyDrawCreation, laneDrawMode, laneDrawStartPlanet, editMode, unlockedPlanetIds]);

  const pointToSegDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return Math.sqrt(apx * apx + apy * apy);
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
    const cx = ax + t * abx, cy = ay + t * aby;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  };

  const findPlanetsAlongPath = (pathPoints: [number, number][], excludeIds: string[], proximityThreshold = 15): string[] => {
    const foundIds: string[] = [];
    if (pathPoints.length === 0) return foundIds;
    for (const planet of planets) {
      if (excludeIds.includes(planet.id)) continue;
      for (let i = 0; i < pathPoints.length - 1; i++) {
        if (pointToSegDist(planet.x, planet.y, pathPoints[i][0], pathPoints[i][1], pathPoints[i+1][0], pathPoints[i+1][1]) < proximityThreshold) {
          foundIds.push(planet.id);
          break;
        }
      }
      if (foundIds[foundIds.length - 1] !== planet.id && pathPoints.length === 1) {
        const dx = planet.x - pathPoints[0][0];
        const dy = planet.y - pathPoints[0][1];
        if (Math.sqrt(dx * dx + dy * dy) < proximityThreshold) {
          foundIds.push(planet.id);
        }
      }
    }
    return foundIds;
  };

  const finalizeLane = (endPlanetId?: string) => {
    if (!laneDrawStartPlanet) return;
    const pathPoints = laneDrawPoints.slice(1);
    const endpointIds = endPlanetId 
      ? [laneDrawStartPlanet, endPlanetId]
      : [laneDrawStartPlanet];
    
    const isLoop = endPlanetId === laneDrawStartPlanet;
    const excludeFromSearch = isLoop ? [laneDrawStartPlanet] : endpointIds;
    const intermediatePlanets = findPlanetsAlongPath(pathPoints, excludeFromSearch);
    
    let uniquePlanetIds: string[];
    if (isLoop) {
      uniquePlanetIds = [laneDrawStartPlanet, laneDrawStartPlanet, ...intermediatePlanets.filter(id => id !== laneDrawStartPlanet)];
    } else if (endpointIds.length === 2) {
      uniquePlanetIds = [endpointIds[0], endpointIds[1], ...intermediatePlanets];
    } else {
      uniquePlanetIds = [endpointIds[0], ...intermediatePlanets];
    }
    
    if (pathPoints.length > 0 || endPlanetId) {
      addLane({
        id: `l${Date.now()}`,
        name: 'New Hyperlane',
        planetIds: uniquePlanetIds,
        type: 'Minor',
        pathPoints: pathPoints.length > 0 ? pathPoints : undefined,
      });
    }
    setLaneDrawMode(false);
    setLaneDrawStartPlanet(null);
    setLaneDrawPoints([]);
    setIsLaneDrawing(false);
  };

  const handlePlanetClick = (e: React.MouseEvent, planet: Planet) => {
    e.stopPropagation();
    if (isInAnyDrawCreation && !isLaneDrawing) return;
    if (isInAnyDrawCreation) return;
    setSelectedPlanet(planet);
    setSelectedSector(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const handleSectorClick = (e: React.MouseEvent, sector: any) => {
    e.stopPropagation();
    if (isInAnyDrawCreation) return;
    setSelectedSector(sector);
    setSelectedPlanet(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const handleLaneClick = (e: React.MouseEvent, lane: HyperspaceLane) => {
    e.stopPropagation();
    if (isInAnyDrawCreation) return;

    // In snap mode, lane-background clicks do nothing — only node circles handle snap logic
    if (snapActive) return;

    setSelectedLane(lane);
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedFleet(null);
  };

  const handleFleetClick = (e: React.MouseEvent, fleet: Fleet) => {
    e.stopPropagation();
    if (isInAnyDrawCreation) return;
    setSelectedFleet(fleet);
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedLane(null);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (isDrawing || isLaneDrawing || isSectorDrawing) return;
    if (snapActive) return; // don't deselect anything while snapping
    if (editMode && selectedSector) {
    } else {
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
      setSelectedFleet(null);
      if (laneDrawMode && !laneDrawStartPlanet) {
        setLaneDrawMode(false);
      }
    }
  };

  const getPlanetPoint = (id: string) => {
    const p = planets.find(p => p.id === id);
    return p ? { x: p.x, y: p.y } : null;
  };

  const getLanePath = (lane: HyperspaceLane) => {
    const p1 = getPlanetPoint(lane.planetIds[0]);
    if (!p1) return null;
    const p2 = lane.planetIds[1] ? getPlanetPoint(lane.planetIds[1]) : null;
    const isLoop = lane.planetIds[1] === lane.planetIds[0];

    if (lane.pathPoints && lane.pathPoints.length > 0) {
      const allPoints: number[][] = [[p1.x, p1.y], ...lane.pathPoints];
      if (p2 && !isLoop) allPoints.push([p2.x, p2.y]);
      if (isLoop) allPoints.push([p1.x, p1.y]);
      return `M ${allPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
    }
    if (p2 && !isLoop) return `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
    return null;
  };

  const getDrawingLanePath = () => {
    if (laneDrawPoints.length < 2) return null;
    return `M ${laneDrawPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
  };

  const laneJunctions = React.useMemo(() => {
    if (!showLanes || filteredLanes.length < 2 || viewTransform.scale < ZOOM_HIDE_JUNCTIONS) return [];
    const junctions: { x: number; y: number; count: number }[] = [];
    const planetLaneCount = new Map<string, number>();

    for (const lane of filteredLanes) {
      const seen = new Set<string>();
      for (const pid of lane.planetIds) {
        if (!seen.has(pid)) {
          seen.add(pid);
          planetLaneCount.set(pid, (planetLaneCount.get(pid) || 0) + 1);
        }
      }
    }

    const { minX, minY, maxX, maxY } = visibleBounds;
    const added = new Set<string>();
    for (const [pid, count] of planetLaneCount) {
      if (count >= 2 && !added.has(pid)) {
        added.add(pid);
        const planet = planets.find(p => p.id === pid);
        if (planet && planet.x >= minX && planet.x <= maxX && planet.y >= minY && planet.y <= maxY) {
          junctions.push({ x: planet.x, y: planet.y, count });
        }
      }
    }
    return junctions;
  }, [filteredLanes, planets, showLanes, viewTransform.scale, visibleBounds]);

  const isDragging = draggingPlanet !== null || draggingSectorPoint !== null || draggingFleet !== null || draggingLanePoint !== null || isDrawing || isLaneDrawing || isSectorDrawing;

  const getLaneDrawStatus = () => {
    if (!laneDrawMode && !laneDrawStartPlanet) return null;
    if (laneDrawMode && !laneDrawStartPlanet) return "HOLD CLICK ON A PLANET TO START DRAWING";
    if (laneDrawStartPlanet && isLaneDrawing) {
      const startName = planets.find(p => p.id === laneDrawStartPlanet)?.name || 'Unknown';
      return `DRAWING FROM ${startName} — RELEASE ON ANY PLANET TO CONNECT (INCLUDING START FOR LOOP), OR IN SPACE TO END (SHIFT: STRAIGHT, ESC: CANCEL)`;
    }
    return null;
  };

  const getSectorDrawStatus = () => {
    if (sectorDrawMode && !isSectorDrawing) return "HOLD CLICK ON MAP TO DRAW SECTOR BORDER (ESC: CANCEL)";
    if (isSectorDrawing) return "DRAWING SECTOR — RELEASE NEAR ORIGIN TO CLOSE POLYGON (ESC: CANCEL)";
    return null;
  };

  return (
    <div ref={mapContainerRef} className="w-full h-full overflow-hidden relative" onClick={handleMapClick}
         style={{ background: '#020408', backgroundImage: `url('/starfield-bg.png')`, backgroundSize: '512px 512px', backgroundRepeat: 'repeat' }}>

      {/* Targeting animation overlay */}
      {overlayTarget && overlayScreenPos && (
        <TargetingOverlay
          key={overlayTarget.name}
          targetName={overlayTarget.name}
          targetType={overlayTarget.type}
          screenX={overlayScreenPos.x}
          screenY={overlayScreenPos.y}
          containerWidth={overlayScreenPos.w}
          containerHeight={overlayScreenPos.h}
          onZoom={handleOverlayZoom}
          onComplete={handleOverlayComplete}
        />
      )}

      {hoveredLane && laneTooltipPos && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded bg-background/95 backdrop-blur-md border border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
          style={{ left: laneTooltipPos.x + 16, top: laneTooltipPos.y - 12 }}
        >
          <span className="text-[10px] font-display tracking-widest text-primary uppercase">{hoveredLane.name}</span>
          <span className="text-[9px] text-muted-foreground ml-2 uppercase">{hoveredLane.type}</span>
        </div>
      )}

      {(isInLaneCreation || isInSectorCreation) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 glass-panel rounded-md px-4 py-2 text-[11px] font-display text-primary animate-pulse tracking-widest pointer-events-none">
          {isInSectorCreation ? getSectorDrawStatus() : getLaneDrawStatus()}
        </div>
      )}
      
      <TransformWrapper
        ref={transformRef}
        initialScale={0.2}
        minScale={0.15}
        maxScale={10}
        centerOnInit
        limitToBounds={true}
        disabled={isDragging}
        onTransformed={handleTransformed}
      >
        {({ zoomIn, zoomOut, resetTransform, centerView }) => (
          <>
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="glass-panel rounded-md p-1 flex gap-1">
                <button onClick={() => zoomIn()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">+</button>
                <button onClick={() => zoomOut()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">-</button>
                <button onClick={() => resetTransform()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">↺</button>
              </div>
              {editMode && selectedSector && !isInAnyDrawCreation && (
                <button
                  onMouseDown={(e) => startDrawing('sector', e)}
                  className="glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2 text-foreground hover:text-primary"
                  data-testid="button-draw-sector"
                >
                  <Pencil className="w-3 h-3" /> DRAW SECTOR BORDER
                </button>
              )}
              {editMode && selectedLane && !isInAnyDrawCreation && !snapActive && (
                <button
                  onMouseDown={(e) => startDrawing('lane', e)}
                  className="glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2 text-foreground hover:text-primary"
                  data-testid="button-draw-lane"
                >
                  <Pencil className="w-3 h-3" /> DRAW LANE PATH
                </button>
              )}
              {editMode && !isInAnyDrawCreation && !snapActive && (
                <button
                  onMouseDown={(e) => { e.stopPropagation(); setSnapActive(true); setSnapFirstNode(null); }}
                  className="glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2 text-foreground hover:text-yellow-400"
                  data-testid="button-snap-nodes"
                >
                  <GitMerge className="w-3 h-3" /> SNAP NODES
                </button>
              )}

              {/* ── Snap nodes panel ── */}
              {snapActive && (
                <div className="glass-panel rounded-md px-3 py-2 text-[10px] font-display flex flex-col gap-2 border border-yellow-400/30 min-w-[180px]">
                  <div className="flex items-center justify-between">
                    <span className={cn("flex items-center gap-1", snapFirstNode ? "text-cyan-400" : "text-yellow-400")}>
                      <Crosshair className="w-3 h-3" />
                      {snapFirstNode ? 'NOW CLICK NODE ON ANOTHER ROUTE' : 'CLICK A NODE TO START'}
                    </span>
                    <button onMouseDown={(e) => { e.stopPropagation(); exitSnapMode(); }} className="text-foreground/40 hover:text-destructive ml-2 shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-foreground/50 leading-tight text-[9px]">
                    {snapFirstNode
                      ? <>Node selected on <span className="text-yellow-400">{lanes.find(l => l.id === snapFirstNode.laneId)?.name ?? 'route'}</span>. Click a node on a different route to join them.</>
                      : 'Planets are hidden. All route nodes are shown as dots — click one on either route to begin.'}
                  </p>
                  {snapFirstNode && (
                    <button
                      onMouseDown={(e) => { e.stopPropagation(); setSnapFirstNode(null); }}
                      className="rounded px-2 py-1 text-[9px] font-display text-foreground/50 hover:text-foreground bg-background/20 hover:bg-background/40 transition-colors"
                    >
                      ← RESELECT FIRST NODE
                    </button>
                  )}
                </div>
              )}
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ willChange: 'transform' }}>
              <div 
                className={cn("relative origin-top-left", (isDrawing || isLaneDrawing || isSectorDrawing || sectorDrawMode) ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing")}
                style={{ 
                  width: `${totalWidth}px`, 
                  height: `${totalHeight}px`,
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseDown={(e) => {
                  if (sectorDrawMode && !isSectorDrawing) {
                    const { x, y } = getMapCoords(e);
                    setSectorDrawPoints([[x, y]]);
                    setIsSectorDrawing(true);
                  }
                }}
              >
                <div 
                  className="absolute"
                  style={{
                    left: `${pad}px`,
                    top: `${pad}px`,
                    width: `${mapWidth}px`,
                    height: `${mapHeight}px`,
                    boxShadow: '0 0 400px 200px rgba(30, 60, 100, 0.15), 0 0 800px 400px rgba(10, 20, 50, 0.1)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: `${pad}px`,
                    top: `${pad}px`,
                    width: `${mapWidth}px`,
                    height: `${mapHeight}px`,
                    backgroundImage: `url('/galaxy-map.webp')`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    mask: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
                    WebkitMask: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
                  }}
                />
                {showOverlay && editMode && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${pad}px`,
                      top: `${pad}px`,
                      width: `${mapWidth}px`,
                      height: `${mapHeight}px`,
                      backgroundImage: `url('/reference-map.webp')`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      opacity: 0.5,
                      zIndex: 5,
                    }}
                  />
                )}
                
                <svg 
                  ref={svgRef}
                  className="absolute pointer-events-none" 
                  style={{ left: `${pad}px`, top: `${pad}px`, width: `${mapWidth}px`, height: `${mapHeight}px`, contain: 'paint' }} 
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                >
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    {sectors.filter(s => s.isContested).map(sector => {
                      const c1 = FACTION_COLORS[sector.contestedFaction1 || ''] || '0 0% 50%';
                      const c2 = FACTION_COLORS[sector.contestedFaction2 || ''] || '0 0% 70%';
                      return (
                        <pattern key={`pattern-${sector.id}`} id={`stripe-${sector.id}`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <rect width="10" height="20" fill={`hsl(${c1} / 0.3)`} />
                          <rect x="10" width="10" height="20" fill={`hsl(${c2} / 0.3)`} />
                        </pattern>
                      );
                    })}
                  </defs>

                  {filteredSectors.map(sector => {
                    const isSelected = selectedSector?.id === sector.id;
                    const pathD = `M ${sector.points.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`;
                    
                    return (
                      <g key={sector.id}>
                        <path
                          d={pathD}
                          fill={sector.isContested ? `url(#stripe-${sector.id})` : `hsl(${sector.color} / ${isSelected ? '0.25' : '0.12'})`}
                          stroke={`hsl(${sector.color} / ${isSelected ? '0.9' : '0.35'})`}
                          strokeWidth={isSelected ? 4 : 1.5}
                          className="pointer-events-auto transition-all duration-300 cursor-pointer"
                          onClick={(e) => handleSectorClick(e, sector)}
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                        {editMode && isSelected && !isInAnyDrawCreation && sector.points.map((p1, i) => {
                          const p2 = sector.points[(i + 1) % sector.points.length];
                          return (
                            <line
                              key={`edge-${sector.id}-${i}`}
                              x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
                              stroke="transparent"
                              strokeWidth={20}
                              className="pointer-events-auto cursor-crosshair"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                if (!rect) return;
                                const clientX = e.clientX;
                                const clientY = e.clientY;
                                const x = Math.round(((clientX - rect.left) / rect.width) * mapWidth);
                                const y = Math.round(((clientY - rect.top) / rect.height) * mapHeight);
                                const newPoints = [...sector.points] as [number, number][];
                                newPoints.splice(i + 1, 0, [x, y]);
                                updateSectorPoints(sector.id, newPoints);
                              }}
                            />
                          );
                        })}
                        {editMode && isSelected && !isInAnyDrawCreation && sector.points.map((point, idx) => (
                          <circle
                            key={`${sector.id}-p-${idx}`}
                            cx={point[0]} cy={point[1]} r={10}
                            fill={`hsl(${sector.color})`} stroke="white" strokeWidth={3}
                            className="pointer-events-auto cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingSectorPoint({ sectorId: sector.id, pointIndex: idx });
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              const newPoints = sector.points.filter((_, i) => i !== idx);
                              updateSectorPoints(sector.id, newPoints as [number, number][]);
                            }}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {draggingSectorPoint && sectorSnapPoint && (
                    <circle
                      cx={sectorSnapPoint[0]} cy={sectorSnapPoint[1]} r={16}
                      fill="none" stroke="#22d3ee" strokeWidth={3}
                      className="pointer-events-none animate-pulse"
                    />
                  )}

                  {[...filteredLanes]
                    .sort((a, b) => {
                      // Render shorter/less-dominant lanes first so longer ones paint on top
                      const pr: Record<string, number> = { Major: 3, Minor: 2, Dangerous: 1 };
                      const pa = pr[a.type] ?? 1, pb = pr[b.type] ?? 1;
                      if (pa !== pb) return pa - pb;
                      return (a.pathPoints?.length ?? 0) - (b.pathPoints?.length ?? 0);
                    })
                    .map(lane => {
                    const pathD = lanePaths.get(lane.id);
                    if (!pathD) return null;
                    const isSelected = selectedLane?.id === lane.id;
                    let strokeColor = "hsl(var(--primary))";
                    if (lane.type === 'Dangerous') strokeColor = "hsl(var(--destructive))";
                    else if (lane.type === 'Minor') strokeColor = "hsl(var(--muted-foreground))";

                    return (
                      <g key={lane.id} className="pointer-events-auto cursor-pointer" onClick={(e) => handleLaneClick(e, lane)}
                        onMouseEnter={() => { setHoveredItem({ type: 'lane', id: lane.id }); }}
                        onMouseLeave={() => { setHoveredItem(null); setLaneTooltipPos(null); }}
                        onMouseMove={(e) => {
                          setLaneTooltipPos({ x: e.clientX, y: e.clientY });
                        }}
                      >
                        <path d={pathD} fill="none" stroke="transparent" strokeWidth={20} />
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 5 : (lane.type === 'Major' ? 3.5 : 2.5)}
                          strokeDasharray={lane.type === 'Minor' ? "6 6" : (lane.type === 'Dangerous' ? "3 8" : "none")}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="transition-all duration-300"
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                        {/* Normal drag waypoints (only when not in snap mode) */}
                        {!snapActive && editMode && isSelected && !isInAnyDrawCreation && lane.pathPoints && lane.pathPoints.map((point, idx) => (
                          <circle
                            key={`${lane.id}-lp-${idx}`}
                            cx={point[0]} cy={point[1]} r={8}
                            fill={strokeColor} stroke="white" strokeWidth={2}
                            className="pointer-events-auto cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingLanePoint({ laneId: lane.id, pointIndex: idx });
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (lane.pathPoints) {
                                const newPoints = lane.pathPoints.filter((_, i) => i !== idx);
                                updateLanePathPoints(lane.id, newPoints as [number, number][]);
                              }
                            }}
                          />
                        ))}
                        {/* Snap-mode waypoints — shown for ALL lanes, large hit targets */}
                        {snapActive && lane.pathPoints && lane.pathPoints.map((point, idx) => {
                          const isFirst = snapFirstNode?.laneId === lane.id && snapFirstNode?.pointIndex === idx;
                          return (
                            <g key={`${lane.id}-snap-${idx}`}>
                              {isFirst && (
                                <circle cx={point[0]} cy={point[1]} r={18}
                                  fill="none" stroke="#f59e0b" strokeWidth={2}
                                  strokeDasharray="4 3" className="pointer-events-none" />
                              )}
                              <circle
                                cx={point[0]} cy={point[1]}
                                r={isFirst ? 11 : 9}
                                fill={isFirst ? '#f59e0b' : strokeColor}
                                stroke="white" strokeWidth={isFirst ? 3 : 2}
                                className="pointer-events-auto cursor-pointer"
                                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!snapFirstNode) {
                                    // First node selected
                                    setSnapFirstNode({ laneId: lane.id, pointIndex: idx, x: point[0], y: point[1] });
                                  } else if (snapFirstNode.laneId !== lane.id) {
                                    // Second node on a different lane — perform snap
                                    const srcLane = lanes.find(l => l.id === snapFirstNode.laneId);
                                    if (srcLane?.pathPoints) {
                                      const newPts = [...srcLane.pathPoints] as [number, number][];
                                      newPts[snapFirstNode.pointIndex] = [point[0], point[1]];
                                      updateLanePathPoints(snapFirstNode.laneId, newPts);
                                    }
                                    setSnapFirstNode(null); // stay in snap mode for more joins
                                  } else {
                                    // Same lane — replace first node selection
                                    setSnapFirstNode({ laneId: lane.id, pointIndex: idx, x: point[0], y: point[1] });
                                  }
                                }}
                              />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}

                  {showLanes && laneJunctions.map((junc, idx) => (
                    <circle
                      key={`junction-${idx}`}
                      cx={junc.x} cy={junc.y}
                      r={junc.count > 2 ? 6 : 4}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--primary) / 0.4)"
                      strokeWidth={2}
                      className="pointer-events-none"
                      filter="url(#glow)"
                    />
                  ))}

                  {isDrawing && drawingPoints.length > 1 && (
                    <path
                      d={`M ${drawingPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}${drawingMode === 'sector' ? ' Z' : ''}`}
                      fill={drawingMode === 'sector' ? 'hsl(var(--primary) / 0.15)' : 'none'}
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                  )}

                  {isLaneDrawing && laneDrawPoints.length > 1 && (
                    <path
                      d={`M ${laneDrawPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="pointer-events-none animate-pulse"
                    />
                  )}

                  {isSectorDrawing && sectorDrawPoints.length > 1 && (
                    <>
                      <path
                        d={`M ${sectorDrawPoints.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`}
                        fill="hsl(var(--primary) / 0.1)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="pointer-events-none"
                      />
                      <circle
                        cx={sectorDrawPoints[0][0]}
                        cy={sectorDrawPoints[0][1]}
                        r={15}
                        fill="hsl(var(--primary) / 0.3)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        className="pointer-events-none animate-pulse"
                      />
                    </>
                  )}
                </svg>

                {!snapActive && filteredPlanets.map(planet => (
                  <PlanetMarker
                    key={planet.id}
                    planet={planet}
                    pad={pad}
                    isSelected={selectedPlanet?.id === planet.id}
                    isHovered={hoveredItem?.type === 'planet' && hoveredItem.id === planet.id}
                    hasOtherHovered={!!hoveredItem && !(hoveredItem.type === 'planet' && hoveredItem.id === planet.id)}
                    isLaneStart={laneDrawStartPlanet === planet.id}
                    planetUnlocked={unlockedPlanetIds.has(planet.id)}
                    showLabels={showLabels}
                    editMode={editMode}
                    hasBrokenImage={brokenImages.has(planet.id)}
                    shouldLoadImage={viewTransform.scale >= ZOOM_LOAD_IMAGES}
                    onImageError={handleImageError}
                    onClick={handlePlanetClick}
                    onMouseEnter={handlePlanetMouseEnter}
                    onMouseLeave={handlePlanetMouseLeave}
                    onMouseDown={handlePlanetMouseDownStable}
                  />
                ))}

                {filteredFleets.map(fleet => {
                  const isSelected = selectedFleet?.id === fleet.id;
                  return (
                    <div
                      key={fleet.id}
                      tabIndex={-1}
                      className={cn("absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200 outline-none focus:outline-none focus-visible:outline-none select-none", editMode && !isInAnyDrawCreation ? "cursor-move" : "cursor-pointer")}
                      style={{ left: fleet.x + pad, top: fleet.y + pad, outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                      onClick={(e) => handleFleetClick(e, fleet)}
                      onMouseEnter={() => setHoveredItem({ type: 'fleet', id: fleet.id })}
                      onMouseLeave={() => setHoveredItem(null)}
                      onMouseDown={(e) => {
                        if (isInAnyDrawCreation) return;
                        if (editMode) setDraggingFleet(fleet.id);
                      }}
                    >
                      <div className="relative">
                        {fleet.isCapitalShip && (
                          <div className="absolute left-1/2 -translate-x-1/2 -top-6 text-primary drop-shadow-[0_0_8px_currentColor] animate-pulse pointer-events-none">
                            <Crown className="w-5 h-5 fill-primary/20" />
                          </div>
                        )}
                        {fleet.markerImage ? (
                          <div className={cn("relative transition-all duration-300", isSelected ? "scale-125 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "hover:scale-110")}>
                            <img src={fleet.markerImage} alt={fleet.name} className="w-10 h-10 object-contain drop-shadow-lg" />
                            {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75"></div>}
                          </div>
                        ) : (
                          <div className={cn(
                            "p-2 rounded-full bg-background/95 border-2 transition-all duration-300 shadow-xl overflow-hidden flex items-center justify-center",
                            isSelected ? "border-primary scale-125 shadow-[0_0_20px_hsl(var(--primary))]" : "border-muted-foreground/50",
                            fleet.faction === 'Empire' && isSelected && "border-destructive shadow-[0_0_20px_hsl(var(--destructive))]"
                          )}>
                            <Ship className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                          </div>
                        )}
                      </div>
                      {(() => {
                        const lm = (fleet.labelMode as LabelMode) || 'normal';
                        const showFleetLabel = lm === 'hover'
                          ? (hoveredItem?.id === fleet.id || isSelected)
                          : lm === 'top'
                            ? true
                            : !(hoveredItem && hoveredItem.id !== fleet.id && !isSelected);
                        return showFleetLabel ? (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded text-[9px] font-display tracking-widest bg-background/95 border border-primary/30 text-primary uppercase pointer-events-none">
                            {fleet.name}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Sector Overlap Dialog */}
      <Dialog open={overlapDialogOpen} onOpenChange={(o) => { if (!o) handleOverlapCancel(); }}>
        <DialogContent className="glass-panel-primary border-primary/30 sm:max-w-md bg-[#05080f]/95 backdrop-blur-3xl">
          <DialogHeader className="items-center text-center">
            <AlertTriangle className="w-10 h-10 text-yellow-400 mb-2" />
            <DialogTitle className="text-primary font-display font-black text-xl tracking-[0.2em]">SECTOR OVERLAP</DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] uppercase font-bold tracking-[0.2em]">
              This sector overlaps {overlappingSectors.length === 1 ? `"${overlappingSectors[0].name}"` : `${overlappingSectors.length} existing sectors`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {/* Option cards */}
            <button
              onClick={() => setOverlapChoice('erase')}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                overlapChoice === 'erase'
                  ? "border-primary bg-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
                  : "border-white/10 bg-white/5 hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="font-display font-black text-[11px] uppercase tracking-widest text-primary mb-1">Erase Overlap</div>
              <div className="text-[10px] text-primary/60">
                Clip the overlapping area from the existing sector{overlappingSectors.length > 1 ? 's' : ''}, carving out space for the new one.
              </div>
            </button>

            <button
              onClick={() => setOverlapChoice('contested')}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                overlapChoice === 'contested'
                  ? "border-yellow-400/60 bg-yellow-400/10 shadow-[0_0_10px_rgba(250,204,21,0.2)]"
                  : "border-white/10 bg-white/5 hover:border-yellow-400/30 hover:bg-yellow-400/5"
              )}
            >
              <div className="font-display font-black text-[11px] uppercase tracking-widest text-yellow-400 mb-1">Mark as Contested</div>
              <div className="text-[10px] text-primary/60">
                Both sectors coexist — mark the new sector as disputed territory between two factions.
              </div>
            </button>

            {/* Faction selectors — only shown when contested is chosen */}
            {overlapChoice === 'contested' && (
              <div className="p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-[10px] uppercase font-bold tracking-widest text-yellow-400/80">Contested Factions</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-primary/60">Faction 1</Label>
                    <Select value={contestFaction1} onValueChange={setContestFaction1}>
                      <SelectTrigger className="h-8 bg-black/60 border-primary/20 text-[10px] uppercase font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {factionList.map(f => (
                          <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-primary/60">Faction 2</Label>
                    <Select value={contestFaction2} onValueChange={setContestFaction2}>
                      <SelectTrigger className="h-8 bg-black/60 border-primary/20 text-[10px] uppercase font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {factionList.map(f => (
                          <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={handleOverlapCancel} className="border border-white/10 text-primary/60 hover:text-primary hover:bg-primary/10 font-display tracking-widest text-[10px]">
              CANCEL
            </Button>
            <Button
              onClick={handleOverlapConfirm}
              disabled={!overlapChoice || (overlapChoice === 'contested' && (!contestFaction1 || !contestFaction2))}
              className={cn(
                "font-display font-black tracking-[0.2em] text-[10px] flex-1",
                overlapChoice === 'contested'
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                  : "bg-primary text-background"
              )}
            >
              {overlapChoice === 'erase' ? 'ERASE OVERLAP' : overlapChoice === 'contested' ? 'MARK CONTESTED' : 'CONFIRM'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
