import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMap, Planet, Sector, HyperspaceLane, Fleet, FactionInfo, Settlement, SettlementSize, SETTLEMENT_STATS } from '@/lib/data';
import { X, Globe, Map, Route, Edit2, Plus, Settings2, Search, Ship, Crown, Trash2, Lock, Unlock, Move, Eye, EyeOff, Layers2, Swords, ExternalLink, Building2, Shield, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

function TheatreButton({ planetId, variant = "inline" }: { planetId: string; variant?: "inline" | "panel" }) {
  const [, navigate] = useLocation();
  if (variant === "panel") {
    return (
      <button
        onClick={() => navigate(`/theatre/${planetId}`)}
        className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-display uppercase tracking-widest border border-destructive/60 text-destructive bg-destructive/10 hover:bg-destructive/25 active:bg-destructive/40 transition-colors rounded"
        title="Open System Theatre Map"
      >
        <Swords className="w-3.5 h-3.5" />
        Open Theatre Map
        <ExternalLink className="w-3 h-3 opacity-60" />
      </button>
    );
  }
  return (
    <button
      onClick={() => navigate(`/theatre/${planetId}`)}
      className="flex items-center gap-1 px-2 py-1 text-[9px] font-display uppercase tracking-widest border border-destructive/50 text-destructive hover:bg-destructive/20 transition-colors rounded"
      title="View System Theatre Map"
    >
      <ExternalLink className="w-3 h-3" />
      THEATRE
    </button>
  );
}

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

// ─── Major Settlements ────────────────────────────────────────────────────────

const SETTLEMENT_SIZES: SettlementSize[] = ['Outpost', 'Village', 'Town', 'City'];

function TierBar({ value, max = 4 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, idx) => idx + 1).map(i => (
        <div key={i} className={cn(
          "h-1.5 w-4 rounded-sm",
          i <= value ? "bg-primary" : "bg-white/10"
        )} />
      ))}
    </div>
  );
}

