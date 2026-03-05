import { cn } from "@/lib/utils";
import { useMap, Planet, Sector, Fleet } from '@/lib/data';
import { Search, Map as MapIcon, Route, Orbit, Edit3, Settings, LogOut, Hexagon, Plus, Lock, Ship, Compass, Layers } from 'lucide-react';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState, useMemo, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

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

  const handleFocus = () => {
    setQuery('');
    setOpen(true);
    setHighlightIndex(0);
  };

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  const selectPlanet = (p: Planet) => {
    onSelect(p.id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      selectPlanet(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
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
              className={cn(
                "px-3 py-2 text-[11px] uppercase cursor-pointer transition-colors",
                i === highlightIndex ? "bg-primary/20 text-primary" : "text-foreground/80 hover:bg-primary/10 hover:text-primary"
              )}
              onMouseDown={(e) => { e.preventDefault(); selectPlanet(p); }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div className="absolute z-50 w-full mt-1 bg-[#0a0e18]/98 border border-primary/30 rounded-md shadow-2xl p-3 text-[10px] text-primary/40 uppercase text-center">
          No matching systems
        </div>
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
    planets, lanes,
    addPlanet, setSelectedPlanet, addSector, addFleet,
    laneDrawMode, setLaneDrawMode,
    sectorDrawMode, setSectorDrawMode
  } = useMap();

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isTravelTimeOpen, setIsTravelTimeOpen] = useState(false);
  const [travelCalc, setTravelCalc] = useState({
    start: '',
    end: '',
    hyperdrive: '1.0'
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const travelResult = useMemo(() => {
    if (!travelCalc.start || !travelCalc.end || travelCalc.start === travelCalc.end) return null;
    
    const PASS_THROUGH_RADIUS = 50;
    
    const distBetween = (ax: number, ay: number, bx: number, by: number) =>
      Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

    const adj: Record<string, {node: string, dist: number, laneName: string}[]> = {};
    planets.forEach(p => adj[p.id] = []);

    lanes.forEach(l => {
      const startP = planets.find(p => p.id === l.planetIds[0]);
      if (!startP) return;
      const endP = l.planetIds[1] ? planets.find(p => p.id === l.planetIds[1]) : null;

      const fullPts: [number, number][] = [[startP.x, startP.y]];
      if (l.pathPoints && l.pathPoints.length > 0) fullPts.push(...l.pathPoints);
      if (endP) fullPts.push([endP.x, endP.y]);

      const passThroughPlanets: {planetId: string, segIndex: number}[] = [];
      for (let seg = 0; seg < fullPts.length - 1; seg++) {
        const [ax, ay] = fullPts[seg];
        const [bx, by] = fullPts[seg + 1];
        planets.forEach(planet => {
          if (planet.id === l.planetIds[0]) return;
          if (endP && planet.id === l.planetIds[1]) return;
          const segLen = distBetween(ax, ay, bx, by);
          if (segLen === 0) return;
          const t = Math.max(0, Math.min(1, ((planet.x - ax) * (bx - ax) + (planet.y - ay) * (by - ay)) / (segLen * segLen)));
          const projX = ax + t * (bx - ax);
          const projY = ay + t * (by - ay);
          const d = distBetween(planet.x, planet.y, projX, projY);
          if (d < PASS_THROUGH_RADIUS) {
            if (!passThroughPlanets.find(pp => pp.planetId === planet.id)) {
              passThroughPlanets.push({ planetId: planet.id, segIndex: seg });
            }
          }
        });
      }

      passThroughPlanets.sort((a, b) => {
        if (a.segIndex !== b.segIndex) return a.segIndex - b.segIndex;
        const pa = planets.find(p => p.id === a.planetId)!;
        const pb = planets.find(p => p.id === b.planetId)!;
        const startPt = fullPts[a.segIndex];
        return distBetween(startPt[0], startPt[1], pa.x, pa.y) - distBetween(startPt[0], startPt[1], pb.x, pb.y);
      });

      const nodeSequence = [l.planetIds[0]];
      passThroughPlanets.forEach(pp => nodeSequence.push(pp.planetId));
      if (endP) nodeSequence.push(l.planetIds[1]);

      const nodeCoords: Record<string, [number, number]> = {};
      planets.forEach(p => nodeCoords[p.id] = [p.x, p.y]);

      for (let i = 0; i < nodeSequence.length - 1; i++) {
        const fromId = nodeSequence[i];
        const toId = nodeSequence[i + 1];
        const [fx, fy] = nodeCoords[fromId];
        const [tx, ty] = nodeCoords[toId];
        const segDist = distBetween(fx, fy, tx, ty);
        
        if (!adj[fromId]) adj[fromId] = [];
        if (!adj[toId]) adj[toId] = [];
        adj[fromId].push({ node: toId, dist: segDist, laneName: l.name });
        adj[toId].push({ node: fromId, dist: segDist, laneName: l.name });
      }
    });

    const distances: Record<string, number> = {};
    const prev: Record<string, { node: string, laneName: string } | null> = {};
    const pq = new Set(planets.map(p => p.id));
    
    planets.forEach(p => {
      distances[p.id] = Infinity;
      prev[p.id] = null;
    });
    distances[travelCalc.start] = 0;

    while (pq.size > 0) {
      let u = Array.from(pq).reduce((min, node) => 
        distances[node] < distances[min] ? node : min, Array.from(pq)[0]);
      
      if (distances[u] === Infinity || u === travelCalc.end) break;
      pq.delete(u);

      adj[u]?.forEach(edge => {
        const alt = distances[u] + edge.dist;
        if (alt < distances[edge.node]) {
          distances[edge.node] = alt;
          prev[edge.node] = { node: u, laneName: edge.laneName };
        }
      });
    }

    if (distances[travelCalc.end] === Infinity) return { error: "No hyperspace route found between these systems." };

    const route: { planetId: string, planetName: string, laneName: string }[] = [];
    let current: string | null = travelCalc.end;
    while (current) {
      const prevEntry = prev[current];
      const planet = planets.find(p => p.id === current);
      route.unshift({
        planetId: current,
        planetName: planet?.name || 'Unknown',
        laneName: prevEntry?.laneName || ''
      });
      current = prevEntry?.node || null;
    }

    const legs: { from: string, to: string, laneName: string }[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const currentLane = route[i + 1].laneName;
      const lastLeg = legs[legs.length - 1];
      if (lastLeg && lastLeg.laneName === currentLane) {
        lastLeg.to = route[i + 1].planetName;
      } else {
        legs.push({
          from: route[i].planetName,
          to: route[i + 1].planetName,
          laneName: currentLane
        });
      }
    }

    const mapToLy = 120000 / 5000;
    const totalLy = distances[travelCalc.end] * mapToLy;
    const baseSpeed = 111;
    const hdClass = parseFloat(travelCalc.hyperdrive) || 1.0;
    const hours = totalLy / (baseSpeed / hdClass);
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);

    return { 
      distance: Math.round(totalLy), 
      days, 
      hours: remainingHours,
      totalHours: Math.round(hours),
      route,
      legs
    };
  }, [travelCalc, planets, lanes]);

  const handleAdminToggle = () => {
    if (editMode) {
      setEditMode(false);
    } else {
      setIsPasswordDialogOpen(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === 'admin123') { 
      setEditMode(true);
      setIsPasswordDialogOpen(false);
      setPassword('');
      setError('');
    } else {
      setError('Access denied. Level 5 clearance required.');
    }
  };

  const handleCreatePlanet = () => {
    const newPlanet: Planet = {
      id: `p${Date.now()}`,
      name: 'Uncharted World',
      x: 1500,
      y: 1125,
      sectorId: 's1',
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
    const newFleet: Fleet = {
      id: `f${Date.now()}`,
      name: 'Strike Group A',
      x: 1500,
      y: 1125,
      icon: 'default',
      faction: 'Independent',
      description: 'Fleet awaiting orders.'
    };
    addFleet(newFleet);
  };

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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
            <Input 
              placeholder="Query Astrogation Database..." 
              className="pl-9 bg-black/60 border-primary/20 h-9 font-sans focus-visible:ring-primary text-xs uppercase tracking-wider"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 ml-2 border-l border-primary/10 pl-4">
            <Select value={filters.faction} onValueChange={(val) => setFilters({...filters, faction: val})}>
              <SelectTrigger className="w-[150px] h-9 bg-black/60 border-primary/20 text-[10px] uppercase font-bold tracking-widest"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Factions</SelectItem>
                <SelectItem value="Galactic Republic">The Republic</SelectItem>
                <SelectItem value="Empire">Empire</SelectItem>
                <SelectItem value="Hutt Cartel">Hutt Cartel</SelectItem>
                <SelectItem value="Chiss Ascendancy">Chiss</SelectItem>
                <SelectItem value="Independent">Independent</SelectItem>
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

          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsTravelTimeOpen(true)}
            className="border-primary/30 text-primary hover:bg-primary/10 gap-2 font-display tracking-widest"
          >
            <Compass className="w-4 h-4" /> CALCULATE TRAVEL
          </Button>

          <Button 
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={handleAdminToggle}
            className={cn(
              "font-display font-black tracking-widest h-9 px-4 gap-2 transition-all duration-500",
              editMode ? "bg-primary text-background hover:scale-105 shadow-[0_0_20px_hsl(var(--primary)/0.6)]" : "border-primary/30 text-primary hover:bg-primary/10"
            )}
          >
            {editMode ? <LogOut className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {editMode ? "LOGOUT" : "ADMIN"}
          </Button>
        </div>
      </div>

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
                <PlanetAutocomplete
                  planets={planets}
                  value={travelCalc.start}
                  onSelect={(v) => setTravelCalc(prev => ({...prev, start: v}))}
                  placeholder="Type origin system..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-primary/70">Destination</Label>
                <PlanetAutocomplete
                  planets={planets}
                  value={travelCalc.end}
                  onSelect={(v) => setTravelCalc(prev => ({...prev, end: v}))}
                  placeholder="Type destination..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-primary/70">Hyperdrive Class</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" step="0.1" min="0.1"
                  value={travelCalc.hyperdrive}
                  onChange={(e) => setTravelCalc(prev => ({...prev, hyperdrive: e.target.value}))}
                  className="bg-black/60 border-primary/30 text-center font-mono"
                />
                <div className="flex-1 flex items-center px-4 bg-primary/5 rounded border border-primary/10 text-[10px] text-primary/60 uppercase italic">
                  Lower is faster (0.5 is 2x faster than 1.0)
                </div>
              </div>
            </div>

            {travelResult && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                {'error' in travelResult ? (
                  <div className="text-destructive text-center text-xs font-bold uppercase tracking-wider">{travelResult.error}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                      <span className="text-[10px] uppercase text-primary/60 font-bold">Total Distance</span>
                      <span className="text-primary font-display font-bold">{travelResult.distance.toLocaleString()} LY</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                      <span className="text-[10px] uppercase text-primary/60 font-bold">Estimated Time</span>
                      <div className="text-right">
                        <div className="text-primary font-display font-black text-2xl leading-none">
                          {travelResult.days > 0 && <span>{travelResult.days}D </span>}
                          {travelResult.hours}H
                        </div>
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

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
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
              <Label className="text-[10px] uppercase tracking-widest text-primary/70">Clearance Code</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/60 border-primary/30 focus-visible:ring-primary font-mono text-center tracking-[0.5em] h-12 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
            </div>
            {error && <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] text-center font-bold uppercase tracking-widest animate-shake">{error}</div>}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handlePasswordSubmit} className="bg-primary text-background font-display font-black tracking-[0.2em] w-full h-12 hover:scale-105 transition-transform">VERIFY IDENTITY</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ToggleSwitch = ({ id, checked, onChange, label, icon }: { id: string, checked: boolean, onChange: (v: boolean) => void, label: string, icon: React.ReactNode }) => (
  <div className="flex items-center space-x-2">
    <Switch 
      id={id} 
      checked={checked} 
      onCheckedChange={onChange} 
      className="data-[state=checked]:bg-primary h-4 w-8"
    />
    <Label htmlFor={id} className={cn("text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 cursor-pointer transition-colors", checked ? "text-primary" : "text-primary/40")}>
      {icon} {label}
    </Label>
  </div>
);
