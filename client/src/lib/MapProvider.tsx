import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapContext, 
  Planet,
  Sector,
  HyperspaceLane,
  Fleet
} from './data';
import { planetApi, sectorApi, laneApi, fleetApi } from './api';

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [lanes, setLanes] = useState<HyperspaceLane[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState({
    faction: 'All',
    habitable: 'All',
    environment: 'All'
  });

  // Debounce timer refs for API updates
  const updateTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, s, l, f] = await Promise.all([
          planetApi.getAll(),
          sectorApi.getAll(),
          laneApi.getAll(),
          fleetApi.getAll()
        ]);
        setPlanets(p);
        setSectors(s);
        setLanes(l);
        setFleets(f);
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const debouncedApiCall = useCallback((key: string, fn: () => Promise<any>, delay = 300) => {
    if (updateTimers.current[key]) clearTimeout(updateTimers.current[key]);
    updateTimers.current[key] = setTimeout(() => {
      fn().catch(err => console.error('API update failed:', err));
    }, delay);
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

  const updateSector = (updatedSector: Sector) => {
    setSectors(prev => prev.map(s => s.id === updatedSector.id ? updatedSector : s));
    if (selectedSector?.id === updatedSector.id) setSelectedSector(updatedSector);
    debouncedApiCall(`sector-${updatedSector.id}`, () => sectorApi.update(updatedSector));
  };

  const addSector = (newSector: Sector) => {
    setSectors(prev => [...prev, newSector]);
    sectorApi.create(newSector).catch(err => console.error('Failed to create sector:', err));
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

  return (
    <MapContext.Provider value={{
      planets,
      sectors,
      lanes,
      fleets,
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
      setPlanets,
      setSectors,
      setLanes,
      setFleets,
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
      deleteLane
    }}>
      {children}
    </MapContext.Provider>
  );
};
