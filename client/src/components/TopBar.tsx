import { cn } from "@/lib/utils";
import { useMap, Planet, Sector, Fleet, FactionInfo } from '@/lib/data';
import { Search, Map as MapIcon, Route, Orbit, Edit3, Settings, LogOut, Hexagon, Plus, Lock, Ship, Compass, Layers, Users, Shield, Trash2, Key, UserPlus } from 'lucide-react';
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
    addFaction, deleteFaction,
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

  // Admin panel state
  const [adminUsers, setAdminUsers] = useState<{id: string, username: string, isAdmin: boolean}[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
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
    setNewIsAdmin(false);
    setFactionError('');
    setNewFactionName('');
    setNewFactionColor('0 50% 50%');
  };

  const handleCreateUser = async () => {
    if (!currentUser || !newUsername || !newPassword) { setAdminError('Username and password required.'); return; }
    try {
      await adminApi.createUser(currentUser.username, currentUser.password, newUsername, newPassword, newIsAdmin);
      setNewUsername(''); setNewPassword(''); setNewIsAdmin(false); setAdminError('');
      loadAdminUsers();
    } catch (err: any) {
      setAdminError(err.message || 'Failed to create user.');
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

  const BUILTIN_FACTION_IDS = ['f-republic', 'f-empire', 'f-hutt', 'f-chiss', 'f-independent'];

  return (
    <>
      <div className="absolute top-0 left-0 w-full z-10 glass-panel-primary border-x-0 border-t-0 p-3 flex justify-between items-center px-6">
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4 group cursor-pointer">
            <Hexagon className="w-10 h-10 text-primary glow-text transition-transform group-hover:rotate-90 duration-500" />
            <div className="flex flex-col">
              <h1 className="font-display font-black text-xl leading-none tracking-tighter text-primary glow-text uppercase">GALACTIC</h1>
              <span className="text-[9px] tracking-[0.3em] text-primary/60 uppercase font-bold">ASTROGATION DATABASE</span>
            </div>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 z-10" />
            <Input
              ref={searchRef}
              placeholder="Query Astrogation Database..."
              className="pl-9 bg-black/60 border-primary/20 h-9 font-sans focus-visible:ring-primary text-xs uppercase tracking-wider"
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

          <div className="flex items-center gap-2 ml-2 border-l border-primary/10 pl-4">
            <Select value={filters.faction} onValueChange={(val) => setFilters({...filters, faction: val})}>
              <SelectTrigger className="w-[150px] h-9 bg-black/60 border-primary/20 text-[10px] uppercase font-bold tracking-widest"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Factions</SelectItem>
                {factionList.map(f => (
                  <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {editMode && (
            <div className="flex gap-1 bg-primary/5 p-1 rounded-md border border-primary/10">
              <Button variant="ghost" size="sm" onClick={handleCreatePlanet} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1.5"><Plus className="w-3 h-3" /> PLANET</Button>
              <Button variant="ghost" size="sm" onClick={() => setSectorDrawMode(!sectorDrawMode)} className={cn("h-8 text-[9px] font-display hover:bg-primary/20 gap-1.5", sectorDrawMode ? "text-primary bg-primary/20 animate-pulse" : "text-primary")} data-testid="button-add-sector"><MapIcon className="w-3 h-3" /> SECTOR</Button>
              <Button variant="ghost" size="sm" onClick={handleCreateFleet} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1.5"><Ship className="w-3 h-3" /> FLEET</Button>
              <Button variant="ghost" size="sm" onClick={() => setLaneDrawMode(!laneDrawMode)} className={cn("h-8 text-[9px] font-display hover:bg-primary/20 gap-1.5", laneDrawMode ? "text-primary bg-primary/20 animate-pulse" : "text-primary")} data-testid="button-add-hyperlane"><Route className="w-3 h-3" /> HYPERLANE</Button>
            </div>
          )}

          <div className="flex items-center gap-4 bg-black/40 p-1.5 px-4 rounded-full border border-primary/10">
            <ToggleSwitch id="lanes" checked={showLanes} onChange={setShowLanes} label="Routes" icon={<Route className="w-3 h-3" />} />
            <div className="w-px h-4 bg-primary/10" />
            <ToggleSwitch id="sectors" checked={showSectors} onChange={setShowSectors} label="Regions" icon={<MapIcon className="w-3 h-3" />} />
            <div className="w-px h-4 bg-primary/10" />
            <ToggleSwitch id="labels" checked={showLabels} onChange={setShowLabels} label="Tags" icon={<Orbit className="w-3 h-3" />} />
            {editMode && (
              <>
                <div className="w-px h-4 bg-primary/10" />
                <ToggleSwitch id="overlay" checked={showOverlay} onChange={setShowOverlay} label="Overlay" icon={<Layers className="w-3 h-3" />} />
              </>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => setIsTravelTimeOpen(true)} className="border-primary/30 text-primary hover:bg-primary/10 gap-2 font-display tracking-widest">
            <Compass className="w-4 h-4" /> CALCULATE TRAVEL
          </Button>

          {editMode && currentUser && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsChangePasswordOpen(true)} className="border-primary/20 text-primary/70 hover:bg-primary/10 gap-1.5 font-display tracking-widest h-9 px-3">
                <Key className="w-3.5 h-3.5" /> PASSWD
              </Button>
              {currentUser.isAdmin && (
                <Button variant="outline" size="sm" onClick={handleOpenAdminPanel} className="border-primary/20 text-primary/70 hover:bg-primary/10 gap-1.5 font-display tracking-widest h-9 px-3">
                  <Shield className="w-3.5 h-3.5" /> ADMIN
                </Button>
              )}
            </div>
          )}

          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={handleAdminToggle}
            className={cn("font-display font-black tracking-widest h-9 px-4 gap-2 transition-all duration-500",
              editMode ? "bg-primary text-background hover:scale-105 shadow-[0_0_20px_hsl(var(--primary)/0.6)]" : "border-primary/30 text-primary hover:bg-primary/10"
            )}
          >
            {editMode ? <LogOut className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {editMode ? "LOGOUT" : "ADMIN"}
          </Button>
        </div>
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
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {adminUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", u.isAdmin ? "bg-primary" : "bg-muted-foreground")} />
                      <span className="text-[11px] font-mono">{u.username}</span>
                      {u.isAdmin && <span className="text-[8px] text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-bold">Admin</span>}
                    </div>
                    {u.id !== currentUser?.id && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id)} className="h-6 text-[9px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-1">
                        <Trash2 className="w-3 h-3" />
                      </Button>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={newIsAdmin} onCheckedChange={setNewIsAdmin} id="new-is-admin" />
                    <Label htmlFor="new-is-admin" className="text-[10px] text-primary/70">Admin privileges</Label>
                  </div>
                  <Button onClick={handleCreateUser} size="sm" className="h-8 text-[10px] gap-1.5 font-display">
                    <UserPlus className="w-3 h-3" /> CREATE USER
                  </Button>
                </div>
                {adminError && <div className="text-destructive text-[10px] font-bold uppercase">{adminError}</div>}
              </div>
            </div>

            {/* Custom Faction Management */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-primary/20 pb-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary" />
                <h3 className="text-[11px] uppercase font-bold tracking-widest text-primary">Faction Management</h3>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {factionList.map(f => {
                  const isBuiltin = BUILTIN_FACTION_IDS.includes(f.id);
                  return (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: `hsl(${f.color})` }} />
                        <span className="text-[11px]">{f.name}</span>
                        {isBuiltin && <span className="text-[8px] text-muted-foreground bg-white/10 px-1 rounded uppercase">Built-in</span>}
                      </div>
                      {!isBuiltin && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteFaction(f.id)} className="h-6 text-[9px] text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 p-3 bg-white/5 rounded border border-white/10">
                <Label className="text-[10px] uppercase text-primary/60">Add Custom Faction</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={newFactionName} onChange={e => setNewFactionName(e.target.value)} placeholder="Faction name" className="bg-black/60 border-primary/20 h-8 text-xs" />
                  <div className="flex gap-2 items-center">
                    <Input value={newFactionColor} onChange={e => setNewFactionColor(e.target.value)} placeholder="H S% L%" className="bg-black/60 border-primary/20 h-8 text-xs font-mono flex-1" />
                    <div className="w-8 h-8 rounded border border-white/20 shrink-0" style={{ backgroundColor: `hsl(${newFactionColor})` }} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddFaction} size="sm" className="h-8 text-[10px] gap-1.5 font-display">
                    <Plus className="w-3 h-3" /> ADD FACTION
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

const ToggleSwitch = ({ id, checked, onChange, label, icon }: { id: string, checked: boolean, onChange: (v: boolean) => void, label: string, icon: React.ReactNode }) => (
  <div className="flex items-center space-x-2">
    <Switch id={id} checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary h-4 w-8" />
    <Label htmlFor={id} className={cn("text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 cursor-pointer transition-colors", checked ? "text-primary" : "text-primary/40")}>
      {icon} {label}
    </Label>
  </div>
);
