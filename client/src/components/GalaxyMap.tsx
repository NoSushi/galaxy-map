import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMap, Planet, Fleet, HyperspaceLane, Sector } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Crown, Ship, Plus, Pencil } from 'lucide-react';
import { TargetingOverlay } from './TargetingOverlay';

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
  planetLocked: boolean;
  showLabels: boolean;
  editMode: boolean;
  hasBrokenImage: boolean;
  onImageError: (id: string) => void;
  onClick: (e: React.MouseEvent, planet: Planet) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onMouseDown: (e: React.MouseEvent, planet: Planet) => void;
}

const PlanetMarker = React.memo<PlanetMarkerProps>(({
  planet, pad, isSelected, isHovered, hasOtherHovered, isLaneStart,
  planetLocked, showLabels, editMode, hasBrokenImage,
  onImageError, onClick, onMouseEnter, onMouseLeave, onMouseDown
}) => {
  const shouldHide = !isSelected && !isHovered && (planet.isMinor || hasOtherHovered);

  return (
    <div
      tabIndex={-1}
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 outline-none focus:outline-none focus-visible:outline-none select-none",
        planetLocked ? "cursor-pointer" : (editMode ? "cursor-move" : "cursor-pointer"),
        isLaneStart && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
      )}
      style={{
        left: planet.x + pad, top: planet.y + pad,
        zIndex: isLaneStart ? 20 : (isHovered ? 20 : undefined),
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={(e) => onClick(e, planet)}
      onMouseEnter={() => onMouseEnter(planet.id)}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => onMouseDown(e, planet)}
    >
      <div className="relative">
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
        {planet.markerImage && planet.markerImage.trim() && !hasBrokenImage ? (
          <div className={cn("relative transition-all duration-300", isSelected ? "scale-125 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "hover:scale-110")}>
            <img
              src={planet.markerImage}
              alt=""
              className={cn("object-contain pointer-events-none drop-shadow-lg", planet.isMinor ? "w-5 h-5" : "w-10 h-10")}
              onError={() => onImageError(planet.id)}
              style={{ color: 'transparent' }}
            />
            {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75"></div>}
          </div>
        ) : (
          <div className={cn(
            "rounded-full relative transition-all",
            planet.isMinor ? "w-2.5 h-2.5" : "w-5 h-5",
            planet.faction === 'Empire' ? "bg-destructive shadow-[0_0_12px_hsl(var(--destructive))]"
              : planet.faction === 'Hutt Cartel' ? "bg-yellow-500 shadow-[0_0_12px_#eab308]"
              : planet.faction === 'Chiss Ascendancy' ? "bg-indigo-500 shadow-[0_0_12px_#6366f1]"
              : planet.faction === 'Galactic Republic' ? "bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
              : "",
            !['Empire', 'Hutt Cartel', 'Chiss Ascendancy', 'Galactic Republic'].includes(planet.faction || '') && "shadow-[0_0_12px_hsl(140, 90%, 45%)]",
            isSelected && "scale-125",
            isLaneStart && "bg-primary shadow-[0_0_20px_hsl(var(--primary))] scale-150"
          )}
          style={
            !['Empire', 'Hutt Cartel', 'Chiss Ascendancy', 'Galactic Republic'].includes(planet.faction || '') && !isLaneStart
              ? { backgroundColor: 'hsl(140, 52%, 55%)' }
              : undefined
          }>
            {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75"></div>}
          </div>
        )}
      </div>
      {showLabels && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded text-[10px] font-display tracking-widest whitespace-nowrap bg-background/80 border transition-opacity duration-200 uppercase pointer-events-none",
          isSelected ? "border-primary text-primary shadow-[0_0_15px_hsl(var(--primary)/0.4)]" : "border-border/60 text-foreground/90",
          shouldHide ? "opacity-0 invisible" : "opacity-100 visible"
        )}>
          {planet.name}
        </div>
      )}
    </div>
  );
});

