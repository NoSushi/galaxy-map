import { cn } from "@/lib/utils";
import { useMap, Planet, Sector, Fleet, FactionInfo } from '@/lib/data';
import { Search, Map as MapIcon, Route, Orbit, Edit2, Edit3, Settings, LogOut, Hexagon, Plus, Lock, Ship, Compass, Layers, Users, Shield, Trash2, Key, UserPlus } from 'lucide-react';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { authApi, adminApi } from '@/lib/api';

const PlanetAutocomplete = ({ planets, value, onSelect, placeholder }: { planets: Planet[], value: string, onSelect: (id: string) => void, placeholder: string }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedName = planets.find(p => p.id === value)?.name || '';

  const filtered = useMemo(() => {
    if (!query) return planets;
    return planets.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, planets]);

  const handleFocus = () => { setQuery(''); setOpen(true); setHighlightIndex(0); };
  const handleBlur = () => { setTimeout(() => setOpen(false), 150); };

  const selectPlanet = (p: Planet) => {
    onSelect(p.id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); selectPlanet(filtered[highlightIndex]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={open ? query : selectedName}
        onChange={(e) => { setQuery(e.target.value); setHighlightIndex(0); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-black/60 border-primary/20 h-9 text-[11px] uppercase"
        data-testid={`input-planet-${placeholder.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-[#0a0e18]/98 border border-primary/30 rounded-md shadow-2xl backdrop-blur-xl">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className={cn("px-3 py-2 text-[11px] uppercase cursor-pointer transition-colors", i === highlightIndex ? "bg-primary/20 text-primary" : "text-foreground/80 hover:bg-primary/10 hover:text-primary")}
              onMouseDown={(e) => { e.preventDefault(); selectPlanet(p); }}
              onMouseEnter={() => setHighlightIndex(i)}
            >{p.name}</div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div className="absolute z-50 w-full mt-1 bg-[#0a0e18]/98 border border-primary/30 rounded-md shadow-2xl p-3 text-[10px] text-primary/40 uppercase text-center">No matching systems</div>
      )}
    </div>
  );
};

const ToggleSwitch = ({ id, checked, onChange, label, icon }: { id: string, checked: boolean, onChange: (v: boolean) => void, label: string, icon: React.ReactNode }) => (
  <div className="flex items-center space-x-2">
    <Switch id={id} checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary h-4 w-8" />
    <Label htmlFor={id} className={cn("text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 cursor-pointer transition-colors", checked ? "text-primary" : "text-primary/40")}>
      {icon} {label}
    </Label>
  </div>
);

const CompactToggle = ({ id, checked, onChange, label, icon }: { id: string, checked: boolean, onChange: (v: boolean) => void, label: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <Switch id={id} checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary h-3.5 w-7" />
    <Label htmlFor={id} className={cn("flex items-center gap-1 cursor-pointer transition-colors", checked ? "text-primary" : "text-primary/40")}>
      <span className={cn("lg:hidden", checked ? "text-primary" : "text-primary/40")}>{icon}</span>
      <span className={cn("hidden lg:inline text-[9px] uppercase font-bold tracking-widest", checked ? "text-primary" : "text-primary/40")}>{label}</span>
    </Label>
  </div>
);

export const TopBar = () => {
  const { 
    showLanes, setShowLanes,
    showSectors, setShowSectors,
    showLabels, setShowLabels,
    showOverlay, setShowOverlay,
    editMode, setEditMode,
    searchQuery, setSearchQuery,
    filters, setFilters,
    planets, lanes, factionList,
    addPlanet, setSelectedPlanet, addSector, addFleet,
    laneDrawMode, setLaneDrawMode,
    sectorDrawMode, setSectorDrawMode,
    getViewportCenter,
    setTargetedPlanet,
    currentUser, setCurrentUser,
    addFaction, updateFaction, deleteFaction,
  } = useMap();

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isTravelTimeOpen, setIsTravelTimeOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [travelCalc, setTravelCalc] = useState({ start: '', end: '', hyperdrive: '1.0' });

  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  type AdminUser = { id: string; username: string; isAdmin: boolean; canEditPlanets: boolean; canEditSectors: boolean; canEditLanes: boolean; canEditFleets: boolean; canManageFactions: boolean; };
  type Perms = { isAdmin: boolean; canEditPlanets: boolean; canEditSectors: boolean; canEditLanes: boolean; canEditFleets: boolean; canManageFactions: boolean; };
  const emptyPerms: Perms = { isAdmin: false, canEditPlanets: false, canEditSectors: false, canEditLanes: false, canEditFleets: false, canManageFactions: false };

  // Admin panel state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPerms, setNewPerms] = useState<Perms>(emptyPerms);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserPerms, setEditingUserPerms] = useState<Perms>(emptyPerms);
  const [adminError, setAdminError] = useState('');

  // Change password
  const [cpCurrentPassword, setCpCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);

  // Custom faction management
  const [newFactionName, setNewFactionName] = useState('');
  const [newFactionColor, setNewFactionColor] = useState('0 50% 50%');
  const [factionError, setFactionError] = useState('');

  const travelablePlanets = useMemo(() => planets.filter(p => p.travelable !== false), [planets]);

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) return [];
    return planets.filter(p => p.name.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 12);
  }, [searchInput, planets]);

  const handleSearchSelect = (planet: Planet) => {
    setSearchInput(planet.name);
    setSearchQuery('');
    setSearchOpen(false);
    searchRef.current?.blur();
    setSelectedPlanet(planet);
    setTargetedPlanet(planet);
  };

  const travelResult = useMemo(() => {
    if (!travelCalc.start || !travelCalc.end || travelCalc.start === travelCalc.end) return null;
    
    const distBetween = (ax: number, ay: number, bx: number, by: number) =>
      Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

    const travelP = travelablePlanets;
    const adj: Record<string, {node: string, dist: number, laneName: string}[]> = {};
    travelP.forEach(p => adj[p.id] = []);
    const onLanePlanetIds = new Set(lanes.flatMap(l => l.planetIds));

    lanes.forEach(l => {
      const startP = travelP.find(p => p.id === l.planetIds[0]);
      if (!startP) return;
      const endP = l.planetIds[1] ? travelP.find(p => p.id === l.planetIds[1]) : null;
      const isLoop = l.planetIds.length >= 2 && l.planetIds[0] === l.planetIds[1];
      const fullPts: [number, number][] = [[startP.x, startP.y]];
      if (l.pathPoints && l.pathPoints.length > 0) fullPts.push(...l.pathPoints);
      if (endP && !isLoop) fullPts.push([endP.x, endP.y]);
      if (isLoop) fullPts.push([startP.x, startP.y]);
      const allLanePlanetIds = [...new Set(l.planetIds)];
      const endpointIds = new Set([l.planetIds[0], ...(l.planetIds[1] ? [l.planetIds[1]] : [])]);
      const intermediatePlanetIds = allLanePlanetIds.filter(id => !endpointIds.has(id));
      const getPositionAlongPath = (px: number, py: number): number => {
        let cumDist = 0, bestDist = Infinity, bestPos = 0;
        for (let i = 0; i < fullPts.length - 1; i++) {
          const [ax, ay] = fullPts[i], [bx, by] = fullPts[i + 1];
          const segLen = distBetween(ax, ay, bx, by);
          if (segLen === 0) { cumDist += segLen; continue; }
          const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (segLen * segLen)));
          const projX = ax + t * (bx - ax), projY = ay + t * (by - ay);
          const d = distBetween(px, py, projX, projY);
          if (d < bestDist) { bestDist = d; bestPos = cumDist + t * segLen; }
          cumDist += segLen;
        }
        return bestPos;
      };
      const sortedIntermediates = intermediatePlanetIds.map(id => {
        const p = travelP.find(pl => pl.id === id);
        return p ? { id, pos: getPositionAlongPath(p.x, p.y) } : null;
      }).filter(Boolean).sort((a, b) => a!.pos - b!.pos).map(item => item!.id);
      const nodeSequence = [l.planetIds[0], ...sortedIntermediates, ...(endP ? [l.planetIds[1]] : [])];
      const nodeCoords: Record<string, [number, number]> = {};
      travelP.forEach(p => nodeCoords[p.id] = [p.x, p.y]);
      for (let i = 0; i < nodeSequence.length - 1; i++) {
        const fromId = nodeSequence[i], toId = nodeSequence[i + 1];
        if (!nodeCoords[fromId] || !nodeCoords[toId]) continue;
        const [fx, fy] = nodeCoords[fromId], [tx, ty] = nodeCoords[toId];
        const segDist = distBetween(fx, fy, tx, ty);
        if (!adj[fromId]) adj[fromId] = [];
        if (!adj[toId]) adj[toId] = [];
        adj[fromId].push({ node: toId, dist: segDist, laneName: l.name });
        adj[toId].push({ node: fromId, dist: segDist, laneName: l.name });
      }
    });

    const onLanePlanets = travelP.filter(p => onLanePlanetIds.has(p.id));
    travelP.filter(p => !onLanePlanetIds.has(p.id)).forEach(offPlanet => {
      const sorted = onLanePlanets.map(op => ({ id: op.id, dist: distBetween(offPlanet.x, offPlanet.y, op.x, op.y) })).sort((a, b) => a.dist - b.dist).slice(0, 3);
      sorted.forEach(({ id: onId, dist }) => {
        if (!adj[offPlanet.id]) adj[offPlanet.id] = [];
        if (!adj[onId]) adj[onId] = [];
        adj[offPlanet.id].push({ node: onId, dist: dist * 2, laneName: 'Off-Lane Travel' });
        adj[onId].push({ node: offPlanet.id, dist: dist * 2, laneName: 'Off-Lane Travel' });
      });
    });

    const distances: Record<string, number> = {};
    const prev: Record<string, { node: string, laneName: string } | null> = {};
    const pq = new Set(travelP.map(p => p.id));
    travelP.forEach(p => { distances[p.id] = Infinity; prev[p.id] = null; });
    distances[travelCalc.start] = 0;
    while (pq.size > 0) {
      let u = Array.from(pq).reduce((min, node) => distances[node] < distances[min] ? node : min, Array.from(pq)[0]);
      if (distances[u] === Infinity || u === travelCalc.end) break;
      pq.delete(u);
      adj[u]?.forEach(edge => {
        const alt = distances[u] + edge.dist;
        if (alt < distances[edge.node]) { distances[edge.node] = alt; prev[edge.node] = { node: u, laneName: edge.laneName }; }
      });
    }
    if (distances[travelCalc.end] === Infinity) return { error: "No hyperspace route found between these systems." };

    const route: { planetId: string, planetName: string, laneName: string }[] = [];
    let current: string | null = travelCalc.end;
    while (current) {
      const prevEntry = prev[current];
      const planet = travelP.find(p => p.id === current);
      route.unshift({ planetId: current, planetName: planet?.name || 'Unknown', laneName: prevEntry?.laneName || '' });
      current = prevEntry?.node || null;
    }

    const legs: { from: string, to: string, laneName: string }[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const currentLane = route[i + 1].laneName;
      const lastLeg = legs[legs.length - 1];
      if (lastLeg && lastLeg.laneName === currentLane) lastLeg.to = route[i + 1].planetName;
      else legs.push({ from: route[i].planetName, to: route[i + 1].planetName, laneName: currentLane });
    }

    const mapToLy = 120000 / 5000;
    const totalLy = distances[travelCalc.end] * mapToLy;
    const baseSpeed = 111;
    const hdClass = parseFloat(travelCalc.hyperdrive) || 1.0;
    const hours = totalLy / (baseSpeed / hdClass);
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return { distance: Math.round(totalLy), days, hours: remainingHours, totalHours: Math.round(hours), route, legs };
  }, [travelCalc, travelablePlanets, lanes]);

  const handleAdminToggle = () => {
    if (editMode) {
      setEditMode(false);
      setCurrentUser(null);
    } else {
      setIsLoginDialogOpen(true);
    }
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) { setLoginError('Username and password required.'); return; }
    setLoginLoading(true);
    setLoginError('');
    try {
      const user = await authApi.login(loginUsername, loginPassword);
      setCurrentUser({ ...user, password: loginPassword });
      setEditMode(true);
      setIsLoginDialogOpen(false);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Access denied.');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!currentUser?.isAdmin) return;
    try {
      const users = await adminApi.getUsers(currentUser.username, currentUser.password);
      setAdminUsers(users);
    } catch {}
  };

  const handleOpenAdminPanel = () => {
    setIsAdminPanelOpen(true);
    loadAdminUsers();
    setAdminError('');
    setNewUsername('');
    setNewPassword('');
    setNewPerms(emptyPerms);
    setEditingUserId(null);
    setFactionError('');
    setNewFactionName('');
    setNewFactionColor('0 50% 50%');
  };

  const handleCreateUser = async () => {
    if (!currentUser || !newUsername || !newPassword) { setAdminError('Username and password required.'); return; }
    try {
      await adminApi.createUser(currentUser.username, currentUser.password, newUsername, newPassword, newPerms);
      setNewUsername(''); setNewPassword(''); setNewPerms(emptyPerms); setAdminError('');
      loadAdminUsers();
    } catch (err: any) {
      setAdminError(err.message || 'Failed to create user.');
    }
  };

  const startEditUser = (u: AdminUser) => {
    setEditingUserId(u.id);
    setEditingUserPerms({ isAdmin: u.isAdmin, canEditPlanets: u.canEditPlanets, canEditSectors: u.canEditSectors, canEditLanes: u.canEditLanes, canEditFleets: u.canEditFleets, canManageFactions: u.canManageFactions });
    setAdminError('');
  };

  const handleUpdateUserPerms = async () => {
    if (!currentUser || !editingUserId) return;
    try {
      await adminApi.updateUserPermissions(currentUser.username, currentUser.password, editingUserId, editingUserPerms);
      setEditingUserId(null);
      setAdminError('');
      loadAdminUsers();
    } catch (err: any) {
      setAdminError(err.message || 'Failed to update permissions.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser) return;
    try {
      await adminApi.deleteUser(currentUser.username, currentUser.password, userId);
      loadAdminUsers();
    } catch (err: any) {
      setAdminError(err.message || 'Failed to delete user.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;
    setCpError(''); setCpSuccess(false);
    if (!cpCurrentPassword || !cpNewPassword) { setCpError('All fields required.'); return; }
    if (cpNewPassword !== cpConfirmPassword) { setCpError('New passwords do not match.'); return; }
    try {
      await authApi.changePassword(currentUser.username, cpCurrentPassword, cpNewPassword);
      setCurrentUser({ ...currentUser, password: cpNewPassword });
      setCpSuccess(true);
      setCpCurrentPassword(''); setCpNewPassword(''); setCpConfirmPassword('');
    } catch (err: any) {
      setCpError(err.message || 'Failed to change password.');
    }
  };

  const handleAddFaction = async () => {
    if (!newFactionName.trim()) { setFactionError('Faction name required.'); return; }
    try {
      await addFaction(newFactionName.trim(), newFactionColor);
      setNewFactionName(''); setNewFactionColor('0 50% 50%'); setFactionError('');
    } catch (err: any) {
      setFactionError(err.message || 'Failed to add faction.');
    }
  };

  const handleDeleteFaction = async (id: string) => {
    try {
      await deleteFaction(id);
    } catch (err: any) {
      setFactionError(err.message || 'Failed to delete faction.');
    }
  };

  const handleCreatePlanet = () => {
    const center = getViewportCenter();
    const newPlanet: Planet = {
      id: `p${Date.now()}`,
      name: 'Uncharted World',
      x: center.x, y: center.y,
      sectorId: null,
      faction: 'Independent',
      habitable: true,
      environment: 'Unknown',
      description: 'Discovery pending analysis.',
    };
    addPlanet(newPlanet);
    setSelectedPlanet(newPlanet);
  };

  const handleCreateSector = () => {
    const newSector: Sector = {
      id: `s${Date.now()}`,
      name: 'New Sector',
      color: '200 50% 50%',
      points: [[1400, 1000], [1600, 1000], [1600, 1200], [1400, 1200]],
      faction: 'Independent'
    };
    addSector(newSector);
  };

  const handleCreateFleet = () => {
    const center = getViewportCenter();
    const newFleet: Fleet = {
      id: `f${Date.now()}`,
      name: 'Strike Group A',
      x: center.x, y: center.y,
      icon: 'default',
      faction: 'Independent',
      description: 'Fleet awaiting orders.'
    };
    addFleet(newFleet);
  };

  const [editingFactionId, setEditingFactionId] = useState<string | null>(null);
  const [editingFactionName, setEditingFactionName] = useState('');
  const [editingFactionColor, setEditingFactionColor] = useState('');

  const startEditFaction = (f: FactionInfo) => {
    setEditingFactionId(f.id);
    setEditingFactionName(f.name);
    setEditingFactionColor(f.color);
  };

  const cancelEditFaction = () => {
    setEditingFactionId(null);
    setEditingFactionName('');
    setEditingFactionColor('');
  };

  const saveEditFaction = async () => {
    if (!editingFactionId) return;
    try {
      await updateFaction(editingFactionId, { name: editingFactionName, color: editingFactionColor });
      cancelEditFaction();
      setFactionError('');
    } catch (err: any) {
      setFactionError(err.message || 'Failed to update faction.');
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* ── Main bar ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 w-full z-30 glass-panel-primary border-x-0 border-t-0">
        <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">

          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0 group cursor-pointer">
            <Hexagon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-primary glow-text transition-transform group-hover:rotate-90 duration-500" />
            <div className="hidden xs:flex flex-col leading-none">
              <span className="font-display font-black text-sm sm:text-base lg:text-lg leading-none tracking-tighter text-primary glow-text uppercase">GALACTIC</span>
              <span className="hidden sm:block text-[7px] lg:text-[8px] tracking-[0.25em] text-primary/60 uppercase font-bold">ASTROGATION DATABASE</span>
            </div>
          </div>

          {/* Search — grows to fill available space */}
          <div className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm lg:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/40 z-10" />
            <Input
              ref={searchRef}
              placeholder="Search systems..."
              className="pl-8 bg-black/60 border-primary/20 h-8 sm:h-9 font-sans focus-visible:ring-primary text-[10px] sm:text-xs uppercase tracking-wider w-full"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 160)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) handleSearchSelect(searchResults[0]);
                if (e.key === 'Escape') { setSearchOpen(false); setSearchInput(''); setSearchQuery(''); }
              }}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full bg-[#060c1a]/98 border border-primary/30 rounded-md shadow-2xl overflow-hidden backdrop-blur-xl">
                {searchResults.map((p) => (
                  <div key={p.id} className="px-3 py-2 text-[11px] uppercase cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary text-foreground/75 flex items-center gap-2" onMouseDown={(e) => { e.preventDefault(); handleSearchSelect(p); }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: factionList.find(f => f.name === p.faction)?.color ? `hsl(${factionList.find(f => f.name === p.faction)!.color})` : '#4ade80' }} />
                    {p.name}
                    {p.isMinor && <span className="ml-auto text-[9px] text-primary/30 uppercase">Minor</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Faction filter — hidden on mobile, shown md+ */}
          <div className="hidden md:flex items-center shrink-0">
            <Select value={filters.faction} onValueChange={(val) => setFilters({...filters, faction: val})}>
              <SelectTrigger className="w-[130px] lg:w-[150px] h-8 sm:h-9 bg-black/60 border-primary/20 text-[9px] lg:text-[10px] uppercase font-bold tracking-widest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Factions</SelectItem>
                {factionList.map(f => (
                  <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Edit toolbar — icons-only on sm, labels on lg+ */}
          {editMode && (currentUser?.isAdmin || currentUser?.canEditPlanets || currentUser?.canEditSectors || currentUser?.canEditFleets || currentUser?.canEditLanes) && (
            <div className="hidden sm:flex gap-0.5 bg-primary/5 p-0.5 rounded-md border border-primary/10 shrink-0">
              {(currentUser?.isAdmin || currentUser?.canEditPlanets) && (
                <Button variant="ghost" size="sm" onClick={handleCreatePlanet} className="h-7 lg:h-8 text-[9px] font-display text-primary hover:bg-primary/20 px-2 gap-1">
                  <Plus className="w-3 h-3 shrink-0" /><span className="hidden lg:inline">PLANET</span>
                </Button>
              )}
              {(currentUser?.isAdmin || currentUser?.canEditSectors) && (
                <Button variant="ghost" size="sm" onClick={() => setSectorDrawMode(!sectorDrawMode)} className={cn("h-7 lg:h-8 text-[9px] font-display hover:bg-primary/20 px-2 gap-1", sectorDrawMode ? "text-primary bg-primary/20 animate-pulse" : "text-primary")} data-testid="button-add-sector">
                  <MapIcon className="w-3 h-3 shrink-0" /><span className="hidden lg:inline">SECTOR</span>
                </Button>
              )}
              {(currentUser?.isAdmin || currentUser?.canEditFleets) && (
                <Button variant="ghost" size="sm" onClick={handleCreateFleet} className="h-7 lg:h-8 text-[9px] font-display text-primary hover:bg-primary/20 px-2 gap-1">
                  <Ship className="w-3 h-3 shrink-0" /><span className="hidden lg:inline">FLEET</span>
                </Button>
              )}
              {(currentUser?.isAdmin || currentUser?.canEditLanes) && (
                <Button variant="ghost" size="sm" onClick={() => setLaneDrawMode(!laneDrawMode)} className={cn("h-7 lg:h-8 text-[9px] font-display hover:bg-primary/20 px-2 gap-1", laneDrawMode ? "text-primary bg-primary/20 animate-pulse" : "text-primary")} data-testid="button-add-hyperlane">
                  <Route className="w-3 h-3 shrink-0" /><span className="hidden lg:inline">LANE</span>
                </Button>
              )}
            </div>
          )}

          {/* View toggles — icons-only on sm/md, labels on xl+ */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3 bg-black/40 py-1 px-2 lg:px-3 rounded-full border border-primary/10 shrink-0">
            <CompactToggle id="lanes" checked={showLanes} onChange={setShowLanes} icon={<Route className="w-3 h-3" />} label="Routes" />
            <div className="w-px h-3 bg-primary/15" />
            <CompactToggle id="sectors" checked={showSectors} onChange={setShowSectors} icon={<MapIcon className="w-3 h-3" />} label="Sectors" />
            <div className="w-px h-3 bg-primary/15" />
            <CompactToggle id="labels" checked={showLabels} onChange={setShowLabels} icon={<Orbit className="w-3 h-3" />} label="Labels" />
            {editMode && (
              <>
                <div className="w-px h-3 bg-primary/15" />
                <CompactToggle id="overlay" checked={showOverlay} onChange={setShowOverlay} icon={<Layers className="w-3 h-3" />} label="Overlay" />
              </>
            )}
          </div>

          {/* Travel calc — icon on sm/md, label on lg+ */}
          <Button variant="outline" size="sm" onClick={() => setIsTravelTimeOpen(true)} className="hidden sm:flex border-primary/30 text-primary hover:bg-primary/10 gap-1.5 font-display tracking-widest h-8 lg:h-9 px-2 lg:px-3 shrink-0">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline text-[9px]">TRAVEL</span>
          </Button>

          {/* Admin utility buttons (passwd / admin panel) */}
          {editMode && currentUser && (
            <div className="hidden sm:flex gap-1 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setIsChangePasswordOpen(true)} className="border-primary/20 text-primary/70 hover:bg-primary/10 h-8 lg:h-9 w-8 lg:w-9 p-0 flex items-center justify-center" title="Change password">
                <Key className="w-3.5 h-3.5" />
              </Button>
              {currentUser.isAdmin && (
                <Button variant="outline" size="sm" onClick={handleOpenAdminPanel} className="border-primary/20 text-primary/70 hover:bg-primary/10 h-8 lg:h-9 w-8 lg:w-9 p-0 flex items-center justify-center" title="Admin panel">
                  <Shield className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Admin / Logout button */}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={handleAdminToggle}
            className={cn("shrink-0 font-display font-black tracking-widest h-8 lg:h-9 px-2 lg:px-3 gap-1.5 transition-all duration-500 text-[9px] lg:text-[10px]",
              editMode ? "bg-primary text-background shadow-[0_0_15px_hsl(var(--primary)/0.5)]" : "border-primary/30 text-primary hover:bg-primary/10"
            )}
          >
            {editMode ? <LogOut className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
            <span className="hidden sm:inline">{editMode ? "EXIT" : "ADMIN"}</span>
          </Button>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(v => !v)}
            className="sm:hidden h-8 w-8 p-0 text-primary hover:bg-primary/10 shrink-0"
            aria-label="Menu"
          >
            <div className="flex flex-col gap-1 items-center justify-center">
              <span className={cn("block w-4 h-0.5 bg-primary transition-all duration-200", mobileMenuOpen && "rotate-45 translate-y-1.5")} />
              <span className={cn("block w-4 h-0.5 bg-primary transition-all duration-200", mobileMenuOpen && "opacity-0")} />
              <span className={cn("block w-4 h-0.5 bg-primary transition-all duration-200", mobileMenuOpen && "-rotate-45 -translate-y-1.5")} />
            </div>
          </Button>
        </div>

        {/* ── Mobile dropdown menu ───────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-primary/15 bg-black/80 backdrop-blur-xl px-3 py-3 space-y-3">
            {/* Faction filter */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase text-primary/50 font-bold tracking-widest w-14 shrink-0">Faction</span>
              <Select value={filters.faction} onValueChange={(val) => setFilters({...filters, faction: val})}>
                <SelectTrigger className="flex-1 h-8 bg-black/60 border-primary/20 text-[10px] uppercase font-bold tracking-widest"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Factions</SelectItem>
                  {factionList.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* View toggles */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[9px] uppercase text-primary/50 font-bold tracking-widest w-14 shrink-0">View</span>
              <ToggleSwitch id="m-lanes" checked={showLanes} onChange={setShowLanes} label="Routes" icon={<Route className="w-3 h-3" />} />
              <ToggleSwitch id="m-sectors" checked={showSectors} onChange={setShowSectors} label="Sectors" icon={<MapIcon className="w-3 h-3" />} />
              <ToggleSwitch id="m-labels" checked={showLabels} onChange={setShowLabels} label="Labels" icon={<Orbit className="w-3 h-3" />} />
              {editMode && <ToggleSwitch id="m-overlay" checked={showOverlay} onChange={setShowOverlay} label="Overlay" icon={<Layers className="w-3 h-3" />} />}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => { setIsTravelTimeOpen(true); setMobileMenuOpen(false); }} className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 h-8 text-[9px] font-display tracking-widest">
                <Compass className="w-3.5 h-3.5" /> TRAVEL
              </Button>
              {editMode && currentUser && (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setIsChangePasswordOpen(true); setMobileMenuOpen(false); }} className="border-primary/20 text-primary/70 hover:bg-primary/10 gap-1.5 h-8 text-[9px] font-display tracking-widest">
                    <Key className="w-3.5 h-3.5" /> PASSWORD
                  </Button>
                  {currentUser.isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => { handleOpenAdminPanel(); setMobileMenuOpen(false); }} className="border-primary/20 text-primary/70 hover:bg-primary/10 gap-1.5 h-8 text-[9px] font-display tracking-widest">
                      <Shield className="w-3.5 h-3.5" /> ADMIN
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Edit toolbar on mobile */}
            {editMode && (currentUser?.isAdmin || currentUser?.canEditPlanets || currentUser?.canEditSectors || currentUser?.canEditFleets || currentUser?.canEditLanes) && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[9px] uppercase text-primary/50 font-bold tracking-widest w-14 shrink-0">Add</span>
                {(currentUser?.isAdmin || currentUser?.canEditPlanets) && <Button variant="ghost" size="sm" onClick={() => { handleCreatePlanet(); setMobileMenuOpen(false); }} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1 px-2"><Plus className="w-3 h-3" /> Planet</Button>}
                {(currentUser?.isAdmin || currentUser?.canEditSectors) && <Button variant="ghost" size="sm" onClick={() => { setSectorDrawMode(!sectorDrawMode); setMobileMenuOpen(false); }} className={cn("h-8 text-[9px] font-display hover:bg-primary/20 gap-1 px-2", sectorDrawMode ? "text-primary bg-primary/20 animate-pulse" : "text-primary")}><MapIcon className="w-3 h-3" /> Sector</Button>}
                {(currentUser?.isAdmin || currentUser?.canEditFleets) && <Button variant="ghost" size="sm" onClick={() => { handleCreateFleet(); setMobileMenuOpen(false); }} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1 px-2"><Ship className="w-3 h-3" /> Fleet</Button>}
                {(currentUser?.isAdmin || currentUser?.canEditLanes) && <Button variant="ghost" size="sm" onClick={() => { setLaneDrawMode(!laneDrawMode); setMobileMenuOpen(false); }} className={cn("h-8 text-[9px] font-display hover:bg-primary/20 gap-1 px-2", laneDrawMode ? "text-primary bg-primary/20 animate-pulse" : "text-primary")}><Route className="w-3 h-3" /> Lane</Button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Travel Calculator Dialog */}
      <Dialog open={isTravelTimeOpen} onOpenChange={setIsTravelTimeOpen}>
        <DialogContent className="glass-panel-primary border-primary/30 sm:max-w-md bg-[#05080f]/95 backdrop-blur-3xl">
          <DialogHeader className="items-center text-center">
            <Compass className="w-12 h-12 text-primary mb-2 animate-spin-slow" />
            <DialogTitle className="text-primary font-display font-black text-xl tracking-[0.2em]">TRAVEL CALCULATOR</DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] uppercase font-bold tracking-[0.2em]">Astrogation Computer Interface</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-primary/70">Origin Point</Label>
                <PlanetAutocomplete planets={travelablePlanets} value={travelCalc.start} onSelect={(v) => setTravelCalc(prev => ({...prev, start: v}))} placeholder="Type origin system..." />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-primary/70">Destination</Label>
                <PlanetAutocomplete planets={travelablePlanets} value={travelCalc.end} onSelect={(v) => setTravelCalc(prev => ({...prev, end: v}))} placeholder="Type destination..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-primary/70">Hyperdrive Class</Label>
              <div className="flex gap-2">
                <Input type="number" step="0.1" min="0.1" value={travelCalc.hyperdrive} onChange={(e) => setTravelCalc(prev => ({...prev, hyperdrive: e.target.value}))} className="bg-black/60 border-primary/30 text-center font-mono" />
                <div className="flex-1 flex items-center px-4 bg-primary/5 rounded border border-primary/10 text-[10px] text-primary/60 uppercase italic">Lower is faster (0.5 is 2x faster than 1.0)</div>
              </div>
            </div>
            {travelResult && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                {'error' in travelResult ? (
                  <div className="text-destructive text-center text-xs font-bold uppercase tracking-wider">{travelResult.error}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                      <span className="text-[10px] uppercase text-primary/60 font-bold">Distance</span>
                      <span className="text-primary font-display font-bold">{travelResult.distance.toLocaleString()} LY</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                      <span className="text-[10px] uppercase text-primary/60 font-bold">Estimated Time</span>
                      <div className="text-right">
                        <div className="text-primary font-display font-black text-2xl leading-none">{travelResult.days > 0 && <span>{travelResult.days}D </span>}{travelResult.hours}H</div>
                        <div className="text-[9px] text-primary/40 uppercase mt-1">Total {travelResult.totalHours} Hours</div>
                      </div>
                    </div>
                    {travelResult.legs && travelResult.legs.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase text-primary/60 font-bold">Route</div>
                        <div className="space-y-1">
                          {travelResult.legs.map((leg, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 bg-black/30 rounded border border-primary/10">
                              <span className="text-primary font-bold uppercase">{leg.from}</span>
                              <span className="text-primary/40">→</span>
                              <span className="text-primary font-bold uppercase">{leg.to}</span>
                              <span className="ml-auto text-primary/50 italic text-[9px]">via {leg.laneName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsTravelTimeOpen(false)} className="bg-primary text-background font-display font-black tracking-[0.2em] w-full h-12">CLOSE NAV-COMPUTER</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={isLoginDialogOpen} onOpenChange={(o) => { setIsLoginDialogOpen(o); if (!o) { setLoginError(''); setLoginUsername(''); setLoginPassword(''); } }}>
        <DialogContent className="glass-panel-primary border-primary/30 sm:max-w-md bg-[#05080f]/95 backdrop-blur-3xl">
          <DialogHeader className="items-center text-center">
            <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-4 animate-pulse">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-primary font-display font-black text-2xl tracking-[0.2em]">SECURITY OVERRIDE</DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] uppercase font-bold tracking-[0.3em]">Authorized Cartography Personnel Only</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-primary/70">Username</Label>
              <Input
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="bg-black/60 border-primary/30 focus-visible:ring-primary font-mono h-10"
                placeholder="Enter username..."
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-primary/70">Clearance Code</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="bg-black/60 border-primary/30 focus-visible:ring-primary font-mono text-center tracking-[0.5em] h-12 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {loginError && <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] text-center font-bold uppercase tracking-widest">{loginError}</div>}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleLogin} disabled={loginLoading} className="bg-primary text-background font-display font-black tracking-[0.2em] w-full h-12 hover:scale-105 transition-transform">
              {loginLoading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={(o) => { setIsChangePasswordOpen(o); if (!o) { setCpError(''); setCpSuccess(false); setCpCurrentPassword(''); setCpNewPassword(''); setCpConfirmPassword(''); } }}>
        <DialogContent className="glass-panel-primary border-primary/30 sm:max-w-md bg-[#05080f]/95 backdrop-blur-3xl">
          <DialogHeader className="items-center text-center">
            <Key className="w-10 h-10 text-primary mb-2" />
            <DialogTitle className="text-primary font-display font-black text-xl tracking-[0.2em]">CHANGE PASSWORD</DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] uppercase font-bold tracking-[0.2em]">Update your access credentials</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {cpSuccess ? (
              <div className="p-4 bg-green-950/30 border border-green-500/30 text-green-400 text-center text-[11px] font-bold uppercase tracking-widest rounded">Password changed successfully.</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-primary/70">Current Password</Label>
                  <Input type="password" value={cpCurrentPassword} onChange={e => setCpCurrentPassword(e.target.value)} className="bg-black/60 border-primary/30 font-mono h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-primary/70">New Password</Label>
                  <Input type="password" value={cpNewPassword} onChange={e => setCpNewPassword(e.target.value)} className="bg-black/60 border-primary/30 font-mono h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-primary/70">Confirm New Password</Label>
                  <Input type="password" value={cpConfirmPassword} onChange={e => setCpConfirmPassword(e.target.value)} className="bg-black/60 border-primary/30 font-mono h-9" onKeyDown={e => e.key === 'Enter' && handleChangePassword()} />
                </div>
                {cpError && <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] text-center font-bold uppercase tracking-widest">{cpError}</div>}
              </>
            )}
          </div>
          <DialogFooter>
            {!cpSuccess ? (
              <Button onClick={handleChangePassword} className="bg-primary text-background font-display font-black tracking-[0.2em] w-full h-10">UPDATE CREDENTIALS</Button>
            ) : (
              <Button onClick={() => setIsChangePasswordOpen(false)} className="bg-primary text-background font-display font-black tracking-[0.2em] w-full h-10">CLOSE</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Panel Dialog */}
      <Dialog open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen}>
        <DialogContent className="glass-panel-primary border-primary/30 sm:max-w-lg bg-[#05080f]/95 backdrop-blur-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="items-center text-center">
            <Shield className="w-10 h-10 text-primary mb-2" />
            <DialogTitle className="text-primary font-display font-black text-xl tracking-[0.2em]">ADMIN PANEL</DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] uppercase font-bold tracking-[0.2em]">System administration — {currentUser?.username}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* User Management */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-[11px] uppercase font-bold tracking-widest text-primary">User Management</h3>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                {adminUsers.map(u => (
                  <div key={u.id} className="rounded border border-white/10 bg-white/5 overflow-hidden">
                    {editingUserId === u.id ? (
                      <div className="p-2.5 space-y-2">
                        <div className="text-[10px] font-mono text-primary font-bold uppercase mb-1">{u.username} — Permissions</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {([
                            ['isAdmin', 'Full Admin'],
                            ['canEditPlanets', 'Edit Planets'],
                            ['canEditSectors', 'Edit Sectors'],
                            ['canEditLanes', 'Edit Lanes'],
                            ['canEditFleets', 'Edit Fleets'],
                            ['canManageFactions', 'Manage Factions'],
                          ] as [keyof Perms, string][]).map(([key, label]) => (
                            <div key={key} className="flex items-center gap-1.5">
                              <Switch
                                id={`ep-${u.id}-${key}`}
                                checked={editingUserPerms[key]}
                                onCheckedChange={v => setEditingUserPerms(p => ({ ...p, [key]: v }))}
                                className="data-[state=checked]:bg-primary h-3.5 w-7"
                              />
                              <Label htmlFor={`ep-${u.id}-${key}`} className="text-[9px] uppercase text-primary/70 cursor-pointer">{label}</Label>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1 justify-end pt-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)} className="h-6 text-[9px] px-2 text-muted-foreground hover:text-foreground">CANCEL</Button>
                          <Button size="sm" onClick={handleUpdateUserPerms} className="h-6 text-[9px] px-2 bg-primary text-background">SAVE</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", u.isAdmin ? "bg-primary" : "bg-muted-foreground")} />
                          <span className="text-[11px] font-mono truncate">{u.username}</span>
                          {u.isAdmin && <span className="text-[8px] text-primary bg-primary/10 px-1 py-0.5 rounded uppercase font-bold shrink-0">Admin</span>}
                          {!u.isAdmin && (
                            <div className="flex gap-1 flex-wrap">
                              {u.canEditPlanets && <span className="text-[7px] bg-blue-500/15 text-blue-400 px-1 py-0.5 rounded uppercase font-bold">Planets</span>}
                              {u.canEditSectors && <span className="text-[7px] bg-emerald-500/15 text-emerald-400 px-1 py-0.5 rounded uppercase font-bold">Sectors</span>}
                              {u.canEditLanes && <span className="text-[7px] bg-yellow-500/15 text-yellow-400 px-1 py-0.5 rounded uppercase font-bold">Lanes</span>}
                              {u.canEditFleets && <span className="text-[7px] bg-orange-500/15 text-orange-400 px-1 py-0.5 rounded uppercase font-bold">Fleets</span>}
                              {u.canManageFactions && <span className="text-[7px] bg-purple-500/15 text-purple-400 px-1 py-0.5 rounded uppercase font-bold">Factions</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-1">
                          <Button variant="ghost" size="sm" onClick={() => startEditUser(u)} className="h-6 w-6 p-0 text-primary/50 hover:text-primary hover:bg-primary/10" title="Edit permissions">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id)} className="h-6 w-6 p-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10" title="Delete user">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-2 p-3 bg-white/5 rounded border border-white/10">
                <Label className="text-[10px] uppercase text-primary/60">Add New User</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Username" className="bg-black/60 border-primary/20 h-8 text-xs" />
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password" className="bg-black/60 border-primary/20 h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 py-1">
                  {([
                    ['isAdmin', 'Full Admin'],
                    ['canEditPlanets', 'Edit Planets'],
                    ['canEditSectors', 'Edit Sectors'],
                    ['canEditLanes', 'Edit Lanes'],
                    ['canEditFleets', 'Edit Fleets'],
                    ['canManageFactions', 'Manage Factions'],
                  ] as [keyof Perms, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <Switch
                        id={`np-${key}`}
                        checked={newPerms[key]}
                        onCheckedChange={v => setNewPerms(p => ({ ...p, [key]: v }))}
                        className="data-[state=checked]:bg-primary h-3.5 w-7"
                      />
                      <Label htmlFor={`np-${key}`} className="text-[9px] uppercase text-primary/70 cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateUser} size="sm" className="h-8 text-[10px] gap-1.5 font-display">
                    <UserPlus className="w-3 h-3" /> CREATE USER
                  </Button>
                </div>
                {adminError && <div className="text-destructive text-[10px] font-bold uppercase">{adminError}</div>}
              </div>
            </div>

            {/* Faction Management */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary" />
                <h3 className="text-[11px] uppercase font-bold tracking-widest text-primary">Faction Management</h3>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {factionList.map(f => {
                  const isEditing = editingFactionId === f.id;
                  return (
                    <div key={f.id} className="rounded border border-white/10 bg-white/5 overflow-hidden">
                      {isEditing ? (
                        <div className="p-2 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={editingFactionName}
                              onChange={e => setEditingFactionName(e.target.value)}
                              className="bg-black/60 border-primary/20 h-7 text-xs flex-1"
                              onKeyDown={e => { if (e.key === 'Enter') saveEditFaction(); if (e.key === 'Escape') cancelEditFaction(); }}
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingFactionColor}
                              onChange={e => setEditingFactionColor(e.target.value)}
                              placeholder="H S% L%"
                              className="bg-black/60 border-primary/20 h-7 text-xs font-mono flex-1"
                            />
                            <div className="w-7 h-7 rounded border border-white/20 shrink-0" style={{ backgroundColor: `hsl(${editingFactionColor})` }} />
                          </div>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={cancelEditFaction} className="h-6 text-[9px] text-muted-foreground hover:text-foreground px-2">CANCEL</Button>
                            <Button size="sm" onClick={saveEditFaction} className="h-6 text-[9px] px-2 bg-primary text-background">SAVE</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: `hsl(${f.color})` }} />
                            <span className="text-[11px] truncate">{f.name}</span>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button variant="ghost" size="sm" onClick={() => startEditFaction(f)} className="h-6 w-6 p-0 text-primary/50 hover:text-primary hover:bg-primary/10" title="Edit">
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteFaction(f.id)} className="h-6 w-6 p-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10" title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 p-3 bg-white/5 rounded border border-white/10">
                <Label className="text-[10px] uppercase text-primary/60">Add New Faction</Label>
                <div className="flex gap-2">
                  <Input value={newFactionName} onChange={e => setNewFactionName(e.target.value)} placeholder="Faction name" className="bg-black/60 border-primary/20 h-8 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleAddFaction()} />
                </div>
                <div className="flex gap-2 items-center">
                  <Input value={newFactionColor} onChange={e => setNewFactionColor(e.target.value)} placeholder="H S% L%" className="bg-black/60 border-primary/20 h-8 text-xs font-mono flex-1" />
                  <div className="w-8 h-8 rounded border border-white/20 shrink-0" style={{ backgroundColor: `hsl(${newFactionColor})` }} />
                  <Button onClick={handleAddFaction} size="sm" className="h-8 text-[10px] gap-1 font-display shrink-0">
                    <Plus className="w-3 h-3" /> ADD
                  </Button>
                </div>
                {factionError && <div className="text-destructive text-[10px] font-bold uppercase">{factionError}</div>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsAdminPanelOpen(false)} variant="outline" className="border-primary/30 text-primary font-display tracking-widest w-full">CLOSE PANEL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

