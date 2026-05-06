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
  travelable?: boolean | null;
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

export interface FactionInfo {
  id: string;
  name: string;
  color: string;
}

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
  password: string;
  canEditPlanets: boolean;
  canEditSectors: boolean;
  canEditLanes: boolean;
  canEditFleets: boolean;
  canManageFactions: boolean;
}

export interface MapContextType {
  planets: Planet[];
  sectors: Sector[];
  lanes: HyperspaceLane[];
  fleets: Fleet[];
  factionList: FactionInfo[];
  currentUser: AuthUser | null;
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
  unlockedPlanetIds: Set<string>;
  setPlanets: (planets: Planet[]) => void;
  setSectors: (sectors: Sector[]) => void;
  setLanes: (lanes: HyperspaceLane[]) => void;
  setFleets: (fleets: Fleet[]) => void;
  setFactionList: (factions: FactionInfo[]) => void;
  setCurrentUser: (user: AuthUser | null) => void;
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
  addSector: (sector: Sector, options?: { clip?: boolean }) => void;
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
  addFaction: (name: string, color: string) => Promise<void>;
  updateFaction: (id: string, data: Partial<FactionInfo>) => Promise<void>;
  deleteFaction: (id: string) => Promise<void>;
  unlockPlanet: (id: string) => void;
  lockPlanet: (id: string) => void;
  getViewportCenter: () => { x: number; y: number };
  setGetViewportCenter: (fn: () => { x: number; y: number }) => void;
  targetedPlanet: Planet | null;
  setTargetedPlanet: (planet: Planet | null) => void;
}

export const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a MapProvider');
  return context;
};
