import { useState } from 'react';
import type { Sector } from '@/lib/data';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function PlanetSectorField({ sectorId, sectors, onSave }: {
  sectorId: string | null;
  sectors: Sector[];
  onSave: (id: string | null) => void;
}) {
  const currentName = sectors.find(sector => sector.id === sectorId)?.name ?? '';
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  const save = () => {
    const value = name.trim().toLowerCase();
    const matches = sectors.filter(sector => sector.name.trim().toLowerCase() === value);
    if (value && matches.length !== 1) {
      setError(matches.length > 1
        ? 'Multiple sectors have this name. Use a unique sector name.'
        : 'Sector not found. Enter an existing sector name, or leave blank to clear.');
      return;
    }
    const nextId = value ? matches[0].id : null;
    setError('');
    setName(value ? matches[0].name : '');
    if (nextId !== sectorId) onSave(nextId);
  };

  return (
    <div className="space-y-1">
      <Label htmlFor="planet-sector" className="text-[10px] uppercase text-primary/70">Sector</Label>
      <Input
        id="planet-sector"
        list="planet-sector-options"
        value={name}
        onChange={event => { setName(event.target.value); setError(''); }}
        onBlur={save}
        onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === 'Escape') { setName(currentName); setError(''); }
        }}
        aria-invalid={!!error}
        aria-describedby="planet-sector-help"
        className="bg-black/60 border-primary/20 h-8 text-xs"
        placeholder="Type an existing sector name"
      />
      <datalist id="planet-sector-options">
        {sectors.map(sector => <option key={sector.id} value={sector.name} />)}
      </datalist>
      <p id="planet-sector-help" className={`text-[9px] ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
        {error || 'Choose an existing sector. Enter or leave the field to save; leave blank to clear.'}
      </p>
    </div>
  );
}