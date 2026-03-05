import { createContext, useContext } from 'react';

export type Faction = string;
export type Environment = string;
export type RouteType = string;

export interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  sectorId: string | null;
  faction: string;
  habitable: boolean;
  environment: string;
  population?: string | null;
  description: string;
  image?: string | null;
  markerImage?: string | null;
  isCapital?: boolean | null;
  capitalOf?: string | null;
  isMinor?: boolean | null;
  isPowerbaseCapital?: boolean | null;
  powerbaseOf?: string | null;
  oversector?: string | null;
}

export interface Sector {
  id: string;
  name: string;
  color: string;
  points: [number, number][];
  faction: string;
  isContested?: boolean | null;
  contestedFaction1?: string | null;
  contestedFaction2?: string | null;
}

export interface HyperspaceLane {
  id: string;
  name: string;
  planetIds: string[];
  type: string;
  pathPoints?: [number, number][] | null;
}

export interface Fleet {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: string | null;
  faction: string;
  description: string;
  markerImage?: string | null;
  isCapitalShip?: boolean | null;
}

export interface MapContextType {
  planets: Planet[];
  sectors: Sector[];
  lanes: HyperspaceLane[];
  fleets: Fleet[];
  selectedPlanet: Planet | null;
  selectedSector: Sector | null;
  selectedLane: HyperspaceLane | null;
  selectedFleet: Fleet | null;
  showLanes: boolean;
  showSectors: boolean;
  showLabels: boolean;
  showOverlay: boolean;
  editMode: boolean;
  laneDrawMode: boolean;
  sectorDrawMode: boolean;
  searchQuery: string;
  filters: {
    faction: string;
    habitable: string;
    environment: string;
  };
  isLoading: boolean;
  setPlanets: (planets: Planet[]) => void;
  setSectors: (sectors: Sector[]) => void;
  setLanes: (lanes: HyperspaceLane[]) => void;
  setFleets: (fleets: Fleet[]) => void;
  setSelectedPlanet: (planet: Planet | null) => void;
  setSelectedSector: (sector: Sector | null) => void;
  setSelectedLane: (lane: HyperspaceLane | null) => void;
  setSelectedFleet: (fleet: Fleet | null) => void;
  setShowLanes: (show: boolean) => void;
  setShowSectors: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setShowOverlay: (show: boolean) => void;
  setEditMode: (edit: boolean) => void;
  setLaneDrawMode: (mode: boolean) => void;
  setSectorDrawMode: (mode: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: any) => void;
  updatePlanet: (planet: Planet) => void;
  addPlanet: (planet: Planet) => void;
  updateSector: (sector: Sector) => void;
  addSector: (sector: Sector) => void;
  updateSectorPoints: (sectorId: string, points: [number, number][]) => void;
  updateLane: (lane: HyperspaceLane) => void;
  addLane: (lane: HyperspaceLane) => void;
  updateLanePathPoints: (laneId: string, points: [number, number][]) => void;
  updateFleet: (fleet: Fleet) => void;
  addFleet: (fleet: Fleet) => void;
  deletePlanet: (id: string) => void;
  deleteFleet: (id: string) => void;
  deleteSector: (id: string) => void;
  deleteLane: (id: string) => void;
}

export const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a MapProvider');
  return context;
};
