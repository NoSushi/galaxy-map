import { ReactNode, useState } from 'react';
import { 
  MapContext, 
  initialPlanets, 
  initialSectors, 
  initialLanes,
  Planet,
  Sector,
  HyperspaceLane
} from './data';

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [planets, setPlanets] = useState<Planet[]>(initialPlanets);
  const [sectors, setSectors] = useState<Sector[]>(initialSectors);
  const [lanes, setLanes] = useState<HyperspaceLane[]>(initialLanes);
  
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedLane, setSelectedLane] = useState<HyperspaceLane | null>(null);
  
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

  const updateSectorPoints = (sectorId: string, points: [number, number][]) => {
    setSectors(sectors.map(s => s.id === sectorId ? { ...s, points } : s));
    if (selectedSector?.id === sectorId) {
      setSelectedSector({ ...selectedSector, points });
    }
  };

  return (
    <MapContext.Provider value={{
      planets,
      sectors,
      lanes,
      selectedPlanet,
      selectedSector,
      selectedLane,
      showLanes,
      showSectors,
      showLabels,
      editMode,
      searchQuery,
      filters,
      setPlanets,
      setSectors,
      setLanes,
      setSelectedPlanet,
      setSelectedSector,
      setSelectedLane,
      setShowLanes,
      setShowSectors,
      setShowLabels,
      setEditMode,
      setSearchQuery,
      setFilters,
      updatePlanet,
      addPlanet,
      updateSector,
      updateSectorPoints
    }}>
      {children}
    </MapContext.Provider>
  );
};
