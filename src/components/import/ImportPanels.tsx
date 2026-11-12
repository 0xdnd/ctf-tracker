import React, { Suspense, lazy, useId, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { PasteImportPanel } from './PasteImportPanel';

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

/** The paste-names importer with the CSV importer one click below it. */
export const ImportPanels: React.FC<ImportPanelsProps> = ({ csvRequested, focusOnMount, className = '', ...paste }) => {
  const uid = useId();
  const [csvOpen, setCsvOpen] = useState(Boolean(csvRequested));
  const csvId = `${uid}-csv`;

  return (
    <div className={className}>
      <PasteImportPanel {...paste} focusOnMount={focusOnMount && !csvRequested} />
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
            <Suspense fallback={null}>
              <CsvImportPanel focusOnMount className="mt-2" />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPanels;
