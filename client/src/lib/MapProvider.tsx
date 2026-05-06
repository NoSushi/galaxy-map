import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapContext, 
  Planet,
  Sector,
  HyperspaceLane,
  Fleet,
  FactionInfo,
  AuthUser,
} from './data';
import { planetApi, sectorApi, laneApi, fleetApi, factionApi } from './api';

// ─── Polygon helpers ──────────────────────────────────────────────────────────

function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function lineSegmentIntersection(
  a1: [number, number], a2: [number, number],
  b1: [number, number], b2: [number, number]
): [number, number] | null {
  const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1];
  const d2x = b2[0] - b1[0], d2y = b2[1] - b1[1];
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null;
  const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / cross;
  const u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / cross;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [a1[0] + t * d1x, a1[1] + t * d1y];
  }
  return null;
}

function polygonsOverlap(a: [number, number][], b: [number, number][]): boolean {
  // Check if any vertex of a is inside b or vice versa
  for (const [x, y] of a) {
    if (pointInPolygon(x, y, b)) return true;
  }
  for (const [x, y] of b) {
    if (pointInPolygon(x, y, a)) return true;
  }
  // Check edge intersections
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i], a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j], b2 = b[(j + 1) % b.length];
      if (lineSegmentIntersection(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Computes the difference polygon: subject minus clip.
 * Returns the portion of subject that lies OUTSIDE the clip polygon.
 * Uses a vertex-walking approach that handles most practical cases.
 */
function polygonDifference(subject: [number, number][], clip: [number, number][]): [number, number][] {
  if (subject.length < 3 || clip.length < 3) return subject;

  const result: [number, number][] = [];
  const n = subject.length;

  for (let i = 0; i < n; i++) {
    const curr = subject[i];
    const next = subject[(i + 1) % n];
    const currInside = pointInPolygon(curr[0], curr[1], clip);
    const nextInside = pointInPolygon(next[0], next[1], clip);

    // Find all intersections of this edge with the clip boundary
    const edgeIntersections: { pt: [number, number]; t: number }[] = [];
    const m = clip.length;
    for (let j = 0; j < m; j++) {
      const c1 = clip[j];
      const c2 = clip[(j + 1) % m];
      const pt = lineSegmentIntersection(curr, next, c1, c2);
      if (pt) {
        const dx = next[0] - curr[0], dy = next[1] - curr[1];
        const len2 = dx * dx + dy * dy;
        const t = len2 > 1e-10 ? ((pt[0] - curr[0]) * dx + (pt[1] - curr[1]) * dy) / len2 : 0;
        edgeIntersections.push({ pt, t });
      }
    }
    edgeIntersections.sort((a, b) => a.t - b.t);

    if (!currInside) {
      result.push(curr);
    }
    // Add intersection points
    for (const { pt } of edgeIntersections) {
      result.push(pt);
    }
  }

  // Deduplicate nearby points
  const deduped = result.filter((pt, i) => {
    if (i === 0) return true;
    const prev = result[i - 1];
    return Math.abs(pt[0] - prev[0]) > 0.5 || Math.abs(pt[1] - prev[1]) > 0.5;
  });

  return deduped.length >= 3 ? deduped : subject;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [lanes, setLanes] = useState<HyperspaceLane[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [factionList, setFactionList] = useState<FactionInfo[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedLane, setSelectedLane] = useState<HyperspaceLane | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);

  const [showLanes, setShowLanes] = useState(true);
  const [showSectors, setShowSectors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [laneDrawMode, setLaneDrawMode] = useState(false);
  const [sectorDrawMode, setSectorDrawMode] = useState(false);

  // Planet lock state: planets NOT in this set cannot be dragged
  const [unlockedPlanetIds, setUnlockedPlanetIds] = useState<Set<string>>(new Set());

  const viewportCenterFnRef = useRef<(() => { x: number; y: number }) | null>(null);
  const getViewportCenter = useCallback(() => {
    if (viewportCenterFnRef.current) return viewportCenterFnRef.current();
    return { x: 3000, y: 3000 };
  }, []);
  const setGetViewportCenter = useCallback((fn: () => { x: number; y: number }) => {
    viewportCenterFnRef.current = fn;
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [targetedPlanet, setTargetedPlanet] = useState<Planet | null>(null);

  const [filters, setFilters] = useState({
    faction: 'All',
    habitable: 'All',
    environment: 'All'
  });

  const updateTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, s, l, f, factions] = await Promise.all([
          planetApi.getAll(),
          sectorApi.getAll(),
          laneApi.getAll(),
          fleetApi.getAll(),
          factionApi.getAll(),
        ]);
        setPlanets(p);
        setSectors(s);
        setLanes(l);
        setFleets(f);
        setFactionList(factions);
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // When edit mode is disabled, lock all planets
  useEffect(() => {
    if (!editMode) {
      setUnlockedPlanetIds(new Set());
    }
  }, [editMode]);

  const debouncedApiCall = useCallback((key: string, fn: () => Promise<any>, delay = 300) => {
    if (updateTimers.current[key]) clearTimeout(updateTimers.current[key]);
    updateTimers.current[key] = setTimeout(() => {
      fn().catch(err => console.error('API update failed:', err));
    }, delay);
  }, []);

  const unlockPlanet = useCallback((id: string) => {
    setUnlockedPlanetIds(prev => new Set(prev).add(id));
  }, []);

  const lockPlanet = useCallback((id: string) => {
    setUnlockedPlanetIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const pointToSegmentDist = useCallback((px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return Math.sqrt(apx * apx + apy * apy);
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
    const cx = ax + t * abx, cy = ay + t * aby;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }, []);

  const autoConnectPlanetToLanes = useCallback((planet: Planet) => {
    const threshold = 15;
    setLanes(prev => {
      let changed = false;
      const updated = prev.map(lane => {
        if (lane.planetIds.includes(planet.id)) return lane;
        const pts = lane.pathPoints || [];
        if (pts.length === 0) return lane;
        const p1 = planets.find(p => p.id === lane.planetIds[0]);
        const p2 = lane.planetIds[1] ? planets.find(p => p.id === lane.planetIds[1]) : null;
        const allPts: [number, number][] = [];
        if (p1) allPts.push([p1.x, p1.y]);
        allPts.push(...(pts as [number, number][]));
        if (p2) allPts.push([p2.x, p2.y]);
        let isNear = false;
        for (let i = 0; i < allPts.length - 1; i++) {
          if (pointToSegmentDist(planet.x, planet.y, allPts[i][0], allPts[i][1], allPts[i+1][0], allPts[i+1][1]) < threshold) {
            isNear = true;
            break;
          }
        }
        if (isNear) {
          changed = true;
          const newPlanetIds = [...lane.planetIds, planet.id];
          const updatedLane = { ...lane, planetIds: newPlanetIds };
          debouncedApiCall(`lane-${lane.id}`, () => laneApi.update(updatedLane));
          return updatedLane;
        }
        return lane;
      });
      return changed ? updated : prev;
    });
  }, [debouncedApiCall, pointToSegmentDist, planets]);

  const updatePlanet = (updatedPlanet: Planet) => {
    const oldPlanet = planets.find(p => p.id === updatedPlanet.id);
    setPlanets(prev => prev.map(p => p.id === updatedPlanet.id ? updatedPlanet : p));
    if (selectedPlanet?.id === updatedPlanet.id) setSelectedPlanet(updatedPlanet);
    debouncedApiCall(`planet-${updatedPlanet.id}`, () => planetApi.update(updatedPlanet));
    if (oldPlanet && (oldPlanet.x !== updatedPlanet.x || oldPlanet.y !== updatedPlanet.y)) {
      autoConnectPlanetToLanes(updatedPlanet);
    }
  };

  const addPlanet = (newPlanet: Planet) => {
    setPlanets(prev => [...prev, newPlanet]);
    planetApi.create(newPlanet).catch(err => console.error('Failed to create planet:', err));
    autoConnectPlanetToLanes(newPlanet);
  };

  // Auto-assign planets inside a sector to the sector's faction
  const autoAssignPlanetFactions = useCallback((sector: Sector, currentPlanets: Planet[]) => {
    if (sector.points.length < 3) return;
    const toUpdate: Planet[] = [];
    for (const planet of currentPlanets) {
      if (pointInPolygon(planet.x, planet.y, sector.points)) {
        if (planet.faction !== sector.faction) {
          toUpdate.push({ ...planet, faction: sector.faction });
        }
      }
    }
    if (toUpdate.length === 0) return;
    setPlanets(prev => prev.map(p => {
      const updated = toUpdate.find(u => u.id === p.id);
      return updated || p;
    }));
    if (selectedPlanet) {
      const updated = toUpdate.find(u => u.id === selectedPlanet.id);
      if (updated) setSelectedPlanet(updated);
    }
    for (const planet of toUpdate) {
      debouncedApiCall(`planet-faction-${planet.id}`, () => planetApi.update(planet));
    }
  }, [debouncedApiCall, selectedPlanet]);

  // Clip existing sectors against the newly drawn sector (erase overlapping area)
  const clipSectorsAgainstNew = useCallback((newSector: Sector) => {
    if (newSector.points.length < 3) return;
    setSectors(prev => {
      let changed = false;
      const updated = prev.map(existing => {
        if (existing.id === newSector.id) return existing;
        if (existing.points.length < 3) return existing;
        if (!polygonsOverlap(existing.points, newSector.points)) return existing;
        const clipped = polygonDifference(existing.points, newSector.points);
        if (clipped.length === existing.points.length && 
            clipped.every((pt, i) => pt[0] === existing.points[i][0] && pt[1] === existing.points[i][1])) {
          return existing;
        }
        changed = true;
        const updated = { ...existing, points: clipped };
        debouncedApiCall(`sector-points-${existing.id}`, () => sectorApi.update(updated));
        return updated;
      });
      return changed ? updated : prev;
    });
  }, [debouncedApiCall]);

  const updateSector = (updatedSector: Sector) => {
    const oldSector = sectors.find(s => s.id === updatedSector.id);
    setSectors(prev => prev.map(s => s.id === updatedSector.id ? updatedSector : s));
    if (selectedSector?.id === updatedSector.id) setSelectedSector(updatedSector);
    debouncedApiCall(`sector-${updatedSector.id}`, () => sectorApi.update(updatedSector));
    // Auto-assign planets if faction changed
    if (oldSector && oldSector.faction !== updatedSector.faction) {
      autoAssignPlanetFactions(updatedSector, planets);
    }
  };

  const addSector = (newSector: Sector, options?: { clip?: boolean }) => {
    const shouldClip = options?.clip !== false;
    setSectors(prev => [...prev, newSector]);
    sectorApi.create(newSector).catch(err => console.error('Failed to create sector:', err));
    if (shouldClip) clipSectorsAgainstNew(newSector);
    autoAssignPlanetFactions(newSector, planets);
  };

  const updateSectorPoints = (sectorId: string, points: [number, number][]) => {
    let fullSector: Sector | null = null;
    setSectors(prev => {
      const updated = prev.map(s => {
        if (s.id === sectorId) {
          fullSector = { ...s, points };
          return fullSector;
        }
        return s;
      });
      return updated;
    });
    if (selectedSector?.id === sectorId) {
      setSelectedSector(prev => prev ? { ...prev, points } : null);
    }
    if (fullSector) {
      const sectorToUpdate = fullSector;
      debouncedApiCall(`sector-points-${sectorId}`, () => sectorApi.update(sectorToUpdate));
    }
  };

  const updateLane = (updatedLane: HyperspaceLane) => {
    setLanes(prev => prev.map(l => l.id === updatedLane.id ? updatedLane : l));
    if (selectedLane?.id === updatedLane.id) setSelectedLane(updatedLane);
    debouncedApiCall(`lane-${updatedLane.id}`, () => laneApi.update(updatedLane));
  };

  const addLane = (newLane: HyperspaceLane) => {
    setLanes(prev => [...prev, newLane]);
    laneApi.create(newLane).catch(err => console.error('Failed to create lane:', err));
  };

  const updateLanePathPoints = (laneId: string, points: [number, number][]) => {
    let fullLane: HyperspaceLane | null = null;
    setLanes(prev => prev.map(l => {
      if (l.id === laneId) {
        fullLane = { ...l, pathPoints: points };
        return fullLane;
      }
      return l;
    }));
    if (selectedLane?.id === laneId) {
      setSelectedLane(prev => prev ? { ...prev, pathPoints: points } : null);
    }
    if (fullLane) {
      const laneToUpdate = fullLane;
      debouncedApiCall(`lane-path-${laneId}`, () => laneApi.update(laneToUpdate));
    }
  };

  const updateFleet = (updatedFleet: Fleet) => {
    setFleets(prev => prev.map(f => f.id === updatedFleet.id ? updatedFleet : f));
    if (selectedFleet?.id === updatedFleet.id) setSelectedFleet(updatedFleet);
    debouncedApiCall(`fleet-${updatedFleet.id}`, () => fleetApi.update(updatedFleet));
  };

  const addFleet = (newFleet: Fleet) => {
    setFleets(prev => [...prev, newFleet]);
    fleetApi.create(newFleet).catch(err => console.error('Failed to create fleet:', err));
  };

  const deletePlanet = (id: string) => {
    setPlanets(prev => prev.filter(p => p.id !== id));
    if (selectedPlanet?.id === id) setSelectedPlanet(null);
    setLanes(prev => {
      const toDelete = prev.filter(l => l.planetIds.includes(id));
      toDelete.forEach(l => laneApi.delete(l.id).catch(console.error));
      return prev.filter(l => !l.planetIds.includes(id));
    });
    planetApi.delete(id).catch(err => console.error('Failed to delete planet:', err));
  };

  const deleteFleet = (id: string) => {
    setFleets(prev => prev.filter(f => f.id !== id));
    if (selectedFleet?.id === id) setSelectedFleet(null);
    fleetApi.delete(id).catch(err => console.error('Failed to delete fleet:', err));
  };

  const deleteSector = (id: string) => {
    setSectors(prev => prev.filter(s => s.id !== id));
    if (selectedSector?.id === id) setSelectedSector(null);
    sectorApi.delete(id).catch(err => console.error('Failed to delete sector:', err));
  };

  const deleteLane = (id: string) => {
    setLanes(prev => prev.filter(l => l.id !== id));
    if (selectedLane?.id === id) setSelectedLane(null);
    laneApi.delete(id).catch(err => console.error('Failed to delete lane:', err));
  };

  const addFaction = async (name: string, color: string) => {
    const created = await factionApi.create(name, color);
    setFactionList(prev => [...prev, created]);
  };

  const updateFaction = async (id: string, data: Partial<FactionInfo>) => {
    const updated = await factionApi.update(id, data);
    setFactionList(prev => prev.map(f => f.id === id ? updated : f));
  };

  const deleteFaction = async (id: string) => {
    await factionApi.delete(id);
    setFactionList(prev => prev.filter(f => f.id !== id));
  };

  return (
    <MapContext.Provider value={{
      planets,
      sectors,
      lanes,
      fleets,
      factionList,
      currentUser,
      selectedPlanet,
      selectedSector,
      selectedLane,
      selectedFleet,
      showLanes,
      showSectors,
      showLabels,
      showOverlay,
      editMode,
      laneDrawMode,
      sectorDrawMode,
      searchQuery,
      filters,
      isLoading,
      unlockedPlanetIds,
      setPlanets,
      setSectors,
      setLanes,
      setFleets,
      setFactionList,
      setCurrentUser,
      setSelectedPlanet,
      setSelectedSector,
      setSelectedLane,
      setSelectedFleet,
      setShowLanes,
      setShowSectors,
      setShowLabels,
      setShowOverlay,
      setEditMode,
      setLaneDrawMode,
      setSectorDrawMode,
      setSearchQuery,
      setFilters,
      updatePlanet,
      addPlanet,
      updateSector,
      addSector,
      updateSectorPoints,
      updateLane,
      addLane,
      updateLanePathPoints,
      updateFleet,
      addFleet,
      deletePlanet,
      deleteFleet,
      deleteSector,
      deleteLane,
      addFaction,
      updateFaction,
      deleteFaction,
      unlockPlanet,
      lockPlanet,
      getViewportCenter,
      setGetViewportCenter,
      targetedPlanet,
      setTargetedPlanet,
    }}>
      {children}
    </MapContext.Provider>
  );
};