export const GalaxyMap = () => {
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const { 
    planets, sectors, lanes, fleets,
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
  } = useMap();

  const mapWidth = 5000;
  const mapHeight = 5000; 
  
  const [draggingPlanet, setDraggingPlanet] = useState<string | null>(null);
  const [draggingSectorPoint, setDraggingSectorPoint] = useState<{sectorId: string, pointIndex: number} | null>(null);
  const [draggingFleet, setDraggingFleet] = useState<string | null>(null);
  const [draggingLanePoint, setDraggingLanePoint] = useState<{laneId: string, pointIndex: number} | null>(null);
  
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
  const [laneTooltipPos, setLaneTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Viewport culling: track transform at a throttled rate (CSS handles smooth motion)
  const [viewTransform, setViewTransform] = useState({ scale: 0.2, positionX: 0, positionY: 0 });
  const lastCullUpdate = useRef(0);

  // Targeting overlay state
  const [overlayPlanet, setOverlayPlanet] = useState<Planet | null>(null);
  const [overlayScreenPos, setOverlayScreenPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Scale used for both the fly-to pan and the overlay animation
  const FLY_SCALE = 0.4;
  const FLY_DURATION = 700; // ms camera takes to fly to planet

  useEffect(() => {
    if (!targetedPlanet) return;

    const ref = transformRef.current;
    const container = mapContainerRef.current;
    if (!ref || !container) return;

    const rect = container.getBoundingClientRect();

    // Step 1: Fly camera to center the planet at FLY_SCALE so animation is always visible
    const flyX = rect.width / 2 - (targetedPlanet.x + pad) * FLY_SCALE;
    const flyY = rect.height / 2 - (targetedPlanet.y + pad) * FLY_SCALE;
    ref.setTransform(flyX, flyY, FLY_SCALE, FLY_DURATION);

    // Step 2: After camera settles, compute the (now-centered) screen position and mount overlay
    const timer = setTimeout(() => {
      const { scale, positionX, positionY } = ref.instance.transformState;
      const screenX = (targetedPlanet.x + pad) * scale + positionX;
      const screenY = (targetedPlanet.y + pad) * scale + positionY;
      setOverlayPlanet(targetedPlanet);
      setOverlayScreenPos({ x: screenX, y: screenY, w: rect.width, h: rect.height });
    }, FLY_DURATION + 60);

    return () => clearTimeout(timer);
  }, [targetedPlanet]);

  const handleOverlayZoom = useCallback(() => {
    if (!targetedPlanet || !transformRef.current || !mapContainerRef.current) return;
    const container = mapContainerRef.current;
    const rect = container.getBoundingClientRect();
    const targetScale = 1.2;
    const newX = rect.width / 2 - (targetedPlanet.x + pad) * targetScale;
    const newY = rect.height / 2 - (targetedPlanet.y + pad) * targetScale;
    transformRef.current.setTransform(newX, newY, targetScale, 500);
  }, [targetedPlanet]);

  const handleOverlayComplete = useCallback(() => {
    setOverlayPlanet(null);
    setOverlayScreenPos(null);
    setTargetedPlanet(null);
  }, [setTargetedPlanet]);

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

  const filteredPlanets = useMemo(() => planets.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaction = filters.faction === 'All' || p.faction === filters.faction;
    const matchesHabitable = filters.habitable === 'All' ||
                             (filters.habitable === 'Yes' ? p.habitable : !p.habitable);
    const matchesEnv = filters.environment === 'All' || p.environment === filters.environment;
    return matchesSearch && matchesFaction && matchesHabitable && matchesEnv;
  }), [planets, searchQuery, filters]);

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

  const pad = 500;

  // Visible bounds in map-space coordinates (accounting for pad offset)
  const visibleBounds = useMemo(() => {
    const { scale, positionX, positionY } = viewTransform;
    const cw = mapContainerRef.current?.clientWidth ?? window.innerWidth;
    const ch = mapContainerRef.current?.clientHeight ?? window.innerHeight;
    const BUFFER = Math.max(400, 200 / scale); // generous off-screen buffer
    const left = -positionX / scale - pad - BUFFER;
    const top  = -positionY / scale - pad - BUFFER;
    const right  = left + cw / scale + BUFFER * 2;
    const bottom = top  + ch / scale + BUFFER * 2;
    return { left, top, right, bottom, scale };
  }, [viewTransform]);

  // IDs that must never be culled (selected / hovered / targeted)
  const pinnedPlanetIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedPlanet) ids.add(selectedPlanet.id);
    if (targetedPlanet) ids.add(targetedPlanet.id);
    if (overlayPlanet) ids.add(overlayPlanet.id);
    if (hoveredItem?.type === 'planet') ids.add(hoveredItem.id);
    return ids;
  }, [selectedPlanet, targetedPlanet, overlayPlanet, hoveredItem]);

  // Culled + LOD planet list
  const visiblePlanets = useMemo(() => {
    const { left, top, right, bottom, scale } = visibleBounds;
    const hideMinor = scale < 0.13; // skip tiny dots when fully zoomed out
    return filteredPlanets.filter(p => {
      if (pinnedPlanetIds.has(p.id)) return true;
      if (hideMinor && p.isMinor) return false;
      return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
    });
  }, [filteredPlanets, visibleBounds, pinnedPlanetIds]);

  // Culled + LOD lane list
  const visibleLanes = useMemo(() => {
    const { left, top, right, bottom, scale } = visibleBounds;
    const selectedLaneId = selectedLane?.id;
    const hideMinorLanes = scale < 0.12;
    return lanes.filter(lane => {
      if (lane.id === selectedLaneId) return true;
      if (hideMinorLanes && lane.type === 'Minor') return false;
      // Keep if either endpoint is in view OR a path point is in view
      const check = (x: number, y: number) =>
        x >= left && x <= right && y >= top && y <= bottom;
      const p1 = planetById.get(lane.planetIds[0]);
      if (p1 && check(p1.x, p1.y)) return true;
      const p2 = lane.planetIds[1] ? planetById.get(lane.planetIds[1]) : undefined;
      if (p2 && check(p2.x, p2.y)) return true;
      // Check a mid path-point if available
      if (lane.pathPoints && lane.pathPoints.length > 0) {
        const mid = lane.pathPoints[Math.floor(lane.pathPoints.length / 2)];
        if (check(mid[0], mid[1])) return true;
      }
      return false;
    });
  }, [lanes, visibleBounds, selectedLane, planetById]);

  // Culled fleet list
  const visibleFleets = useMemo(() => {
    const { left, top, right, bottom } = visibleBounds;
    const selId = selectedFleet?.id;
    return fleets.filter(f =>
      f.id === selId ||
      (f.x >= left && f.x <= right && f.y >= top && f.y <= bottom)
    );
  }, [fleets, visibleBounds, selectedFleet]);

  // Pre-computed sector path strings
  const sectorPaths = useMemo(() => {
    const m = new Map<string, string>();
    sectors.forEach(s => {
      m.set(s.id, `M ${s.points.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`);
    });
    return m;
  }, [sectors]);
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
      if (planet) updatePlanet({ ...planet, x, y });
    } else if (draggingSectorPoint) {
      const sector = sectors.find(s => s.id === draggingSectorPoint.sectorId);
      if (sector) {
        const newPoints = [...sector.points] as [number, number][];
        newPoints[draggingSectorPoint.pointIndex] = [x, y];
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
          const newSector = {
            id: `s${Date.now()}`,
            name: 'New Sector',
            color: `${Math.round(Math.random() * 360)} 50% 50%`,
            points: sectorDrawPoints,
            faction: 'Independent' as const
          };
          addSector(newSector);
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
    setDraggingPlanet(null);
    setDraggingSectorPoint(null);
    setDraggingFleet(null);
    setDraggingLanePoint(null);
  };

  const startDrawing = (mode: 'sector' | 'lane', e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawingMode(mode);
    setIsDrawing(true);
    setDrawingPoints([]);
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
    if (editMode) setDraggingPlanet(planet.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInAnyDrawCreation, laneDrawMode, laneDrawStartPlanet, editMode]);

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
    if (!showLanes || lanes.length < 2) return [];
    const junctions: { x: number; y: number; count: number }[] = [];
    const planetLaneCount = new Map<string, number>();

    for (const lane of lanes) {
      const seen = new Set<string>();
      for (const pid of lane.planetIds) {
        if (!seen.has(pid)) {
          seen.add(pid);
          planetLaneCount.set(pid, (planetLaneCount.get(pid) || 0) + 1);
        }
      }
    }

    const added = new Set<string>();
    for (const [pid, count] of planetLaneCount) {
      if (count >= 2 && !added.has(pid)) {
        added.add(pid);
        const planet = planets.find(p => p.id === pid);
        if (planet) {
          junctions.push({ x: planet.x, y: planet.y, count });
        }
      }
    }
    return junctions;
  }, [lanes, planets, showLanes]);

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
      {overlayPlanet && overlayScreenPos && (
        <TargetingOverlay
          key={overlayPlanet.id}
          planet={overlayPlanet}
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
        onTransform={(_ref, state) => {
          const now = Date.now();
          if (now - lastCullUpdate.current < 80) return; // max ~12fps culling updates
          lastCullUpdate.current = now;
          setViewTransform({ scale: state.scale, positionX: state.positionX, positionY: state.positionY });
        }}
        onZoomStop={(_ref, state) => {
          setViewTransform({ scale: state.scale, positionX: state.positionX, positionY: state.positionY });
        }}
        onPanningStop={(_ref, state) => {
          setViewTransform({ scale: state.scale, positionX: state.positionX, positionY: state.positionY });
        }}
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
              {editMode && selectedLane && !isInAnyDrawCreation && (
                <button
                  onMouseDown={(e) => startDrawing('lane', e)}
                  className="glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2 text-foreground hover:text-primary"
                  data-testid="button-draw-lane"
                >
                  <Pencil className="w-3 h-3" /> DRAW LANE PATH
                </button>
              )}
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <div 
                className={cn("relative origin-top-left", (isDrawing || isLaneDrawing || isSectorDrawing || sectorDrawMode) ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing")}
                style={{ 
                  width: `${totalWidth}px`, 
                  height: `${totalHeight}px`,
                  willChange: 'transform',
                  contain: 'layout style',
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
                    backgroundImage: `url('/galaxy-map.png')`,
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
                      backgroundImage: `url('/reference-map.png')`,
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
                  style={{ left: `${pad}px`, top: `${pad}px`, width: `${mapWidth}px`, height: `${mapHeight}px` }} 
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

                  {showSectors && sectors.map(sector => {
                    const isSelected = selectedSector?.id === sector.id;
                    const pathD = sectorPaths.get(sector.id) ?? '';
                    
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

                  {showLanes && visibleLanes.map(lane => {
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
                        {editMode && isSelected && !isInAnyDrawCreation && lane.pathPoints && lane.pathPoints.map((point, idx) => (
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

                {visiblePlanets.map(planet => (
                  <PlanetMarker
                    key={planet.id}
                    planet={planet}
                    pad={pad}
                    isSelected={selectedPlanet?.id === planet.id}
                    isHovered={hoveredItem?.type === 'planet' && hoveredItem.id === planet.id}
                    hasOtherHovered={!!hoveredItem && !(hoveredItem.type === 'planet' && hoveredItem.id === planet.id)}
                    isLaneStart={laneDrawStartPlanet === planet.id}
                    planetLocked={isInAnyDrawCreation}
                    showLabels={showLabels}
                    editMode={editMode}
                    hasBrokenImage={brokenImages.has(planet.id)}
                    onImageError={handleImageError}
                    onClick={handlePlanetClick}
                    onMouseEnter={handlePlanetMouseEnter}
                    onMouseLeave={handlePlanetMouseLeave}
                    onMouseDown={handlePlanetMouseDownStable}
                  />
                ))}

                {visibleFleets.map(fleet => {
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
                      <div className={cn(
                        "absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded text-[9px] font-display tracking-widest bg-background/95 border border-primary/30 text-primary uppercase transition-opacity duration-200 pointer-events-none",
                        hoveredItem && hoveredItem.id !== fleet.id && !isSelected ? "opacity-0" : "opacity-100"
                      )}>
                        {fleet.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
