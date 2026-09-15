import { useState } from 'react';
import { CheckCircle2, Download, Loader2, MapPinned, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface RegionImportCandidate {
  id: string;
  name: string;
  previous: string | null;
  region: string;
}

interface RegionImportReviewItem {
  id: string;
  name: string;
  current: string | null;
  reason: string;
}

interface RegionImportPreview {
  candidates: RegionImportCandidate[];
  review: RegionImportReviewItem[];
  preserved: number;
  counts: Record<string, number>;
  alignment: {
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
  };
  overlayInstalled: boolean;
}

interface RegionImportPanelProps {
  canManage: boolean;
}

const responseError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  return body?.error || body?.message || fallback;
};

export const RegionImportPanel = ({ canManage }: RegionImportPanelProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState<RegionImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  const loadPreview = async () => {
    setLoading(true);
    setPreview(null);
    setError(null);
    setConfirmed(false);
    try {
      const response = await fetch('/api/region-import', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(await responseError(response, `Unable to load region preview (${response.status})`));
      }
      setPreview(await response.json() as RegionImportPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load region preview.');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = () => {
    setOpen(true);
    void loadPreview();
  };

  const applyImport = async () => {
    if (!confirmed || applying) return;
    setApplying(true);
    setError(null);
    try {
      const response = await fetch('/api/region-import', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, `Unable to apply regions (${response.status})`));
      }
      try {
        sessionStorage.setItem('swmap_open_region_reference', 'true');
      } catch { /* The import still succeeds when browser storage is disabled. */ }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply regions.');
      setApplying(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 px-1.5 text-[9px] text-primary hover:bg-primary/15"
        onClick={openDialog}
        disabled={loading || applying}
        title="Preview and import map regions"
        aria-label="Preview and import map regions"
      >
        <MapPinned className="w-3 h-3 mr-1" /> Regions
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel-primary border-primary/30 bg-[#05080f]/95 backdrop-blur-3xl max-h-[90vh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-display font-black text-base tracking-[0.16em] uppercase">
              <MapPinned className="h-4 w-4" /> Import map regions
            </DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] leading-relaxed uppercase tracking-wider">
              Existing region values are preserved. Only blank values are filled; ambiguous or boundary planets are skipped for review.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-primary text-[10px] uppercase tracking-widest">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading region preview
            </div>
          )}

          {error && (
            <div className="flex items-start justify-between gap-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-[10px] leading-relaxed text-destructive">
              <span>{error}</span>
              {!applying && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-[9px] text-destructive hover:bg-destructive/15"
                  onClick={() => void loadPreview()}
                  disabled={loading}
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Retry
                </Button>
              )}
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-3 text-[10px]">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <div className="rounded border border-primary/20 bg-primary/10 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-primary/60">Candidates</div>
                  <div className="mt-0.5 text-sm font-bold text-primary">{preview.candidates.length}</div>
                </div>
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-foreground/50">Preserved</div>
                  <div className="mt-0.5 text-sm font-bold text-foreground/80">{preview.preserved}</div>
                </div>
                <div className="rounded border border-amber-400/20 bg-amber-400/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-amber-300/70">Review</div>
                  <div className="mt-0.5 text-sm font-bold text-amber-300">{preview.review.length}</div>
                </div>
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-foreground/50">Overlay</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-foreground/80">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {preview.overlayInstalled ? 'Installed' : 'Will install'}
                  </div>
                </div>
              </div>

              <section className="rounded border border-primary/15 bg-black/20 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary">Candidate counts</h3>
                  <span className="text-[8px] text-foreground/40">Blank region values only</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(preview.counts).length > 0 ? (
                    Object.entries(preview.counts).map(([region, count]) => (
                      <span key={region} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-1 text-[9px] text-foreground/80">
                        <span className="text-primary">{region}</span> · {count}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-foreground/50">No candidate regions found.</span>
                  )}
                </div>
              </section>

              {preview.candidates.length > 0 && (
                <section className="rounded border border-white/10 bg-black/20 p-2">
                  <h3 className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-primary">Region assignments</h3>
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                    {preview.candidates.map(candidate => (
                      <div key={candidate.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-2 border-b border-white/5 py-1 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                        <span className="truncate text-foreground/80" title={candidate.name}>{candidate.name}</span>
                        <span className="truncate text-primary" title={candidate.region}>{candidate.region}</span>
                        <span className="hidden truncate text-foreground/40 sm:block" title={candidate.previous || undefined}>
                          {candidate.previous ? `Keeps ${candidate.previous}` : 'Blank → fill'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded border border-amber-400/20 bg-amber-400/5 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-amber-300">Needs review</h3>
                  <span className="text-[8px] text-amber-200/50">Skipped safely</span>
                </div>
                {preview.review.length > 0 ? (
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                    {preview.review.map(item => (
                      <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-2 gap-y-0.5 border-b border-amber-400/10 py-1 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.2fr)]">
                        <span className="truncate text-foreground/80" title={item.name}>{item.name}</span>
                        <span className="truncate text-foreground/50">{item.current || 'No region'}</span>
                        <span className="col-span-2 text-[9px] text-amber-200/70 sm:col-span-1" title={item.reason}>{item.reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-foreground/50">No ambiguous or boundary planets require review.</p>
                )}
              </section>

              <div className="rounded border border-primary/15 bg-primary/5 p-2 text-[9px] leading-relaxed text-foreground/60">
                The fixed aligned overlay will be installed or updated along with the region assignments. Applying re-evaluates the map and fills only blank region values; existing values are never overwritten.
                <div className="mt-1 text-[8px] uppercase tracking-wider text-primary/60">
                  Alignment: X {preview.alignment.x} · Y {preview.alignment.y} · {preview.alignment.width} × {preview.alignment.height} · {preview.alignment.opacity}% opacity
                </div>
              </div>

              <label className="flex items-start gap-2 rounded border border-primary/30 bg-primary/10 p-2 text-[10px] leading-relaxed text-foreground/80">
                <Checkbox checked={confirmed} onCheckedChange={checked => setConfirmed(checked === true)} className="mt-0.5" />
                <span>I understand this will install the aligned overlay and fill only blank region values. Ambiguous and boundary planets will remain unchanged.</span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[9px] uppercase tracking-wider"
              onClick={() => setOpen(false)}
              disabled={applying}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-[9px] uppercase tracking-wider"
              onClick={() => void applyImport()}
              disabled={!preview || loading || applying || !confirmed}
            >
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {applying ? 'Applying…' : 'Apply aligned overlay & regions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};