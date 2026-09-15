import { useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Loader2, RefreshCw } from 'lucide-react';
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

interface AppendixRegionCandidate {
  id: string;
  name: string;
  previous: string | null;
  region: string;
  sourceName: string;
  sourceRegion: string;
  page: number | null;
  source: 'pdf' | 'rings';
  ringRegion: string | null;
}

interface AppendixRegionReviewItem {
  id: string;
  name: string;
  current: string | null;
  reason: string;
}

interface AppendixRegionPreview {
  candidates: AppendixRegionCandidate[];
  review: AppendixRegionReviewItem[];
  unchanged: number;
  counts: Record<string, number>;
  total: number;
  matched: number;
  filled: number;
  corrected: number;
  sourceEntries: number;
  pdfUpdates: number;
  ringUpdates: number;
}

interface AppendixRegionImportPanelProps {
  canManage: boolean;
}

const responseError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  return body?.error || body?.message || fallback;
};

export const AppendixRegionImportPanel = ({ canManage }: AppendixRegionImportPanelProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState<AppendixRegionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  const loadPreview = async () => {
    setLoading(true);
    setPreview(null);
    setError(null);
    setConfirmed(false);
    try {
      const response = await fetch('/api/combined-regions', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(await responseError(response, `Unable to load appendix preview (${response.status})`));
      }
      setPreview(await response.json() as AppendixRegionPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load appendix preview.');
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
      const response = await fetch('/api/combined-regions', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, `Unable to apply appendix regions (${response.status})`));
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply appendix regions.');
      setApplying(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-full justify-start px-1.5 text-[9px] text-primary hover:bg-primary/15"
        onClick={openDialog}
        disabled={loading || applying}
        title="Combine map rings and PDF regions, with PDF priority"
        aria-label="Preview combined region import"
      >
        <FileText className="mr-1.5 h-3 w-3" /> Combined regions · rings + PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel-primary border-primary/30 bg-[#05080f]/95 backdrop-blur-3xl max-h-[90vh] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-display font-black text-base tracking-[0.14em] uppercase">
              <BookOpen className="h-4 w-4" /> Combined region import
            </DialogTitle>
            <DialogDescription className="text-primary/60 text-[10px] leading-relaxed uppercase tracking-wider">
              Map rings fill blanks; exact-name PDF matches take priority and may correct existing regions. PDF grid coordinates are ignored. Missing or ambiguous PDF matches use safe ring fills only.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-primary text-[10px] uppercase tracking-widest">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading combined preview
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
              <p className="text-primary">Final updates: {preview.pdfUpdates} from PDF · {preview.ringUpdates} from map rings. Each planet is updated at most once.</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                <div className="rounded border border-primary/20 bg-primary/10 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-primary/60">Source rows</div>
                  <div className="mt-0.5 text-sm font-bold text-primary">{preview.sourceEntries}</div>
                </div>
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-foreground/50">Matched</div>
                  <div className="mt-0.5 text-sm font-bold text-foreground/80">{preview.matched}</div>
                </div>
                <div className="rounded border border-green-400/20 bg-green-400/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-green-300/70">Fill</div>
                  <div className="mt-0.5 text-sm font-bold text-green-300">{preview.filled}</div>
                </div>
                <div className="rounded border border-amber-400/20 bg-amber-400/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-amber-300/70">Correct</div>
                  <div className="mt-0.5 text-sm font-bold text-amber-300">{preview.corrected}</div>
                </div>
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-foreground/50">Review</div>
                  <div className="mt-0.5 text-sm font-bold text-foreground/80">{preview.review.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[9px] sm:grid-cols-3">
                <div className="rounded border border-white/10 bg-black/20 p-2">
                  <span className="text-foreground/50">Existing planets</span>
                  <strong className="ml-1 text-foreground/80">{preview.total}</strong>
                </div>
                <div className="rounded border border-white/10 bg-black/20 p-2">
                  <span className="text-foreground/50">Unchanged</span>
                  <strong className="ml-1 text-foreground/80">{preview.unchanged}</strong>
                </div>
                <div className="col-span-2 rounded border border-primary/15 bg-primary/5 p-2 sm:col-span-1">
                  <span className="text-primary/60">No map structure changes</span>
                  <strong className="ml-1 text-primary">Planets · positions · sectors</strong>
                </div>
              </div>

              <section className="rounded border border-primary/15 bg-black/20 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary">Final region counts</h3>
                  <span className="text-[8px] text-foreground/40">PDF overrides rings</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(preview.counts).length > 0 ? (
                    Object.entries(preview.counts).map(([region, count]) => (
                      <span key={region} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-1 text-[9px] text-foreground/80">
                        <span className="text-primary">{region}</span> · {count}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] text-foreground/50">No region changes needed.</span>
                  )}
                </div>
              </section>

              {preview.candidates.length > 0 && (
                <section className="rounded border border-white/10 bg-black/20 p-2">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary">Preview assignments</h3>
                    <span className="text-[8px] text-foreground/40">Final source shown per row</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1.2fr)_auto] gap-2 border-b border-primary/15 pb-1 text-[8px] uppercase tracking-wider text-foreground/40">
                      <span>Planet</span>
                      <span>Region</span>
                      <span>Source</span>
                      <span>Action</span>
                    </div>
                    <div className="space-y-1">
                      {preview.candidates.map(candidate => (
                        <div key={candidate.id} className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1.2fr)_auto] gap-2 border-b border-white/5 py-1 last:border-0">
                          <span className="min-w-0 truncate text-foreground/80" title={candidate.name}>{candidate.name}</span>
                          <span className="min-w-0 text-primary">
                            {candidate.previous && <span className="block break-words text-amber-300/80">{candidate.previous} →</span>}
                            <span className="break-words">{candidate.region}</span>
                          </span>
                          <span className="min-w-0 truncate text-foreground/60" title={`${candidate.sourceName} · ${candidate.sourceRegion}`}>
                            {candidate.sourceName} · {candidate.sourceRegion}
                            {candidate.page !== null && <span className="ml-1 text-primary/70">(PDF p. {candidate.page})</span>}
                            {candidate.source === 'pdf' && candidate.ringRegion && candidate.ringRegion !== candidate.region && (
                              <span className="block whitespace-normal text-amber-300/80">Overrides ring suggestion: {candidate.ringRegion}</span>
                            )}
                          </span>
                          <span className={`whitespace-nowrap ${candidate.previous ? 'text-amber-300' : 'text-green-300'}`}>
                            {candidate.previous ? 'Correct' : 'Fill'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded border border-amber-400/20 bg-amber-400/5 p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-amber-300">Unmatched / ambiguous</h3>
                  <span className="text-[8px] text-amber-200/50">Not changed</span>
                </div>
                {preview.review.length > 0 ? (
                  <div className="max-h-36 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
                    {preview.review.map(item => (
                      <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-x-2 gap-y-0.5 border-b border-amber-400/10 py-1 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.4fr)]">
                        <span className="truncate text-foreground/80" title={item.name}>{item.name}</span>
                        <span className="truncate text-foreground/50">{item.current || 'No region'}</span>
                        <span className="col-span-2 text-[9px] text-amber-200/70 sm:col-span-1" title={item.reason}>{item.reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-foreground/50">No unmatched or ambiguous planets require review.</p>
                )}
              </section>

              <div className="rounded border border-primary/20 bg-primary/5 p-2 text-[9px] leading-relaxed text-foreground/70">
                Applying combines both sources in one operation. Rings only fill blank values; PDF matches take priority, including corrections. It will not create planets, change positions or sectors, or install, reset, or modify any overlay.
              </div>

              <label className="flex items-start gap-2 rounded border border-amber-400/40 bg-amber-400/10 p-2 text-[10px] leading-relaxed text-foreground/90">
                <Checkbox checked={confirmed} onCheckedChange={checked => setConfirmed(checked === true)} className="mt-0.5" />
                <span>I confirm the combined changes: rings fill blanks and PDF matches take priority over rings and existing regions. No planets will be created; positions, sectors, and overlays stay unchanged.</span>
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
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {applying ? 'Applying…' : 'Apply combined regions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};