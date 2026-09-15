import { useRef } from 'react';
import { Layers, Maximize2, Move, RotateCcw, Trash2, Upload } from 'lucide-react';
import { MapOverlay } from '@/lib/data';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface Props {
  overlays: MapOverlay[];
  activeOverlayId: string | null;
  activeOverlay: MapOverlay | null;
  transformMode: boolean;
  canManage: boolean;
  onSelect: (id: string) => void;
  onUpload: (name: string, imageData: string) => void;
  onPatch: (patch: Partial<MapOverlay>) => void;
  onDelete: () => void;
  onReset: () => void;
  onToggleTransformMode: () => void;
}

export const MapOverlayManager = ({
  overlays, activeOverlayId, activeOverlay, transformMode, canManage,
  onSelect, onUpload, onPatch, onDelete, onReset, onToggleTransformMode,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpload(file.name.replace(/\.[^/.]+$/, '') || 'New Overlay', reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="absolute top-4 right-4 z-30 w-64 glass-panel rounded-md border border-primary/30 p-3 text-[10px] font-display">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-primary uppercase tracking-widest">
          <Layers className="w-3.5 h-3.5" /> Map overlays
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[9px] text-primary hover:bg-primary/15"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canManage}
        >
          <Upload className="w-3 h-3 mr-1" /> Upload
        </Button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
      </div>

      {overlays.length === 0 ? (
        <p className="text-foreground/50 leading-tight">Upload a PNG, JPEG, or WebP reference image to position it over the galaxy map.</p>
      ) : (
        <>
          <select
            value={activeOverlayId ?? ''}
            onChange={event => onSelect(event.target.value)}
            className="w-full h-7 rounded border border-primary/20 bg-black/70 px-2 text-[10px] text-foreground outline-none"
          >
            {overlays.map(overlay => <option key={overlay.id} value={overlay.id}>{overlay.name}</option>)}
          </select>

          {activeOverlay && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-1">
                <Input
                  value={activeOverlay.name}
                  onChange={event => onPatch({ name: event.target.value })}
                  onBlur={() => onPatch({ name: activeOverlay.name.trim() || 'Untitled Overlay' })}
                  className="h-7 bg-black/60 border-primary/20 text-[10px]"
                  disabled={!canManage}
                />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/15" onClick={onDelete} disabled={!canManage} title="Delete overlay">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <label className="block text-[9px] text-foreground/60 uppercase tracking-wider">
                Opacity {activeOverlay.opacity}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeOverlay.opacity}
                  onChange={event => onPatch({ opacity: Number(event.target.value) })}
                  className="w-full accent-[hsl(var(--primary))]"
                  disabled={!canManage}
                />
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['x', 'X position'],
                  ['y', 'Y position'],
                  ['width', 'Width'],
                  ['height', 'Height'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="text-[8px] text-foreground/50 uppercase">
                    {label}
                    <Input
                      type="number"
                      value={activeOverlay[field]}
                      onChange={event => onPatch({ [field]: Number(event.target.value) })}
                      className="h-6 mt-0.5 bg-black/60 border-primary/20 text-[9px]"
                      disabled={!canManage}
                    />
                  </label>
                ))}
              </div>

              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 flex-1 text-[9px] gap-1 ${transformMode ? 'border-primary text-primary bg-primary/15' : 'border-primary/20 text-foreground/70'}`}
                  onClick={onToggleTransformMode}
                  disabled={!canManage}
                >
                  <Move className="w-3 h-3" /> {transformMode ? 'Editing' : 'Move / Resize'}
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-primary/20 text-foreground/70" onClick={onReset} disabled={!canManage} title="Fit overlay to map">
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-primary/20 text-foreground/70" onClick={() => onPatch({ x: 0, y: 0 })} disabled={!canManage} title="Reset position">
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-[8px] leading-tight text-foreground/40">
                {transformMode ? 'Drag the overlay to move it. Drag the lower-right handle to resize it.' : 'Use Move / Resize to position the overlay directly on the map.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};