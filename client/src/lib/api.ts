import type { Planet, Sector, HyperspaceLane, Fleet, FactionInfo } from './data';

const api = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok && res.status !== 204) {
    const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errBody.error || `API error: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

function mapPlanetFromApi(p: any): Planet {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    sectorId: p.sectorId ?? p.sector_id,
    faction: p.faction,
    habitable: p.habitable,
    environment: p.environment,
    population: p.population,
    description: p.description,
    image: p.image,
    markerImage: p.markerImage ?? p.marker_image,
    isCapital: p.isCapital ?? p.is_capital,
    capitalOf: p.capitalOf ?? p.capital_of,
    isMinor: p.isMinor ?? p.is_minor ?? false,
    isPowerbaseCapital: p.isPowerbaseCapital ?? p.is_powerbase_capital ?? false,
    powerbaseOf: p.powerbaseOf ?? p.powerbase_of ?? null,
    oversector: p.oversector ?? null,
    travelable: p.travelable ?? true,
    labelMode: p.labelMode ?? p.label_mode ?? 'normal',
    isWarzone: p.isWarzone ?? p.is_warzone ?? false,
    warzoneBattleName: p.warzoneBattleName ?? p.warzone_battle_name ?? '',
    warzoneBattlesWon: p.warzoneBattlesWon ?? p.warzone_battles_won ?? 0,
    warzoneBattlesLost: p.warzoneBattlesLost ?? p.warzone_battles_lost ?? 0,
    warzoneObjectives: p.warzoneObjectives ?? p.warzone_objectives ?? [],
    warzoneSystemLayout: p.warzoneSystemLayout ?? p.warzone_system_layout ?? null,
    warzoneForces: p.warzoneForces ?? p.warzone_forces ?? null,
    settlements: p.settlements ?? null,
  };
}

function mapPlanetToApi(p: Planet): any {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    sectorId: p.sectorId,
    faction: p.faction,
    habitable: p.habitable,
    environment: p.environment,
    population: p.population || null,
    description: p.description,
    image: p.image || null,
    markerImage: p.markerImage || null,
    isCapital: p.isCapital || false,
    capitalOf: p.capitalOf || null,
    isMinor: p.isMinor || false,
    isPowerbaseCapital: p.isPowerbaseCapital || false,
    powerbaseOf: p.powerbaseOf || null,
    oversector: p.oversector || null,
    travelable: p.travelable ?? true,
    labelMode: p.labelMode ?? 'normal',
    isWarzone: p.isWarzone ?? false,
    warzoneBattleName: p.warzoneBattleName ?? '',
    warzoneBattlesWon: p.warzoneBattlesWon ?? 0,
    warzoneBattlesLost: p.warzoneBattlesLost ?? 0,
    warzoneObjectives: p.warzoneObjectives ?? [],
    warzoneSystemLayout: p.warzoneSystemLayout ?? null,
    warzoneForces: p.warzoneForces ?? null,
    settlements: p.settlements ?? null,
  };
}

function mapSectorFromApi(s: any): Sector {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    points: s.points,
    faction: s.faction,
    isContested: s.isContested ?? s.is_contested ?? false,
    contestedFaction1: s.contestedFaction1 ?? s.contested_faction_1 ?? null,
    contestedFaction2: s.contestedFaction2 ?? s.contested_faction_2 ?? null,
  };
}

function mapLaneFromApi(l: any): HyperspaceLane {
  return {
    id: l.id,
    name: l.name,
    planetIds: l.planetIds ?? l.planet_ids,
    type: l.type,
    pathPoints: l.pathPoints ?? l.path_points ?? null,
  };
}

function mapLaneToApi(l: HyperspaceLane): any {
  return {
    id: l.id,
    name: l.name,
    planetIds: l.planetIds,
    type: l.type,
    pathPoints: l.pathPoints || null,
  };
}

function mapFleetFromApi(f: any): Fleet {
  return {
    id: f.id,
    name: f.name,
    x: f.x,
    y: f.y,
    icon: f.icon,
    faction: f.faction,
    description: f.description,
    markerImage: f.markerImage ?? f.marker_image,
    isCapitalShip: f.isCapitalShip ?? f.is_capital_ship,
    labelMode: f.labelMode ?? f.label_mode ?? 'hover',
    warzonePlanetId: f.warzonePlanetId ?? f.warzone_planet_id ?? null,
  };
}

function mapFleetToApi(f: Fleet): any {
  return {
    id: f.id,
    name: f.name,
    x: f.x,
    y: f.y,
    icon: f.icon || 'default',
    faction: f.faction,
    description: f.description,
    markerImage: f.markerImage || null,
    isCapitalShip: f.isCapitalShip || false,
    labelMode: f.labelMode ?? 'hover',
    warzonePlanetId: f.warzonePlanetId ?? null,
  };
}

// Build a PATCH payload containing ONLY the fields present in the partial,
// reusing the same normalization rules as mapPlanetToApi.
function mapPlanetPatchToApi(patch: Partial<Planet>): any {
  const normalized = mapPlanetToApi(patch as Planet);
  const out: any = {};
  for (const key of Object.keys(patch)) {
    if (key === 'id') continue;
    if (key in normalized) out[key] = normalized[key];
  }
  return out;
}

export const planetApi = {
  getAll: async (): Promise<Planet[]> => (await api('/api/planets')).map(mapPlanetFromApi),
  create: async (p: Planet): Promise<Planet> => mapPlanetFromApi(await api('/api/planets', { method: 'POST', body: JSON.stringify(mapPlanetToApi(p)) })),
  update: async (id: string, patch: Partial<Planet>): Promise<Planet> => mapPlanetFromApi(await api(`/api/planets/${id}`, { method: 'PATCH', body: JSON.stringify(mapPlanetPatchToApi(patch)) })),
  delete: async (id: string): Promise<void> => { await api(`/api/planets/${id}`, { method: 'DELETE' }); },
};

export const sectorApi = {
  getAll: async (): Promise<Sector[]> => (await api('/api/sectors')).map(mapSectorFromApi),
  create: async (s: Sector): Promise<Sector> => mapSectorFromApi(await api('/api/sectors', { method: 'POST', body: JSON.stringify(s) })),
  update: async (s: Sector): Promise<Sector> => mapSectorFromApi(await api(`/api/sectors/${s.id}`, { method: 'PATCH', body: JSON.stringify(s) })),
  delete: async (id: string): Promise<void> => { await api(`/api/sectors/${id}`, { method: 'DELETE' }); },
};

export const laneApi = {
  getAll: async (): Promise<HyperspaceLane[]> => (await api('/api/lanes')).map(mapLaneFromApi),
  create: async (l: HyperspaceLane): Promise<HyperspaceLane> => mapLaneFromApi(await api('/api/lanes', { method: 'POST', body: JSON.stringify(mapLaneToApi(l)) })),
  update: async (l: HyperspaceLane): Promise<HyperspaceLane> => mapLaneFromApi(await api(`/api/lanes/${l.id}`, { method: 'PATCH', body: JSON.stringify(mapLaneToApi(l)) })),
  delete: async (id: string): Promise<void> => { await api(`/api/lanes/${id}`, { method: 'DELETE' }); },
};

export const fleetApi = {
  getAll: async (): Promise<Fleet[]> => (await api('/api/fleets')).map(mapFleetFromApi),
  create: async (f: Fleet): Promise<Fleet> => mapFleetFromApi(await api('/api/fleets', { method: 'POST', body: JSON.stringify(mapFleetToApi(f)) })),
  update: async (f: Fleet): Promise<Fleet> => mapFleetFromApi(await api(`/api/fleets/${f.id}`, { method: 'PATCH', body: JSON.stringify(mapFleetToApi(f)) })),
  delete: async (id: string): Promise<void> => { await api(`/api/fleets/${id}`, { method: 'DELETE' }); },
};

export const factionApi = {
  getAll: async (): Promise<FactionInfo[]> => api('/api/factions'),
  create: async (name: string, color: string): Promise<FactionInfo> => api('/api/factions', { method: 'POST', body: JSON.stringify({ name, color }) }),
  update: async (id: string, data: Partial<FactionInfo>): Promise<FactionInfo> => api(`/api/factions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: async (id: string): Promise<void> => { await api(`/api/factions/${id}`, { method: 'DELETE' }); },
};

export const authApi = {
  login: async (username: string, password: string) =>
    api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  changePassword: async (username: string, currentPassword: string, newPassword: string) =>
    api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ username, currentPassword, newPassword }) }),
};

export interface UserPermissions {
  isAdmin: boolean;
  canEditPlanets: boolean;
  canEditSectors: boolean;
  canEditLanes: boolean;
  canEditFleets: boolean;
  canManageFactions: boolean;
  canEditSettlements: boolean;
}

export const adminApi = {
  getUsers: async (username: string, password: string) =>
    api(`/api/admin/users?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`),
  createUser: async (adminUsername: string, adminPassword: string, username: string, password: string, perms: UserPermissions) =>
    api('/api/admin/users', { method: 'POST', body: JSON.stringify({ adminUsername, adminPassword, username, password, ...perms }) }),
  updateUserPermissions: async (adminUsername: string, adminPassword: string, userId: string, perms: UserPermissions) =>
    api(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ adminUsername, adminPassword, ...perms }) }),
  deleteUser: async (adminUsername: string, adminPassword: string, userId: string) =>
    api(`/api/admin/users/${userId}`, { method: 'DELETE', body: JSON.stringify({ adminUsername, adminPassword }) }),
};