function SettlementCard({ s }: { s: Settlement }) {
  return (
    <div className="p-2.5 rounded border border-white/10 bg-white/5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-display font-bold text-foreground uppercase tracking-wider truncate">{s.name}</span>
        </div>
        <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded uppercase font-bold shrink-0">{s.size}</span>
      </div>
      {s.holder && (
        <div className="flex justify-between gap-2 text-[9px]">
          <span className="uppercase text-primary/50 tracking-widest shrink-0">Settlement Holder</span>
          <span className="text-foreground/80 text-right">{s.holder}</span>
        </div>
      )}
      {s.exports && (
        <div className="flex justify-between gap-2 text-[9px]">
          <span className="uppercase text-primary/50 tracking-widest shrink-0">Major Exports</span>
          <span className="text-foreground/80 text-right">{s.exports}</span>
        </div>
      )}
      <div className="space-y-1.5 pt-0.5">
        {SETTLEMENT_STATS.map(stat => {
          const v = (s as any)[stat.key] as number;
          if (!v || v <= 0) return null;
          return (
            <div key={stat.key} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[8px] uppercase text-primary/50 tracking-widest">{stat.label}</div>
                <div className="text-[9px] text-foreground/80">{stat.tiers[Math.min(v, stat.tiers.length) - 1]}</div>
              </div>
              <TierBar value={Math.min(v, stat.tiers.length)} max={stat.tiers.length} />
            </div>
          );
        })}
      </div>
      <div className={cn(
        "flex items-center gap-1.5 pt-1 border-t border-white/5 text-[9px] uppercase tracking-widest font-bold",
        s.shieldGenerator ? "text-green-400" : "text-muted-foreground"
      )}>
        {s.shieldGenerator ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
        {s.shieldGenerator ? 'Shield Generator Active' : 'No Shield Generator'}
      </div>
    </div>
  );
}

function SettlementsEditor({ planet }: { planet: Planet }) {
  const { updatePlanet } = useMap();
  const settlements = planet.settlements || [];
  const [openId, setOpenId] = useState<string | null>(null);

  const save = (next: Settlement[]) => updatePlanet({ ...planet, settlements: next }, { settlements: next });
  const patch = (id: string, upd: Partial<Settlement>) =>
    save(settlements.map(s => s.id === id ? { ...s, ...upd } : s));

  const addSettlement = () => {
    const s: Settlement = {
      id: `stl-${Date.now()}`, name: 'New Settlement', size: 'Outpost', exports: '',
      administration: 0, defenses: 0, communications: 0, infrastructure: 0, portSize: 0, medical: 0,
      shieldGenerator: false,
    };
    save([...settlements, s]);
    setOpenId(s.id);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase text-primary/70">Major Settlements</Label>
        <Button variant="ghost" size="sm" onClick={addSettlement} className="h-6 text-[9px] text-primary hover:bg-primary/10 gap-1">
          <Plus className="w-3 h-3" /> ADD
        </Button>
      </div>
      {settlements.length === 0 && (
        <p className="text-[9px] text-muted-foreground italic">No major settlements recorded.</p>
      )}
      {settlements.map(s => (
        <div key={s.id} className="rounded border border-white/10 bg-white/5 overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-2 text-left hover:bg-white/5"
            onClick={() => setOpenId(openId === s.id ? null : s.id)}
          >
            <span className="text-[10px] font-display font-bold uppercase tracking-wider truncate">{s.name}</span>
            <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded uppercase font-bold shrink-0">{s.size}</span>
          </button>
          {openId === s.id && (
            <div className="p-2 pt-0 space-y-2.5">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-primary/70">Settlement Name</Label>
                <Input value={s.name} onChange={e => patch(s.id, { name: e.target.value })} className="bg-black/60 border-primary/20 h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-primary/70">Settlement Size</Label>
                <Select value={s.size} onValueChange={(v: SettlementSize) => patch(s.id, { size: v })}>
                  <SelectTrigger className="bg-black/60 border-primary/20 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETTLEMENT_SIZES.map(sz => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-primary/70">Settlement Holder</Label>
                <Input value={s.holder || ''} onChange={e => patch(s.id, { holder: e.target.value })} className="bg-black/60 border-primary/20 h-7 text-xs" placeholder="Who runs this settlement" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase text-primary/70">Major Exports</Label>
                <Input value={s.exports} onChange={e => patch(s.id, { exports: e.target.value })} className="bg-black/60 border-primary/20 h-7 text-xs" placeholder="e.g. Tibanna gas, durasteel" />
              </div>
              {SETTLEMENT_STATS.map(stat => {
                const v = (s as any)[stat.key] as number;
                return (
                  <div key={stat.key} className="space-y-0.5">
                    <div className="flex justify-between items-baseline">
                      <Label className="text-[9px] uppercase text-primary/70">{stat.label}</Label>
                      <span className="text-[9px] text-foreground/70">{v > 0 ? stat.tiers[Math.min(v, stat.tiers.length) - 1] : 'None'}</span>
                    </div>
                    <input
                      type="range" min={0} max={stat.tiers.length} step={1} value={Math.min(v, stat.tiers.length)}
                      onChange={e => patch(s.id, { [stat.key]: Number(e.target.value) } as Partial<Settlement>)}
                      className="w-full accent-[hsl(var(--primary))]"
                    />
                  </div>
                );
              })}
              <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className={cn("w-3.5 h-3.5", s.shieldGenerator ? "text-green-400" : "text-muted-foreground")} />
                  <Label className="text-xs">Shield Generator</Label>
                </div>
                <Switch checked={s.shieldGenerator} onCheckedChange={c => patch(s.id, { shieldGenerator: c })} />
              </div>
              <Button variant="ghost" size="sm"
                onClick={() => save(settlements.filter(x => x.id !== s.id))}
                className="w-full h-6 text-[9px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-1">
                <Trash2 className="w-3 h-3" /> DELETE SETTLEMENT
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

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
  const { updatePlanet, deletePlanet, setSelectedPlanet, unlockedPlanetIds, unlockPlanet, lockPlanet, currentUser } = useMap();
  const sector = sectors.find(s => s.id === planet.sectorId);
  const connectedLanes = lanes.filter(l => l.planetIds.includes(planet.id));
  const isUnlocked = unlockedPlanetIds.has(planet.id);
  const canFullEdit = !!(currentUser?.isAdmin || currentUser?.canEditPlanets);
  const canEditSettlements = canFullEdit || !!currentUser?.canEditSettlements;

  // Settlement administrators see ONLY the settlements editor in edit mode
  if (editMode && !canFullEdit && canEditSettlements) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] uppercase text-primary/70">{planet.name} — Settlements</Label>
        </div>
        <SettlementsEditor planet={planet} />
      </div>
    );
  }

  if (editMode && canFullEdit) {
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

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase text-primary/70">Label Display</Label>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'normal', label: 'Normal', icon: <Eye className="w-3 h-3" /> },
              { value: 'top',    label: 'Always Top', icon: <Layers2 className="w-3 h-3" /> },
              { value: 'hover',  label: 'Hover Only', icon: <EyeOff className="w-3 h-3" /> },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => updatePlanet({...planet, labelMode: opt.value})}
                className={cn(
                  "flex flex-col items-center gap-1 p-1.5 rounded border text-[9px] font-display uppercase tracking-widest transition-all",
                  (planet.labelMode || 'normal') === opt.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-primary/70"
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
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

        <div className={cn("flex items-center justify-between p-2 rounded border", planet.isWarzone ? "bg-red-950/30 border-destructive/50" : "bg-white/5 border-white/10")}>
          <div className="flex items-center gap-2">
            <Swords className={cn("w-3.5 h-3.5", planet.isWarzone ? "text-destructive" : "text-muted-foreground")} />
            <div>
              <Label htmlFor="is-warzone" className="text-xs">Active Warzone</Label>
              <p className="text-[9px] text-muted-foreground">Enables System Theatre Map</p>
            </div>
          </div>
          <Switch checked={planet.isWarzone || false} onCheckedChange={c => updatePlanet({...planet, isWarzone: c})} id="is-warzone" />
        </div>

        {planet.isWarzone && (
          <TheatreButton planetId={planet.id} variant="panel" />
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

        <SettlementsEditor planet={planet} />
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

      {planet.isWarzone && (
        <div className="flex items-center justify-between p-2.5 rounded border border-destructive/50 bg-red-950/30 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Swords className="w-3.5 h-3.5 text-destructive" />
            <div>
              <span className="text-[10px] font-display font-bold text-destructive uppercase tracking-widest">Active Warzone</span>
              <p className="text-[9px] text-destructive/60">System under active military conflict</p>
            </div>
          </div>
          <TheatreButton planetId={planet.id} />
        </div>
      )}

      <div className="space-y-2 bg-black/40 p-3 rounded border border-white/5 shadow-2xl">
        <DataRow label="Sector" value={sector?.name || 'Unknown'} />
        <DataRow label="Political Affiliation" value={planet.faction} valueClass={planet.faction === 'Empire' ? 'text-destructive' : 'text-primary'} />
        <DataRow label="Primary Biome" value={planet.environment} />
        <DataRow label="Habitable" value={planet.habitable ? 'Yes' : 'No'} valueClass={planet.habitable ? 'text-green-400' : 'text-red-400'} />
        {planet.oversector && <DataRow label="Oversector" value={planet.oversector} />}
        {planet.population && <DataRow label="Citizenry" value={planet.population} />}
      </div>

      {(planet.settlements?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-[10px] text-primary/60 uppercase tracking-[0.2em]">Major Settlements</h3>
          <div className="space-y-2">
            {planet.settlements!.map(s => <SettlementCard key={s.id} s={s} />)}
          </div>
        </div>
      )}

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
  const { updateSector, deleteSector, currentUser } = useMap();
  const sectorPlanets = planets.filter(p => 
    p.sectorId === sector.id || (sector.points.length >= 3 && pointInPolygon(p.x, p.y, sector.points))
  );

  if (editMode && (currentUser?.isAdmin || currentUser?.canEditSectors)) {
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
  const { updateLane, deleteLane, setSelectedPlanet, setSelectedLane, currentUser } = useMap();
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

  if (editMode && (currentUser?.isAdmin || currentUser?.canEditLanes)) {
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
  const { updateFleet, deleteFleet, currentUser } = useMap();
  if (editMode && (currentUser?.isAdmin || currentUser?.canEditFleets)) {
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

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase text-primary/70">Label Display</Label>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'normal', label: 'Normal',     icon: <Eye className="w-3 h-3" /> },
              { value: 'top',    label: 'Always Top', icon: <Layers2 className="w-3 h-3" /> },
              { value: 'hover',  label: 'Hover Only', icon: <EyeOff className="w-3 h-3" /> },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => updateFleet({...fleet, labelMode: opt.value})}
                className={cn(
                  "flex flex-col items-center gap-1 p-1.5 rounded border text-[9px] font-display uppercase tracking-widest transition-all",
                  (fleet.labelMode || 'normal') === opt.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-primary/70"
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
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
