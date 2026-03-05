import { cn } from "@/lib/utils";
import { useMap, Planet, Sector, Fleet } from '@/lib/data';
import { Search, Map as MapIcon, Route, Orbit, Edit3, Settings, LogOut, Hexagon, Plus, Lock, Ship, Compass, Layers } from 'lucide-react';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

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
    addPlanet, setSelectedPlanet, addSector, addFleet
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

  // Dijkstra's algorithm for shortest path between planets along lanes
  const travelResult = useMemo(() => {
    if (!travelCalc.start || !travelCalc.end || travelCalc.start === travelCalc.end) return null;
    
    const adj: Record<string, {node: string, dist: number}[]> = {};
    planets.forEach(p => adj[p.id] = []);
    lanes.forEach(l => {
      const p1 = planets.find(p => p.id === l.planetIds[0]);
      const p2 = planets.find(p => p.id === l.planetIds[1]);
      if (p1 && p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        adj[p1.id].push({node: p2.id, dist});
        adj[p2.id].push({node: p1.id, dist});
      }
    });

    const distances: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
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
          prev[edge.node] = u;
        }
      });
    }

    if (distances[travelCalc.end] === Infinity) return { error: "No hyperspace route found between these systems." };

    // 5000x5000 map = 120,000 light years
    const mapToLy = 120000 / 5000;
    const totalLy = distances[travelCalc.end] * mapToLy;
    const baseSpeed = 111; // LY per hour for Class 1
    const hdClass = parseFloat(travelCalc.hyperdrive) || 1.0;
    
    // Time = Distance / (Speed / Class)
    // Class 1 = 111 LY/h
    // Class 0.5 = 222 LY/h (twice as fast)
    // Class 2 = 55.5 LY/h (twice as slow)
    const hours = totalLy / (baseSpeed / hdClass);
    
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);

    return { 
      distance: Math.round(totalLy), 
      days, 
      hours: remainingHours,
      totalHours: Math.round(hours)
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
              <span className="text-[9px] tracking-[0.3em] text-primary/60 uppercase font-bold">NAVIGATIONAL HUB</span>
            </div>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
            <Input 
              placeholder="Query celestial database..." 
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
                <SelectItem value="Sith Empire">Sith Empire</SelectItem>
                <SelectItem value="Hutt Cartel">Hutt Cartel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {editMode && (
            <div className="flex gap-1 bg-primary/5 p-1 rounded-md border border-primary/10">
              <Button variant="ghost" size="sm" onClick={handleCreatePlanet} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1.5"><Plus className="w-3 h-3" /> PLANET</Button>
              <Button variant="ghost" size="sm" onClick={handleCreateSector} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1.5"><MapIcon className="w-3 h-3" /> SECTOR</Button>
              <Button variant="ghost" size="sm" onClick={handleCreateFleet} className="h-8 text-[9px] font-display text-primary hover:bg-primary/20 gap-1.5"><Ship className="w-3 h-3" /> FLEET</Button>
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
                <Select value={travelCalc.start} onValueChange={(v) => setTravelCalc(prev => ({...prev, start: v}))}>
                  <SelectTrigger className="bg-black/60 border-primary/20 text-[10px] uppercase"><SelectValue placeholder="Select Origin" /></SelectTrigger>
                  <SelectContent>
                    {planets.map(p => <SelectItem key={`start-${p.id}`} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-primary/70">Destination</Label>
                <Select value={travelCalc.end} onValueChange={(v) => setTravelCalc(prev => ({...prev, end: v}))}>
                  <SelectTrigger className="bg-black/60 border-primary/20 text-[10px] uppercase"><SelectValue placeholder="Select Dest" /></SelectTrigger>
                  <SelectContent>
                    {planets.map(p => <SelectItem key={`end-${p.id}`} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase text-primary/60 font-bold">Estimated Time</span>
                      <div className="text-right">
                        <div className="text-primary font-display font-black text-2xl leading-none">
                          {travelResult.days > 0 && <span>{travelResult.days}D </span>}
                          {travelResult.hours}H
                        </div>
                        <div className="text-[9px] text-primary/40 uppercase mt-1">Total {travelResult.totalHours} Hours</div>
                      </div>
                    </div>
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
