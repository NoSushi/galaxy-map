import { useRef, useState } from 'react';
import { Eye, EyeOff, Layers, Maximize2, Move, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { MapOverlay } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Button } from './ui/button';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const RASTER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const RASTER_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const EXTENSION_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

interface Props {
  overlays: MapOverlay[];
  activeOverlayId: string | null;
  activeOverlay: MapOverlay | null;
  savedOverlay: MapOverlay | null;
  transformMode: boolean;
  canManage: boolean;
  readOnly: boolean;
  showOverlay: boolean;
  onToggleVisibility: (visible: boolean) => void;
  onSelect: (id: string) => void;
  onUpload: (
    name: string,
    imageData: string,
    dimensions: { width: number; height: number },
  ) => Promise<void> | void;
  onPreview: (patch: Partial<MapOverlay>) => void;
  onSave: (overlay: MapOverlay) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onReset: () => void;
  onToggleTransformMode: () => void;
}

function overlaysDiffer(a: MapOverlay | null, b: MapOverlay | null): boolean {
  if (!a || !b || a.id !== b.id) return false;
  return a.name !== b.name ||
    a.x !== b.x ||
    a.y !== b.y ||
    a.width !== b.width ||
    a.height !== b.height ||
    a.opacity !== b.opacity;
}

