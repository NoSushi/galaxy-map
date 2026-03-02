import { cn } from "@/lib/utils";
import { useMap, Planet } from '@/lib/data';
import { Search, Map as MapIcon, Route, Orbit, Edit3, Settings, LogOut, Hexagon, Plus, Lock } from 'lucide-react';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

export const TopBar = () => {
  const { 
    showLanes, setShowLanes,
    showSectors, setShowSectors,
    showLabels, setShowLabels,
    editMode, setEditMode,
    searchQuery, setSearchQuery,
    filters, setFilters,
    addPlanet, setSelectedPlanet
  } = useMap();

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminToggle = () => {
    if (editMode) {
      setEditMode(false);
    } else {
      setIsPasswordDialogOpen(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === 'admin123') { // Simple mockup password
      setEditMode(true);
      setIsPasswordDialogOpen(false);
      setPassword('');
      setError('');
    } else {
      setError('Invalid security clearance code.');
    }
  };

  const handleCreatePlanet = () => {
    const newPlanet: Planet = {
      id: `p${Date.now()}`,
      name: 'New Unknown World',
      x: 1000,
      y: 500,
      sectorId: 's1',
      faction: 'Independent',
      habitable: false,
      environment: 'Unknown',
      description: 'A newly charted system.',
    };
    addPlanet(newPlanet);
    setSelectedPlanet(newPlanet);
  };

  return (
    <>
      <div className="absolute top-0 left-0 w-full z-10 glass-panel-primary border-x-0 border-t-0 p-3 flex justify-between items-center px-6">
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <Hexagon className="w-8 h-8 text-primary glow-text" />
            <div className="flex flex-col">
              <h1 className="font-display font-bold text-lg leading-none tracking-widest text-primary glow-text uppercase">Galactic</h1>
              <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Cartography Nav</span>
            </div>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" />
            <Input 
              placeholder="Search systems..." 
              className="pl-9 bg-black/40 border-primary/30 h-9 font-sans focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-planets"
            />
          </div>

          <div className="flex items-center gap-2 ml-2 border-l border-primary/20 pl-4">
            <Select value={filters.faction} onValueChange={(val) => setFilters({...filters, faction: val})}>
              <SelectTrigger className="w-[140px] h-9 bg-black/40 border-primary/30 text-xs" data-testid="select-filter-faction">
                <SelectValue placeholder="Faction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Factions</SelectItem>
                <SelectItem value="Galactic Republic">Galactic Republic</SelectItem>
                <SelectItem value="Sith Empire">Sith Empire</SelectItem>
                <SelectItem value="Hutt Cartel">Hutt Cartel</SelectItem>
                <SelectItem value="Independent">Independent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.environment} onValueChange={(val) => setFilters({...filters, environment: val})}>
              <SelectTrigger className="w-[120px] h-9 bg-black/40 border-primary/30 text-xs" data-testid="select-filter-env">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Biomes</SelectItem>
                <SelectItem value="Desert">Desert</SelectItem>
                <SelectItem value="Forest">Forest</SelectItem>
                <SelectItem value="City">City</SelectItem>
                <SelectItem value="Volcanic">Volcanic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {editMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCreatePlanet}
              className="border-primary/50 text-primary hover:bg-primary/20 transition-all font-display tracking-wider gap-2"
            >
              <Plus className="w-4 h-4" /> ADD PLANET
            </Button>
          )}

          <div className="flex items-center gap-4 bg-black/30 p-1.5 px-4 rounded-full border border-primary/20">
            <div className="flex items-center space-x-2">
              <Switch 
                id="lanes" 
                checked={showLanes} 
                onCheckedChange={setShowLanes} 
                className="data-[state=checked]:bg-primary"
                data-testid="toggle-lanes"
              />
              <Label htmlFor="lanes" className="text-xs flex items-center gap-1 cursor-pointer">
                <Route className="w-3 h-3 text-primary/70" /> Lanes
              </Label>
            </div>
            <div className="w-px h-4 bg-primary/20" />
            <div className="flex items-center space-x-2">
              <Switch 
                id="sectors" 
                checked={showSectors} 
                onCheckedChange={setShowSectors}
                className="data-[state=checked]:bg-primary"
                data-testid="toggle-sectors"
              />
              <Label htmlFor="sectors" className="text-xs flex items-center gap-1 cursor-pointer">
                <MapIcon className="w-3 h-3 text-primary/70" /> Sectors
              </Label>
            </div>
            <div className="w-px h-4 bg-primary/20" />
            <div className="flex items-center space-x-2">
              <Switch 
                id="labels" 
                checked={showLabels} 
                onCheckedChange={setShowLabels}
                className="data-[state=checked]:bg-primary"
                data-testid="toggle-labels"
              />
              <Label htmlFor="labels" className="text-xs flex items-center gap-1 cursor-pointer">
                Labels
              </Label>
            </div>
          </div>

          <Button 
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={handleAdminToggle}
            className={cn(
              "font-display tracking-widest gap-2 transition-all duration-300",
              editMode ? "bg-primary text-background hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.5)]" : "border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
            )}
            data-testid="button-toggle-edit-mode"
          >
            {editMode ? <LogOut className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {editMode ? "EXIT ADMIN" : "ADMIN ACCESS"}
          </Button>
        </div>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="glass-panel-primary border-primary/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary font-display tracking-widest">GALACTIC SECURITY CLEARANCE</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter admin access code to enable cartography editing tools.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Access Code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/40 border-primary/30 focus-visible:ring-primary font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            {error && <p className="text-destructive text-xs mt-2">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="border-primary/30">Cancel</Button>
            <Button onClick={handlePasswordSubmit} className="bg-primary text-background hover:bg-primary/90">Verify Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
