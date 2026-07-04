import { useState } from 'react';
import { useMap, Planet, Sector, HyperspaceLane, Fleet, FactionInfo } from '@/lib/data';
import { X, Globe, Map, Route, Edit2, Plus, Settings2, Search, Ship, Crown, Trash2, Lock, Unlock, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const ENV_IMAGES: Record<string, string> = {
  'Desert': '/planet-desert.webp',
  'Forest': '/planet-forest.webp',
  'City': '/planet-city.webp',
  'Volcanic': '/planet-desert.webp',
  'Icy': '/planet-desert.webp',
  'Arid': '/planet-desert.webp',
  'Barren': '/planet-desert.webp',
  'Oceanic': '/planet-forest.webp',
  'Swamp': '/planet-forest.webp',
  'Tropical': '/planet-forest.webp',
  'Gaseous': '/planet-desert.webp',
  'Mountainous': '/planet-desert.webp',
  'Unknown': '/planet-desert.webp',
};

const getDefaultPlanetImage = (environment: string) => ENV_IMAGES[environment] || '/planet-desert.webp';

const pointInPolygon = (x: number, y: number, polygon: [number, number][]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const FactionSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { factionList } = useMap();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-black/60 border-primary/20 h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {factionList.map(f => (
          <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const Sidebar = () => {
  const { 
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    selectedFleet, setSelectedFleet,
    sectors, planets, lanes, fleets,
    editMode
  } = useMap();

  const closePanel = () => {
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const isOpen = selectedPlanet || selectedSector || selectedLane || selectedFleet;

  if (!isOpen) return null;

  return (
    <div className={cn(
      "absolute top-16 right-0 w-85 h-[calc(100%-4rem)] z-20 glass-panel-primary border-l border-primary/20",
      "transform transition-transform duration-300 ease-out flex flex-col",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="p-4 border-b border-primary/20 flex justify-between items-center bg-black/40">
        <h2 className="text-lg font-display text-primary glow-text flex items-center gap-2 uppercase tracking-tighter">
          {selectedPlanet && <><Globe className="w-4 h-4" /> System Hub</>}
          {selectedSector && <><Map className="w-4 h-4" /> Sector Nav</>}
          {selectedLane && <><Route className="w-4 h-4" /> Hyperroute</>}
          {selectedFleet && <><Ship className="w-4 h-4" /> Fleet Command</>}
        </h2>
        <button onClick={closePanel} className="text-muted-foreground hover:text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-black/20">
        {selectedPlanet && <PlanetDetails planet={selectedPlanet} editMode={editMode} sectors={sectors} lanes={lanes} planets={planets} />}
        {selectedSector && <SectorDetails sector={selectedSector} editMode={editMode} planets={planets} />}
        {selectedLane && <LaneDetails lane={selectedLane} editMode={editMode} planets={planets} />}
        {selectedFleet && <FleetDetails fleet={selectedFleet} editMode={editMode} />}
      </div>
    </div>
  );
};

const PlanetDetails = ({ planet, editMode, sectors, lanes, planets }: { planet: Planet, editMode: boolean, sectors: Sector[], lanes: HyperspaceLane[], planets: Planet[] }) => {
  const { updatePlanet, deletePlanet, setSelectedPlanet, unlockedPlanetIds, unlockPlanet, lockPlanet } = useMap();
  const sector = sectors.find(s => s.id === planet.sectorId);
  const connectedLanes = lanes.filter(l => l.planetIds.includes(planet.id));
  const isUnlocked = unlockedPlanetIds.has(planet.id);

  if (editMode) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] uppercase text-primary/70">Planet Settings</Label>
          <Button variant="ghost" size="sm" onClick={() => deletePlanet(planet.id)} className="h-6 text-[9px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1"><Trash2 className="w-3 h-3" /> DELETE</Button>
        </div>

        {/* Planet Lock / Move control */}
        <div className="flex items-center justify-between p-2 rounded border bg-amber-950/20 border-amber-500/30">
          <div className="flex items-center gap-2">
            {isUnlocked ? <Unlock className="w-4 h-4 text-amber-400" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
            <div>
              <Label className="text-xs">{isUnlocked ? 'Position Unlocked' : 'Position Locked'}</Label>
              <p className="text-[9px] text-muted-foreground">{isUnlocked ? 'Drag planet to reposition, then lock.' : 'Unlock to drag and reposition.'}</p>
            </div>
          </div>
          <Button
            variant={isUnlocked ? "default" : "outline"}
            size="sm"
            onClick={() => isUnlocked ? lockPlanet(planet.id) : unlockPlanet(planet.id)}
            className={cn("h-7 text-[9px] gap-1", isUnlocked ? "bg-amber-500 hover:bg-amber-600 text-black" : "border-amber-500/40 text-amber-400 hover:bg-amber-950/40")}
            data-testid="button-planet-lock"
          >
            {isUnlocked ? <><Lock className="w-3 h-3" /> LOCK</> : <><Move className="w-3 h-3" /> MOVE</>}
          </Button>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Planet Name</Label>
          <Input value={planet.name} onChange={e => updatePlanet({...planet, name: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-primary/70">Faction</Label>
            <FactionSelect value={planet.faction} onChange={val => updatePlanet({...planet, faction: val})} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-primary/70">Environment</Label>
            <Select value={planet.environment} onValueChange={(val: any) => updatePlanet({...planet, environment: val})}>
              <SelectTrigger className="bg-black/60 border-primary/20 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Desert">Desert</SelectItem>
                <SelectItem value="Forest">Forest</SelectItem>
                <SelectItem value="City">City</SelectItem>
                <SelectItem value="Volcanic">Volcanic</SelectItem>
                <SelectItem value="Icy">Icy</SelectItem>
                <SelectItem value="Arid">Arid</SelectItem>
                <SelectItem value="Barren">Barren</SelectItem>
                <SelectItem value="Oceanic">Oceanic</SelectItem>
                <SelectItem value="Swamp">Swamp</SelectItem>
                <SelectItem value="Tropical">Tropical</SelectItem>
                <SelectItem value="Gaseous">Gaseous</SelectItem>
                <SelectItem value="Mountainous">Mountainous</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <Crown className={cn("w-4 h-4", planet.isCapital ? "text-yellow-400" : "text-muted-foreground")} />
            <Label htmlFor="is-capital" className="text-xs">Galactic Capital</Label>
          </div>
          <Switch checked={planet.isCapital || false} onCheckedChange={c => updatePlanet({...planet, isCapital: c})} id="is-capital" />
        </div>

        {planet.isCapital && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-primary/70">Capital Of</Label>
            <Input value={planet.capitalOf || ''} onChange={e => updatePlanet({...planet, capitalOf: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" placeholder="e.g. Galactic Empire" />
          </div>
        )}

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <Globe className={cn("w-4 h-4", planet.habitable ? "text-green-400" : "text-muted-foreground")} />
            <Label htmlFor="is-habitable" className="text-xs">Habitable</Label>
          </div>
          <Switch checked={planet.habitable} onCheckedChange={c => updatePlanet({...planet, habitable: c})} id="is-habitable" />
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <Globe className={cn("w-3 h-3", planet.isMinor ? "text-muted-foreground" : "text-primary")} />
            <Label htmlFor="is-minor" className="text-xs">Minor Planet</Label>
          </div>
          <Switch checked={planet.isMinor || false} onCheckedChange={c => updatePlanet({...planet, isMinor: c})} id="is-minor" />
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <Route className={cn("w-3 h-3", planet.travelable !== false ? "text-primary" : "text-muted-foreground")} />
            <div>
              <Label htmlFor="is-travelable" className="text-xs">Travelable</Label>
              <p className="text-[9px] text-muted-foreground">Allow in travel calculator</p>
            </div>
          </div>
          <Switch checked={planet.travelable !== false} onCheckedChange={c => updatePlanet({...planet, travelable: c})} id="is-travelable" />
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <Crown className={cn("w-3.5 h-3.5", planet.isPowerbaseCapital ? "text-amber-500" : "text-muted-foreground")} />
            <Label htmlFor="is-powerbase" className="text-xs">Powerbase Capital</Label>
          </div>
          <Switch checked={planet.isPowerbaseCapital || false} onCheckedChange={c => updatePlanet({...planet, isPowerbaseCapital: c})} id="is-powerbase" />
        </div>

        {planet.isPowerbaseCapital && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-primary/70">Powerbase Of</Label>
            <Input value={planet.powerbaseOf || ''} onChange={e => updatePlanet({...planet, powerbaseOf: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" placeholder="e.g. Darth Malgus" />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Oversector</Label>
          <Input value={planet.oversector || ''} onChange={e => updatePlanet({...planet, oversector: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" placeholder="e.g. Oversector Outer" />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Marker URL (PNG/WebP)</Label>
          <Input value={planet.markerImage || ''} onChange={e => updatePlanet({...planet, markerImage: e.target.value.trim() || null})} className="bg-black/60 border-primary/20 h-8 text-xs" />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Hub Display Image URL</Label>
          <Input value={planet.image || ''} onChange={e => updatePlanet({...planet, image: e.target.value || null})} className="bg-black/60 border-primary/20 h-8 text-xs" placeholder="Leave blank for environment default" />
          {planet.image && (
            <div className="mt-1 aspect-video rounded overflow-hidden border border-primary/20">
              <img src={planet.image} className="w-full h-full object-cover opacity-80" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Description</Label>
          <textarea className="w-full min-h-[80px] p-2 rounded bg-black/60 border border-primary/20 text-xs text-foreground/80" value={planet.description} onChange={e => updatePlanet({...planet, description: e.target.value})} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="relative group">
        <div className="aspect-square rounded border border-primary/30 glow-border bg-black/80 overflow-hidden">
          <img src={planet.image || getDefaultPlanetImage(planet.environment)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <h1 className="text-2xl font-display font-black text-white glow-text uppercase leading-none tracking-tighter">{planet.name}</h1>
            {planet.isCapital && <div className="text-[10px] text-yellow-400 font-display flex items-center gap-1 mt-1 uppercase tracking-widest"><Crown className="w-3 h-3" /> Capital of {planet.capitalOf}</div>}
            {planet.isPowerbaseCapital && <div className="text-[10px] text-amber-500 font-display flex items-center gap-1 mt-0.5 uppercase tracking-widest"><Crown className="w-2.5 h-2.5" /> Powerbase of {planet.powerbaseOf}</div>}
          </div>
        </div>
      </div>

      <div className="space-y-2 bg-black/40 p-3 rounded border border-white/5 shadow-2xl">
        <DataRow label="Sector" value={sector?.name || 'Unknown'} />
        <DataRow label="Political Affiliation" value={planet.faction} valueClass={planet.faction === 'Empire' ? 'text-destructive' : 'text-primary'} />
        <DataRow label="Primary Biome" value={planet.environment} />
        <DataRow label="Habitable" value={planet.habitable ? 'Yes' : 'No'} valueClass={planet.habitable ? 'text-green-400' : 'text-red-400'} />
        {planet.oversector && <DataRow label="Oversector" value={planet.oversector} />}
        {planet.population && <DataRow label="Citizenry" value={planet.population} />}
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-[10px] text-primary/60 uppercase tracking-[0.2em]">Databank Record</h3>
        <p className="text-xs leading-relaxed text-foreground/70 italic">"{planet.description}"</p>
      </div>

      {connectedLanes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-[10px] text-primary/60 uppercase tracking-[0.2em]">Active Hyperroutes</h3>
          <div className="grid grid-cols-1 gap-1">
            {connectedLanes.map(lane => {
              const other = planets.find(p => p.id === lane.planetIds.find(id => id !== planet.id));
              return (
                <div key={lane.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setSelectedPlanet(other || null)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1 h-1 rounded-full", lane.type === 'Major' ? "bg-primary" : "bg-muted-foreground")} />
                    <span className="text-[10px] text-foreground/80">{lane.name}</span>
                  </div>
                  <span className="text-[9px] text-primary uppercase font-bold">{other?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SectorDetails = ({ sector, editMode, planets }: { sector: Sector, editMode: boolean, planets: Planet[] }) => {
  const { updateSector, deleteSector } = useMap();
  const sectorPlanets = planets.filter(p => 
    p.sectorId === sector.id || (sector.points.length >= 3 && pointInPolygon(p.x, p.y, sector.points))
  );

  if (editMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] uppercase text-primary/70">Sector Settings</Label>
          <Button variant="ghost" size="sm" onClick={() => deleteSector(sector.id)} className="h-6 text-[9px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1"><Trash2 className="w-3 h-3" /> DELETE</Button>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Sector Designation</Label>
          <Input value={sector.name} onChange={e => updateSector({...sector, name: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Color Code (H S% L%)</Label>
          <Input value={sector.color} onChange={e => updateSector({...sector, color: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs font-mono" />
          <div className="w-full h-10 rounded mt-1 border border-white/10" style={{ backgroundColor: `hsl(${sector.color})` }} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Admin Faction</Label>
          <FactionSelect value={sector.faction} onChange={val => updateSector({...sector, faction: val})} />
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ background: 'repeating-linear-gradient(45deg, hsl(0 75% 50% / 0.4), hsl(0 75% 50% / 0.4) 3px, hsl(210 80% 55% / 0.4) 3px, hsl(210 80% 55% / 0.4) 6px)' }} />
            <Label htmlFor="is-contested" className="text-xs">Contested Zone</Label>
          </div>
          <Switch checked={sector.isContested || false} onCheckedChange={c => updateSector({...sector, isContested: c})} id="is-contested" />
        </div>

        {sector.isContested && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-primary/70">Faction 1</Label>
              <FactionSelect value={sector.contestedFaction1 || ''} onChange={val => updateSector({...sector, contestedFaction1: val})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-primary/70">Faction 2</Label>
              <FactionSelect value={sector.contestedFaction2 || ''} onChange={val => updateSector({...sector, contestedFaction2: val})} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-black/40 rounded border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: `hsl(${sector.color})` }} />
        <h1 className="text-xl font-display font-black uppercase tracking-tighter mb-1" style={{ color: `hsl(${sector.color})` }}>{sector.name}</h1>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
          <span>Authority: {sector.faction}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{sectorPlanets.length} {sectorPlanets.length === 1 ? 'Planet' : 'Planets'}</span>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-[10px] text-primary/60 uppercase tracking-[0.2em]">Chartered Systems</h3>
        <div className="grid grid-cols-2 gap-1">
          {sectorPlanets.map(p => (
            <div key={p.id} className="p-2 bg-white/5 rounded border border-white/5 text-[10px] text-foreground/80 hover:bg-white/10 transition-colors text-center uppercase tracking-tighter">{p.name}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LaneDetails = ({ lane, editMode, planets }: { lane: HyperspaceLane, editMode: boolean, planets: Planet[] }) => {
  const [lanePlanetSearch, setLanePlanetSearch] = useState('');
  const { updateLane, deleteLane, setSelectedPlanet, setSelectedLane } = useMap();
  const p1 = planets.find(p => p.id === lane.planetIds[0]);
  const p2 = planets.find(p => p.id === lane.planetIds[1]);
  const isLoop = lane.planetIds.length >= 2 && lane.planetIds[0] === lane.planetIds[1];

  const endpointIds = lane.planetIds.slice(0, 2);
  const intermediatePlanetIds = lane.planetIds.slice(2);

  const routePlanets = (() => {
    const startPlanet = p1;
    const endPlanet = p2 && !isLoop ? p2 : null;
    const intermediates = [...new Set(intermediatePlanetIds)]
      .map(id => planets.find(p => p.id === id))
      .filter(Boolean) as Planet[];

    if (!startPlanet) return intermediates;

    const fullPath: [number, number][] = [[startPlanet.x, startPlanet.y]];
    if (lane.pathPoints && lane.pathPoints.length > 0) {
      fullPath.push(...(lane.pathPoints as [number, number][]));
    }
    if (endPlanet) fullPath.push([endPlanet.x, endPlanet.y]);
    if (isLoop && startPlanet) fullPath.push([startPlanet.x, startPlanet.y]);

    const getPositionAlongPath = (px: number, py: number): number => {
      let cumDist = 0;
      let bestDist = Infinity;
      let bestPos = 0;
      for (let i = 0; i < fullPath.length - 1; i++) {
        const [ax, ay] = fullPath[i];
        const [bx, by] = fullPath[i + 1];
        const segLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
        if (segLen === 0) continue;
        const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (segLen * segLen)));
        const projX = ax + t * (bx - ax);
        const projY = ay + t * (by - ay);
        const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
        if (d < bestDist) {
          bestDist = d;
          bestPos = cumDist + t * segLen;
        }
        cumDist += segLen;
      }
      return bestPos;
    };

    const sorted = intermediates
      .map(p => ({ planet: p, pos: getPositionAlongPath(p.x, p.y) }))
      .sort((a, b) => a.pos - b.pos)
      .map(item => item.planet);

    const result: Planet[] = [];
    if (startPlanet) result.push(startPlanet);
    result.push(...sorted);
    if (endPlanet && endPlanet.id !== startPlanet?.id) result.push(endPlanet);
    return result;
  })();
  const availablePlanets = planets.filter(p => !lane.planetIds.includes(p.id));

  const removePlanetFromLane = (planetId: string) => {
    const newPlanetIds = [...endpointIds, ...intermediatePlanetIds.filter(id => id !== planetId)];
    updateLane({ ...lane, planetIds: newPlanetIds });
  };

  const addPlanetToLane = (planetId: string) => {
    const newPlanetIds = [...lane.planetIds, planetId];
    updateLane({ ...lane, planetIds: newPlanetIds });
  };

  if (editMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] uppercase text-primary/70">Route Settings</Label>
          <Button variant="ghost" size="sm" onClick={() => deleteLane(lane.id)} className="h-6 text-[9px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1"><Trash2 className="w-3 h-3" /> DELETE</Button>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Route Designation</Label>
          <Input value={lane.name} onChange={e => updateLane({...lane, name: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Route Classification</Label>
          <Select value={lane.type} onValueChange={(val: any) => updateLane({...lane, type: val})}>
            <SelectTrigger className="bg-black/60 border-primary/20 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Major">Major</SelectItem>
              <SelectItem value="Minor">Minor</SelectItem>
              <SelectItem value="Dangerous">Dangerous</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase text-primary/70">Associated Planets</Label>
          <div className="space-y-1">
            {routePlanets.map(planet => {
              const isEndpoint = endpointIds.includes(planet.id);
              return (
                <div key={planet.id} className="flex items-center justify-between p-1.5 bg-white/5 rounded border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", planet.faction === 'Empire' ? "bg-destructive" : "bg-primary")} />
                    <span className="text-[11px] font-display uppercase tracking-wider">{planet.name}</span>
                    {isEndpoint && <span className="text-[8px] text-muted-foreground bg-white/10 px-1 rounded">ENDPOINT</span>}
                  </div>
                  {!isEndpoint && (
                    <button onClick={() => removePlanetFromLane(planet.id)} className="w-5 h-5 flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded transition-colors" data-testid={`remove-lane-planet-${planet.id}`}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {availablePlanets.length > 0 && (
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  value={lanePlanetSearch}
                  onChange={e => setLanePlanetSearch(e.target.value)}
                  placeholder="Search planets to add..."
                  className="bg-black/60 border-primary/20 h-8 text-xs pl-7"
                  data-testid="lane-planet-search"
                />
              </div>
              <div className="max-h-32 overflow-y-auto rounded border border-white/10 bg-black/40">
                {availablePlanets
                  .filter(p => p.name.toLowerCase().includes(lanePlanetSearch.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => { addPlanetToLane(p.id); setLanePlanetSearch(''); }}
                      className="w-full text-left px-2 py-1.5 text-[11px] font-display uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center gap-2"
                      data-testid={`add-lane-planet-${p.id}`}
                    >
                      <div className={cn("w-2 h-2 rounded-full", p.faction === 'Empire' ? "bg-destructive" : "bg-primary")} />
                      {p.name}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-black/40 rounded border border-white/5 shadow-2xl relative">
        <h1 className="text-xl font-display font-black text-primary uppercase tracking-tighter mb-1">{lane.name}</h1>
        <div className="text-[10px] text-muted-foreground uppercase font-bold">Grade: {lane.type} Route</div>
      </div>
      <div className="flex items-center justify-between p-4 bg-white/5 rounded border border-white/5">
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground uppercase mb-1">{isLoop ? 'Origin' : 'Terminal A'}</div>
          <div className="text-xs font-bold text-primary">{p1?.name}</div>
        </div>
        <div className="text-primary/30 flex-1 flex justify-center"><Route className="w-4 h-4" /></div>
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground uppercase mb-1">{isLoop ? 'Loop' : 'Terminal B'}</div>
          <div className="text-xs font-bold text-primary">{isLoop ? p1?.name : (p2?.name || 'Open Space')}</div>
        </div>
      </div>

      {routePlanets.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-[10px] text-primary/60 uppercase tracking-[0.2em]">Route Order ({routePlanets.length} systems)</h3>
          <div className="grid grid-cols-1 gap-0">
            {routePlanets.map((planet, idx) => {
              const isEndpoint = endpointIds.includes(planet.id);
              const isFirst = idx === 0;
              const isLast = idx === routePlanets.length - 1;
              return (
                <div key={planet.id} className="flex items-stretch">
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div className={cn("w-0.5 flex-1", isFirst ? "bg-transparent" : "bg-primary/30")} />
                    <div className={cn("w-3 h-3 rounded-full shrink-0 border-2", isEndpoint ? "bg-primary border-primary" : "bg-background border-primary/50")} />
                    <div className={cn("w-0.5 flex-1", isLast ? "bg-transparent" : "bg-primary/30")} />
                  </div>
                  <div
                    className="flex items-center justify-between flex-1 py-1.5 pl-2 pr-2 hover:bg-white/5 transition-colors cursor-pointer rounded"
                    onClick={() => { setSelectedLane(null); setSelectedPlanet(planet); }}
                    data-testid={`lane-planet-${planet.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display uppercase tracking-wider">{planet.name}</span>
                      {isEndpoint && <span className="text-[8px] text-muted-foreground bg-white/10 px-1 rounded">TERMINAL</span>}
                    </div>
                    <span className="text-[9px] text-muted-foreground uppercase">{planet.faction}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FleetDetails = ({ fleet, editMode }: { fleet: Fleet, editMode: boolean }) => {
  const { updateFleet, deleteFleet } = useMap();
  if (editMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] uppercase text-primary/70">Fleet Settings</Label>
          <Button variant="ghost" size="sm" onClick={() => deleteFleet(fleet.id)} className="h-6 text-[9px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1"><Trash2 className="w-3 h-3" /> DELETE</Button>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Fleet ID</Label>
          <Input value={fleet.name} onChange={e => updateFleet({...fleet, name: e.target.value})} className="bg-black/60 border-primary/20 h-8 text-xs" />
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
          <div className="flex items-center gap-2">
            <Crown className={cn("w-4 h-4", fleet.isCapitalShip ? "text-primary" : "text-muted-foreground")} />
            <Label htmlFor="is-capital-ship" className="text-xs">Flagship / Capital Ship</Label>
          </div>
          <Switch checked={fleet.isCapitalShip || false} onCheckedChange={c => updateFleet({...fleet, isCapitalShip: c})} id="is-capital-ship" />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Ship Image URL</Label>
          <Input value={fleet.markerImage || ''} onChange={e => updateFleet({...fleet, markerImage: e.target.value.trim() || null})} className="bg-black/60 border-primary/20 h-8 text-xs" placeholder="e.g. /star-destroyer.png" />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Faction Command</Label>
          <FactionSelect value={fleet.faction} onChange={val => updateFleet({...fleet, faction: val})} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-primary/70">Tactical Notes</Label>
          <textarea className="w-full min-h-[80px] p-2 rounded bg-black/60 border border-primary/20 text-xs text-foreground/80" value={fleet.description} onChange={e => updateFleet({...fleet, description: e.target.value})} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-black/40 rounded border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Ship className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-black text-white glow-text uppercase tracking-tighter">{fleet.name}</h1>
        </div>
        <div className="text-[10px] text-primary uppercase font-bold tracking-widest">{fleet.faction} Commanding</div>
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-[10px] text-primary/60 uppercase tracking-[0.2em]">Operational Status</h3>
        <p className="text-xs text-foreground/70">{fleet.description || 'No specific mission logs available.'}</p>
      </div>
    </div>
  );
};

const DataRow = ({ label, value, valueClass }: { label: string, value: string, valueClass?: string }) => (
  <div className="flex justify-between items-end border-b border-white/5 pb-1">
    <span className="text-[9px] uppercase text-muted-foreground font-bold tracking-widest">{label}</span>
    <span className={cn("text-[10px] font-bold text-foreground", valueClass)}>{value}</span>
  </div>
);
