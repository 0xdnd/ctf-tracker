import React, { Suspense, lazy, useEffect, useId, useState } from 'react';
import { ClipboardPaste, FileSpreadsheet } from 'lucide-react';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { PasteImportPanel } from './PasteImportPanel';
import { Skeleton, SkeletonRegion } from '../common/Skeleton';

// The CSV importer and its parser load only when the visitor opens it.
const CsvImportPanel = lazy(() => import('./CsvImportPanel'));

interface ImportPanelsProps {
  onApplied?: (count: number) => void;
  focusOnMount?: boolean;
  onSkip?: () => void;
  /** Open the CSV importer straight away (the ?csv=1 link). */
  csvRequested?: boolean;
  className?: string;
}

/**
 * A first visit starts with a single row. The form opens in place from its Import button, and starts open when
 * the visitor asked for it: ?import=1 / ?csv=1 or the Import menu (both arrive as focusOnMount / csvRequested),
 * or the first-run tour is on its import step.
 */
export const ImportPanels: React.FC<ImportPanelsProps> = ({ csvRequested, focusOnMount, className = '', ...paste }) => {
  const uid = useId();
  const [csvOpen, setCsvOpen] = useState(Boolean(csvRequested));
  const csvId = `${uid}-csv`;
  const tourOnImport = useOnboardingStore((s) => s.tourActive && s.tourStepIds[s.stepIndex] === 'import');
  const [open, setOpen] = useState(Boolean(focusOnMount || csvRequested));
  const [clicked, setClicked] = useState(false);
  // Once opened it stays open, so text typed on the tour's step survives the next step.
  useEffect(() => {
    if (tourOnImport) setOpen(true);
  }, [tourOnImport]);

  if (!open && !tourOnImport) {
    return (
      <section
        aria-labelledby={`${uid}-title`}
        data-testid="import-banner"
        data-tour="import-panel"
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-subtle bg-surface-card px-4 py-2.5 ${className}`}
      >
        <ClipboardPaste className="w-5 h-5 flex-shrink-0 text-muted" aria-hidden="true" />
        <h2 id={`${uid}-title`} className="text-sm font-semibold text-primary mr-auto">Import your solved boxes</h2>
        {paste.onSkip && (
          <button
            type="button"
            onClick={paste.onSkip}
            className="text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded min-h-6 px-1 [@media(pointer:coarse)]:min-h-11"
          >
            Skip, I&apos;m starting fresh
          </button>
        )}
        <button
          type="button"
          aria-expanded={false}
          onClick={() => {
            setClicked(true);
            setOpen(true);
          }}
          className="inline-flex items-center justify-center px-4 h-9 rounded-xl text-sm font-medium bg-accent hover:brightness-110 text-on-accent transition-[filter,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
        >
          Import
        </button>
      </section>
    );
  }

  return (
    <div className={className}>
      <PasteImportPanel {...paste} focusOnMount={(focusOnMount || clicked) && !csvRequested} />
      <div className="mt-2">
        <button
          type="button"
          aria-expanded={csvOpen}
          aria-controls={csvId}
          onClick={() => setCsvOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded min-h-6 px-1 [@media(pointer:coarse)]:min-h-11"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{csvOpen ? 'Hide CSV import' : 'Have a spreadsheet? Import a CSV file'}</span>
        </button>
        <div id={csvId}>
          {csvOpen && (
            <Suspense fallback={<SkeletonRegion label="Loading CSV import…" className="mt-2"><Skeleton height={120} className="w-full" /></SkeletonRegion>}>
              <CsvImportPanel focusOnMount className="mt-2" />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPanels;