export const MapOverlayManager = ({
  overlays, activeOverlayId, activeOverlay, savedOverlay, transformMode, canManage,
  readOnly, showOverlay, onToggleVisibility, onSelect, onUpload, onPreview, onSave,
  onDelete, onReset, onToggleTransformMode,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEditActive = canManage && !readOnly;
  const hasChanges = canEditActive && overlaysDiffer(activeOverlay, savedOverlay);

  const showUploadError = (description: string) => {
    toast({
      variant: 'destructive',
      title: 'Overlay upload rejected',
      description,
    });
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the value even for rejected files so selecting the same file again
    // still produces a change event.
    event.target.value = '';
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const canonicalType = file.type || EXTENSION_TYPES[extension] || '';
    const isRaster = RASTER_TYPES.has(file.type) ||
      (!file.type && RASTER_EXTENSIONS.has(extension));
    if (!isRaster) {
      showUploadError('Only PNG, JPEG, WebP, and GIF raster images are supported.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      showUploadError('Raster images must be 8 MB or smaller.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setUploading(false);
      showUploadError('The image could not be read. Please try another file.');
    };
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setUploading(false);
        showUploadError('The image could not be read. Please try another file.');
        return;
      }

      // Some browsers provide an empty MIME type for local files.  Normalize
      // that data URL to the exact media types accepted by the API.
      const imageData = !file.type
        ? reader.result.replace(/^data:[^;]*;base64,/, `data:${canonicalType};base64,`)
        : reader.result;
      const image = new Image();
      image.onerror = () => {
        setUploading(false);
        showUploadError('The image could not be decoded as a supported raster image.');
      };
      image.onload = async () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          setUploading(false);
          showUploadError('The image has invalid dimensions.');
          return;
        }
        try {
          await onUpload(
            file.name.replace(/\.[^/.]+$/, '').trim() || 'New Overlay',
            imageData,
            { width: image.naturalWidth, height: image.naturalHeight },
          );
        } catch (error) {
          console.error('Overlay upload callback failed:', error);
          showUploadError(error instanceof Error ? error.message : 'The overlay image could not be saved.');
        } finally {
          setUploading(false);
        }
      };
      image.src = imageData;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!activeOverlay || !canEditActive || !hasChanges) return;
    setSaving(true);
    try {
      await onSave({
        ...activeOverlay,
        name: activeOverlay.name.trim() || 'Untitled Overlay',
      });
    } catch {
      // The owner is responsible for surfacing the API error.  Keep the draft
      // in place so the user can retry without losing the preview.
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEditActive || !activeOverlay) return;
    const confirmed = window.confirm(`Delete overlay "${activeOverlay.name}"? This cannot be undone.`);
    if (!confirmed) return;
    await onDelete();
  };

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (hasChanges) {
      const confirmed = window.confirm('Discard unsaved overlay changes?');
      if (!confirmed) return;
    }
    onSelect(event.target.value);
  };

  const fieldDisabled = !canEditActive;

  return (
    <div
      className="absolute top-4 right-4 z-30 w-72 glass-panel rounded-md border border-primary/30 p-3 text-[10px] font-display"
      // The manager floats above the map.  Keep its controls from becoming
      // accidental map clicks, selection boxes, or pan gestures.
      onClick={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-primary uppercase tracking-widest">
          <Layers className="w-3.5 h-3.5" /> Map overlays
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[9px] ${showOverlay ? 'text-primary' : 'text-foreground/50'} hover:bg-primary/15`}
            onClick={() => onToggleVisibility(!showOverlay)}
            aria-pressed={showOverlay}
            title={showOverlay ? 'Hide overlay' : 'Show overlay'}
          >
            {showOverlay ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            {showOverlay ? 'Visible' : 'Hidden'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[9px] text-primary hover:bg-primary/15"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canManage || uploading}
          >
            <Upload className="w-3 h-3 mr-1" /> {uploading ? 'Reading…' : 'Upload'}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <select
        value={activeOverlayId ?? ''}
        onChange={handleSelect}
        className="w-full h-7 rounded border border-primary/20 bg-black/70 px-2 text-[10px] text-foreground outline-none"
        aria-label="Select map overlay"
      >
        {overlays.map(overlay => (
          <option key={overlay.id} value={overlay.id}>{overlay.name}</option>
        ))}
      </select>

      {activeOverlay && (
        <div className="mt-3 space-y-2">
          {readOnly && (
            <p className="text-[8px] leading-tight text-foreground/45">
              Built-in reference image. It is always available and cannot be edited or deleted.
            </p>
          )}
          <div className="flex items-center gap-1">
            <Input
              value={activeOverlay.name}
              onChange={event => onPreview({ name: event.target.value })}
              onBlur={() => onPreview({ name: activeOverlay.name.trim() || 'Untitled Overlay' })}
              className="h-7 bg-black/60 border-primary/20 text-[10px]"
              disabled={fieldDisabled}
            />
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/15"
                onClick={handleDelete}
                disabled={fieldDisabled}
                title="Delete overlay"
                aria-label="Delete overlay"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>

          <label className="block text-[9px] text-foreground/60 uppercase tracking-wider">
            Opacity {activeOverlay.opacity}%
            <input
              type="range"
              min="0"
              max="100"
              value={activeOverlay.opacity}
              onChange={event => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) onPreview({ opacity: value });
              }}
              className="w-full accent-[hsl(var(--primary))]"
              disabled={fieldDisabled}
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
                  min={field === 'width' || field === 'height' ? 100 : -1000000}
                  max={field === 'width' || field === 'height' ? 100000 : 1000000}
                  value={activeOverlay[field]}
                  onChange={event => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) onPreview({ [field]: value });
                  }}
                  className="h-6 mt-0.5 bg-black/60 border-primary/20 text-[9px]"
                  disabled={fieldDisabled}
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
              disabled={fieldDisabled}
            >
              <Move className="w-3 h-3" /> {transformMode ? 'Editing' : 'Move / Resize'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-primary/20 text-foreground/70"
              onClick={onReset}
              disabled={fieldDisabled}
              title="Fit overlay to map"
              aria-label="Fit overlay to map"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-primary/20 text-foreground/70"
              onClick={() => onPreview({ x: 0, y: 0 })}
              disabled={fieldDisabled}
              title="Reset position"
              aria-label="Reset position"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>

          {canEditActive && (
            <Button
              variant="default"
              size="sm"
              className="w-full h-7 text-[9px] gap-1 font-display tracking-widest"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
          <p className="text-[8px] leading-tight text-foreground/40">
            {readOnly
              ? 'Switch overlays or use the visibility toggle above.'
              : transformMode
                ? 'Drag to move or resize a preview (aspect ratio preserved). Panel and map changes are previews until you press Save.'
                : 'Panel and map changes are previews until Save. Use Move / Resize to position the overlay directly on the map.'}
          </p>
        </div>
      )}
    </div>
  );
};