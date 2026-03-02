import { useMap, Planet, Sector, HyperspaceLane } from '@/lib/data';
import { X, Globe, Map, Route, Edit2, Plus, Settings2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const Sidebar = () => {
  const { 
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    sectors, planets, lanes,
    editMode
  } = useMap();

  const closePanel = () => {
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedLane(null);
  };

  const isOpen = selectedPlanet || selectedSector || selectedLane;

  if (!isOpen) return null;

  return (
    <div className={cn(
      "absolute top-0 right-0 w-80 h-full z-20 glass-panel-primary border-r-0 border-t-0 border-b-0",
      "transform transition-transform duration-300 ease-out flex flex-col",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="p-4 border-b border-primary/20 flex justify-between items-center bg-black/20">
        <h2 className="text-xl font-display text-primary glow-text flex items-center gap-2">
          {selectedPlanet && <><Globe className="w-5 h-5" /> Planet Data</>}
          {selectedSector && <><Map className="w-5 h-5" /> Sector Data</>}
          {selectedLane && <><Route className="w-5 h-5" /> Route Data</>}
        </h2>
        <button onClick={closePanel} className="text-muted-foreground hover:text-primary transition-colors" data-testid="button-close-sidebar">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {selectedPlanet && <PlanetDetails planet={selectedPlanet} editMode={editMode} sectors={sectors} lanes={lanes} planets={planets} />}
        {selectedSector && <SectorDetails sector={selectedSector} editMode={editMode} planets={planets} />}
        {selectedLane && <LaneDetails lane={selectedLane} editMode={editMode} planets={planets} />}
      </div>
    </div>
  );
};

const PlanetDetails = ({ planet, editMode, sectors, lanes, planets }: { planet: Planet, editMode: boolean, sectors: Sector[], lanes: HyperspaceLane[], planets: Planet[] }) => {
  const { updatePlanet } = useMap();
  const sector = sectors.find(s => s.id === planet.sectorId);
  const connectedLanes = lanes.filter(l => l.planetIds.includes(planet.id));

  if (editMode) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="space-y-2">
          <Label>Planet Name</Label>
          <Input 
            value={planet.name} 
            onChange={e => updatePlanet({...planet, name: e.target.value})}
            className="bg-black/40 border-primary/30 focus-visible:ring-primary"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Faction</Label>
          <Select value={planet.faction} onValueChange={(val: any) => updatePlanet({...planet, faction: val})}>
            <SelectTrigger className="bg-black/40 border-primary/30">
              <SelectValue placeholder="Select Faction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Galactic Republic">Galactic Republic</SelectItem>
              <SelectItem value="Sith Empire">Sith Empire</SelectItem>
              <SelectItem value="Independent">Independent</SelectItem>
              <SelectItem value="Hutt Cartel">Hutt Cartel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Environment</Label>
          <Select value={planet.environment} onValueChange={(val: any) => updatePlanet({...planet, environment: val})}>
            <SelectTrigger className="bg-black/40 border-primary/30">
              <SelectValue placeholder="Select Env" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Desert">Desert</SelectItem>
              <SelectItem value="Forest">Forest</SelectItem>
              <SelectItem value="City">City</SelectItem>
              <SelectItem value="Ocean">Ocean</SelectItem>
              <SelectItem value="Volcanic">Volcanic</SelectItem>
              <SelectItem value="Ice">Ice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Switch 
            checked={planet.habitable} 
            onCheckedChange={c => updatePlanet({...planet, habitable: c})}
            id="habitable"
          />
          <Label htmlFor="habitable">Habitable World</Label>
        </div>

        <div className="space-y-2">
          <Label>Population</Label>
          <Input 
            value={planet.population || ''} 
            onChange={e => updatePlanet({...planet, population: e.target.value})}
            className="bg-black/40 border-primary/30"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <textarea 
            className="w-full min-h-[100px] p-2 rounded-md bg-black/40 border border-primary/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={planet.description}
            onChange={e => updatePlanet({...planet, description: e.target.value})}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {planet.image && (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-primary/30 glow-border bg-black/50">
          <img src={planet.image} alt={planet.name} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />
          <h1 className="absolute bottom-4 left-4 text-3xl font-display font-bold glow-text text-white">{planet.name}</h1>
        </div>
      )}
      
      {!planet.image && (
        <h1 className="text-3xl font-display font-bold glow-text text-primary">{planet.name}</h1>
      )}

      <div className="space-y-3">
        <DataRow label="Sector" value={sector?.name || 'Unknown'} />
        <DataRow label="Faction" value={planet.faction} 
          valueClass={planet.faction === 'Sith Empire' ? 'text-destructive' : 'text-primary'} />
        <DataRow label="Environment" value={planet.environment} />
        <DataRow label="Habitable" value={planet.habitable ? 'Yes' : 'No'} />
        {planet.population && <DataRow label="Population" value={planet.population} />}
      </div>

      <div className="pt-4 border-t border-primary/20">
        <h3 className="font-display text-primary/80 mb-2 uppercase tracking-wider text-sm">Databank Entry</h3>
        <p className="text-sm leading-relaxed text-foreground/80">{planet.description}</p>
      </div>

      {connectedLanes.length > 0 && (
        <div className="pt-4 border-t border-primary/20">
          <h3 className="font-display text-primary/80 mb-2 uppercase tracking-wider text-sm">Hyperroutes</h3>
          <ul className="space-y-2">
            {connectedLanes.map(lane => {
              const otherPlanetId = lane.planetIds.find(id => id !== planet.id);
              const otherPlanet = planets.find(p => p.id === otherPlanetId);
              return (
                <li key={lane.id} className="flex items-center gap-2 text-sm">
                  <Route className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground/90">{lane.name}</span>
                  <span className="text-muted-foreground text-xs">to</span>
                  <span className="text-primary">{otherPlanet?.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const SectorDetails = ({ sector, editMode, planets }: { sector: Sector, editMode: boolean, planets: Planet[] }) => {
  const { updateSector } = useMap();
  const sectorPlanets = planets.filter(p => p.sectorId === sector.id);

  if (editMode) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Sector Name</Label>
          <Input 
            value={sector.name} 
            onChange={e => updateSector({...sector, name: e.target.value})}
            className="bg-black/40 border-primary/30"
          />
        </div>
        <div className="space-y-2">
          <Label>Color (HSL H S% L%)</Label>
          <Input 
            value={sector.color} 
            onChange={e => updateSector({...sector, color: e.target.value})}
            className="bg-black/40 border-primary/30"
            placeholder="e.g. 190 90% 50%"
          />
          <div className="w-full h-8 rounded mt-1" style={{ backgroundColor: `hsl(${sector.color})` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold" style={{ color: `hsl(${sector.color})`, textShadow: `0 0 10px hsl(${sector.color}/0.5)` }}>
        {sector.name}
      </h1>
      
      <div className="space-y-3">
        <DataRow label="Controlling Faction" value={sector.faction} />
        <DataRow label="System Count" value={sectorPlanets.length.toString()} />
      </div>

      <div className="pt-4 border-t border-primary/20">
        <h3 className="font-display text-primary/80 mb-2 uppercase tracking-wider text-sm">Known Systems</h3>
        {sectorPlanets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chartered systems in this sector.</p>
        ) : (
          <ul className="space-y-1">
            {sectorPlanets.map(p => (
              <li key={p.id} className="text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const LaneDetails = ({ lane, editMode, planets }: { lane: HyperspaceLane, editMode: boolean, planets: Planet[] }) => {
  const p1 = planets.find(p => p.id === lane.planetIds[0]);
  const p2 = planets.find(p => p.id === lane.planetIds[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Route className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold glow-text text-primary">{lane.name}</h1>
      </div>
      
      <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
        <DataRow label="Route Class" value={lane.type} 
          valueClass={lane.type === 'Dangerous' ? 'text-destructive' : ''} />
        
        <div className="pt-2 mt-2 border-t border-white/10">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Terminals</div>
          <div className="flex justify-between items-center">
            <span className="text-primary font-medium">{p1?.name || 'Unknown'}</span>
            <span className="text-muted-foreground text-xs">⟷</span>
            <span className="text-primary font-medium">{p2?.name || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataRow = ({ label, value, valueClass }: { label: string, value: string, valueClass?: string }) => (
  <div className="flex justify-between items-end border-b border-white/5 pb-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn("text-sm font-medium text-foreground", valueClass)}>{value}</span>
  </div>
);
