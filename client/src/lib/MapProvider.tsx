import { ReactNode, useState, useEffect } from 'react';
import { 
  MapContext, 
  initialPlanets, 
  initialSectors, 
  initialLanes,
  Planet,
  Sector,
  HyperspaceLane,
  Fleet
} from './data';

const STORAGE_KEY = 'galactic_cartography_data';

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [planets, setPlanets] = useState<Planet[]>(initialPlanets);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [lanes, setLanes] = useState<HyperspaceLane[]>(initialLanes);
  const [fleets, setFleets] = useState<Fleet[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.planets) setPlanets(data.planets);
        if (data.sectors) setSectors(data.sectors);
        if (data.lanes) setLanes(data.lanes);
        if (data.fleets) setFleets(data.fleets);
      } catch (e) {
        console.error('Failed to parse saved map data', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      planets,
      sectors,
      lanes,
      fleets
    }));
  }, [planets, sectors, lanes, fleets, isLoaded]);
  
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedLane, setSelectedLane] = useState<HyperspaceLane | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  
  const [showLanes, setShowLanes] = useState(true);
  const [showSectors, setShowSectors] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState({
    faction: 'All',
    habitable: 'All',
    environment: 'All'
  });

  const updatePlanet = (updatedPlanet: Planet) => {
    setPlanets(planets.map(p => p.id === updatedPlanet.id ? updatedPlanet : p));
    if (selectedPlanet?.id === updatedPlanet.id) {
      setSelectedPlanet(updatedPlanet);
    }
  };

  const addPlanet = (newPlanet: Planet) => {
    setPlanets([...planets, newPlanet]);
  };

  const updateSector = (updatedSector: Sector) => {
    setSectors(sectors.map(s => s.id === updatedSector.id ? updatedSector : s));
    if (selectedSector?.id === updatedSector.id) {
      setSelectedSector(updatedSector);
    }
  };

  const addSector = (newSector: Sector) => {
    setSectors([...sectors, newSector]);
  };

  const updateSectorPoints = (sectorId: string, points: [number, number][]) => {
    setSectors(sectors.map(s => s.id === sectorId ? { ...s, points } : s));
    if (selectedSector?.id === sectorId) {
      setSelectedSector(prev => prev ? { ...prev, points } : null);
    }
  };

  const updateLane = (updatedLane: HyperspaceLane) => {
    setLanes(lanes.map(l => l.id === updatedLane.id ? updatedLane : l));
    if (selectedLane?.id === updatedLane.id) {
      setSelectedLane(updatedLane);
    }
  };

  const addLane = (newLane: HyperspaceLane) => {
    setLanes([...lanes, newLane]);
  };

  const updateFleet = (updatedFleet: Fleet) => {
    setFleets(fleets.map(f => f.id === updatedFleet.id ? updatedFleet : f));
    if (selectedFleet?.id === updatedFleet.id) {
      setSelectedFleet(updatedFleet);
    }
  };

  const addFleet = (newFleet: Fleet) => {
    setFleets([...fleets, newFleet]);
  };

  const deletePlanet = (id: string) => {
    setPlanets(planets.filter(p => p.id !== id));
    if (selectedPlanet?.id === id) setSelectedPlanet(null);
    setLanes(lanes.filter(l => !l.planetIds.includes(id)));
  };

  const deleteFleet = (id: string) => {
    setFleets(fleets.filter(f => f.id !== id));
    if (selectedFleet?.id === id) setSelectedFleet(null);
  };

  const deleteSector = (id: string) => {
    setSectors(sectors.filter(s => s.id !== id));
    if (selectedSector?.id === id) setSelectedSector(null);
  };

  const deleteLane = (id: string) => {
    setLanes(lanes.filter(l => l.id !== id));
    if (selectedLane?.id === id) setSelectedLane(null);
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
      editMode,
      searchQuery,
      filters,
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
      setEditMode,
      setSearchQuery,
      setFilters,
      updatePlanet,
      addPlanet,
      updateSector,
      addSector,
      updateSectorPoints,
      updateLane,
      addLane,
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
