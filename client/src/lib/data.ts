import { useState, createContext, useContext } from 'react';

export type Faction = 'Galactic Republic' | 'Sith Empire' | 'Independent' | 'Hutt Cartel' | 'Trade Federation';
export type Environment = 'Desert' | 'Forest' | 'City' | 'Ocean' | 'Volcanic' | 'Ice' | 'Gas Giant' | 'Unknown';
export type RouteType = 'Major' | 'Minor' | 'Dangerous';

export interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  sectorId: string;
  faction: Faction;
  habitable: boolean;
  environment: Environment;
  population?: string;
  description: string;
  image?: string;
  markerImage?: string;
  isCapital?: boolean;
  capitalOf?: string;
}

export interface Sector {
  id: string;
  name: string;
  color: string;
  points: [number, number][]; // Polygon points
  faction: Faction;
}

export interface HyperspaceLane {
  id: string;
  name: string;
  planetIds: [string, string]; // connections between two planets
  type: RouteType;
}

export interface Fleet {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: string;
  faction: Faction;
  description: string;
}

export const initialSectors: Sector[] = [
  {
    id: 's1',
    name: 'Core Worlds',
    color: '190 90% 50%', // Cyan
    points: [[400, 300], [600, 300], [650, 450], [450, 550], [350, 400]],
    faction: 'Galactic Republic',
  },
  {
    id: 's2',
    name: 'Outer Rim Territories',
    color: '0 84% 60%', // Red
    points: [[100, 100], [900, 100], [900, 250], [600, 250], [400, 250], [100, 250]],
    faction: 'Independent',
  },
  {
    id: 's3',
    name: 'Hutt Space',
    color: '120 60% 50%', // Green
    points: [[650, 450], [900, 450], [900, 800], [500, 800], [450, 550]],
    faction: 'Hutt Cartel',
  }
];

export const initialPlanets: Planet[] = [
  {
    id: 'p1',
    name: 'Coruscant',
    x: 500,
    y: 400,
    sectorId: 's1',
    faction: 'Galactic Republic',
    habitable: true,
    environment: 'City',
    population: '3 Trillion',
    description: 'The vibrant heart and capital of the galaxy, featuring a planet-wide cityscape.',
    image: '/planet-city.png'
  },
  {
    id: 'p2',
    name: 'Tatooine',
    x: 200,
    y: 180,
    sectorId: 's2',
    faction: 'Hutt Cartel',
    habitable: true,
    environment: 'Desert',
    population: '200,000',
    description: 'A harsh desert world orbiting twin suns in the galaxy\'s Outer Rim.',
    image: '/planet-desert.png'
  },
  {
    id: 'p3',
    name: 'Endor',
    x: 750,
    y: 650,
    sectorId: 's3',
    faction: 'Independent',
    habitable: true,
    environment: 'Forest',
    population: '30,000,000',
    description: 'A forest moon known for its natural beauty and native Ewok population.',
    image: '/planet-forest.png'
  },
  {
    id: 'p4',
    name: 'Naboo',
    x: 450,
    y: 480,
    sectorId: 's1',
    faction: 'Galactic Republic',
    habitable: true,
    environment: 'Forest',
    population: '4,500,000,000',
    description: 'A bountiful planet with a rich history and culture, known for its plasma trade.',
    image: '/planet-forest.png'
  },
  {
    id: 'p5',
    name: 'Mustafar',
    x: 850,
    y: 150,
    sectorId: 's2',
    faction: 'Sith Empire',
    habitable: false,
    environment: 'Volcanic',
    population: '20,000',
    description: 'A volcanic, fiery world where the Sith frequently gathered.',
  }
];

export const initialLanes: HyperspaceLane[] = [
  { id: 'l1', name: 'Corellian Run', planetIds: ['p1', 'p2'], type: 'Major' },
  { id: 'l2', name: 'Hydian Way', planetIds: ['p1', 'p4'], type: 'Major' },
  { id: 'l3', name: 'Perlemian Trade Route', planetIds: ['p1', 'p5'], type: 'Dangerous' },
  { id: 'l4', name: 'Rimma Trade Route', planetIds: ['p4', 'p3'], type: 'Minor' },
];

interface MapContextType {
  planets: Planet[];
  sectors: Sector[];
  lanes: HyperspaceLane[];
  selectedPlanet: Planet | null;
  selectedSector: Sector | null;
  selectedLane: HyperspaceLane | null;
  selectedFleet: Fleet | null;
  showLanes: boolean;
  showSectors: boolean;
  showLabels: boolean;
  editMode: boolean;
  searchQuery: string;
  filters: {
    faction: string;
    habitable: string;
    environment: string;
  };
  fleets: Fleet[];
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
  setEditMode: (edit: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: any) => void;
  updatePlanet: (planet: Planet) => void;
  addPlanet: (planet: Planet) => void;
  updateSector: (sector: Sector) => void;
  addSector: (sector: Sector) => void;
  updateSectorPoints: (sectorId: string, points: [number, number][]) => void;
  updateLane: (lane: HyperspaceLane) => void;
  addLane: (lane: HyperspaceLane) => void;
  updateFleet: (fleet: Fleet) => void;
  addFleet: (fleet: Fleet) => void;
}

export const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a MapProvider');
  return context;
};
