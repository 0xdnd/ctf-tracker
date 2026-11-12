import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, FileSpreadsheet, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import {
  MAX_CSV_BYTES,
  applyMachinesImport,
  detectColumns,
  parseMachinesCsv,
  planMachinesImport,
  toImportRows,
  type ColumnMap,
  type ImportResult,
} from '../../utils/machinesCsvImport';
import type { PipelineStatus, Platform } from '../../types';

const MAX_SHOWN_ROWS = 200;

const STATUS_LABEL: Record<PipelineStatus, string> = {
  backlog: 'Backlog',
  recon: 'Recon',
  foothold: 'Foothold',
  root: 'Root',
  completed: 'Completed',
};

type PickedColumns = Partial<Pick<ColumnMap, 'name' | 'platform' | 'status'>>;

interface CsvImportPanelProps {
  /** Called after the import has been applied. */
  onApplied?: (result: ImportResult) => void;
  /** Focus the file chooser on mount. */
  focusOnMount?: boolean;
  className?: string;
}

interface PreviewRow {
  line: number;
  name: string;
  platform?: Platform;
  status?: PipelineStatus;
  result: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Choose a CSV spreadsheet of machines, review what would change, then apply. Nothing is written until you confirm. */
export const CsvImportPanel: React.FC<CsvImportPanelProps> = ({ onApplied, focusOnMount, className = '' }) => {
  const uid = useId();
  const { machines, loadCatalog, isCatalogLoaded, lootItems, credentials, credAttempts, activitySessions } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      loadCatalog: s.loadCatalog,
      isCatalogLoaded: s.isCatalogLoaded,
      lootItems: s.lootItems,
      credentials: s.credentials,
      credAttempts: s.credAttempts,
      activitySessions: s.activitySessions,
    }))
  );
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<PickedColumns>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);
  useEffect(() => {
    if (focusOnMount) fileRef.current?.focus();
  }, [focusOnMount]);

  const detected = useMemo(() => (parsed ? detectColumns(parsed.headers) : null), [parsed]);
  const mapping = useMemo<ColumnMap | null>(() => (detected ? { ...detected, ...picked } : null), [detected, picked]);
  const plan = useMemo(() => {
    if (!parsed || !mapping || mapping.name < 0 || !isCatalogLoaded) return null;
    return planMachinesImport(toImportRows(parsed.rows, mapping), machines, undefined, { lootItems, credentials, credAttempts, activitySessions });
  }, [parsed, mapping, machines, isCatalogLoaded, lootItems, credentials, credAttempts, activitySessions]);

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!plan) return [];
    const out: PreviewRow[] = [
      ...plan.link.map((l) => ({ line: l.line, name: l.name, platform: l.platform, status: l.status, result: 'Will link to catalog' })),
      ...plan.add.map((a) => ({
        line: a.line,
        name: a.draft.name,
        platform: a.draft.platform,
        status: a.draft.status,
        result: a.statusUnknown ? 'Will add as custom (status not recognised, using Backlog)' : 'Will add as custom',
      })),
      ...plan.skipped.map((s) => ({ line: s.line, name: s.name, platform: s.platform, result: `Skipped: ${s.reason}` })),
      ...plan.errors.map((e) => ({ line: e.line, name: e.name, result: `Error: ${e.message}` })),
    ];
    return out.sort((a, b) => a.line - b.line);
  }, [plan]);

  const reset = () => {
    setParsed(null);
    setFileName('');
    setError('');
    setPicked({});
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setParsed(null);
    setPicked({});
    setError('');
    if (!file) {
      setFileName('');
      return;
    }
    setFileName(file.name);
    if (file.size > MAX_CSV_BYTES) {
      setError(`That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is 2 MB; split it and import the parts.`);
      return;
    }
    try {
      const result = parseMachinesCsv(await file.text());
      if (result.ok) setParsed({ headers: result.headers, rows: result.rows });
      else setError(result.error);
    } catch {
      setError('That file could not be read.');
    }
  };

  const importable = plan ? plan.link.length + plan.add.length : 0;

  const apply = () => {
    if (!plan || importable === 0) return;
    const result = applyMachinesImport(plan);
    const extras = plan.errors.length > 0 ? `, ${plural(plan.errors.length, 'row', 'rows')} with errors` : '';
    useToastStore.getState().addToast({
      type: 'success',
      title: 'CSV imported',
      message: `${result.linked} linked to catalog, ${result.added} added as custom, ${result.skipped} skipped${extras}.`,
    });
    reset();
    onApplied?.(result);
  };

  const fileId = `${uid}-file`;
  const optionLabel = (h: string, i: number) => h || `Column ${i + 1}`;
  const selectClass =
    'w-full h-10 px-2 rounded-xl bg-surface-sunken border border-subtle text-sm text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  const columnSelect = (field: 'name' | 'platform' | 'status', label: string, optional: boolean) => {
    if (!parsed || !mapping) return null;
    const id = `${uid}-col-${field}`;
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="text-xs font-medium text-secondary">{label}</label>
        <select
          id={id}
          value={mapping[field]}
          onChange={(e) => setPicked((p) => ({ ...p, [field]: Number(e.target.value) }))}
          className={selectClass}
        >
          <option value={-1}>{optional ? 'Not in this file' : 'Choose a column'}</option>
          {parsed.headers.map((h, i) => (
            <option key={i} value={i}>{optionLabel(h, i)}</option>
          ))}
        </select>
      </div>
    );
  };

  const statusText = (() => {
    if (error) return '';
    if (!parsed) return 'Choose a file to preview it.';
    if (!isCatalogLoaded) return 'Loading the machine catalog...';
    if (!plan) return 'Choose the column that holds the machine names.';
    return importable === 0 ? 'Nothing new to import from this file.' : 'Nothing changes until you press Import.';
  })();

  return (
    <section
      aria-labelledby={`${uid}-title`}
      data-testid="csv-import-panel"
      className={`rounded-2xl border border-subtle bg-surface-card p-4 sm:p-5 space-y-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="w-5 h-5 mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id={`${uid}-title`} className="text-sm font-semibold text-primary">Import machines from a CSV file</h2>
          <p className="text-xs text-secondary mt-0.5">
            Use a file exported from ZeroBox or your own spreadsheet. The first row must be column headings, with a Name column.
            Machines you already track are never changed.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={fileId} className="text-xs font-medium text-secondary">CSV file (up to 2 MB)</label>
        <input
          id={fileId}
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm text-primary file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border file:border-subtle file:bg-surface-sunken file:text-sm file:text-primary file:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs p-2 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg">
          {error}
        </p>
      )}

      {parsed && detected && detected.name < 0 && (
        <div className="space-y-2">
          <p className="text-xs text-secondary">No Name column was found in {fileName}. Pick the columns to use.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {columnSelect('name', 'Name column', false)}
            {columnSelect('platform', 'Platform column', true)}
            {columnSelect('status', 'Status column', true)}
          </div>
        </div>
      )}

      {plan && (
        <>
          <dl aria-label="Import summary" className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ['Will link to catalog', plan.link.length],
              ['Skipped', plan.skipped.length],
              ['Will add as custom', plan.add.length],
              ['Rows with errors', plan.errors.length],
            ].map(([label, count]) => (
              <div key={label} className="rounded-lg border border-subtle bg-surface-sunken px-3 py-2">
                <dt className="text-muted">{label}</dt>
                <dd className="text-base font-semibold text-primary tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>

          <div
            role="region"
            aria-label="Preview of the file"
            // A scrollable region must take focus so keyboard users can scroll it.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className="max-h-64 overflow-auto rounded-lg bg-surface-sunken border border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <table className="w-full text-xs text-left">
              <caption className="sr-only">What each row of the file will do</caption>
              <thead className="sticky top-0 bg-surface-sunken text-secondary">
                <tr>
                  <th scope="col" className="px-2 py-1.5 font-medium">Row</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Name</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Platform</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Status</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, MAX_SHOWN_ROWS).map((r) => (
                  <tr key={r.line} className="border-t border-subtle">
                    <td className="px-2 py-1 text-muted tabular-nums">{r.line}</td>
                    <td className="px-2 py-1 font-semibold text-primary">{r.name || 'No name'}</td>
                    <td className="px-2 py-1 text-secondary">{r.platform ?? ''}</td>
                    <td className="px-2 py-1 text-secondary">{r.status ? STATUS_LABEL[r.status] : ''}</td>
                    <td className="px-2 py-1 text-secondary">{r.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewRows.length > MAX_SHOWN_ROWS && (
              <p className="px-2 py-1.5 text-xs text-muted">
                Showing the first {MAX_SHOWN_ROWS} of {previewRows.length} rows. All rows are imported.
              </p>
            )}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-subtle">
        <p role="status" aria-live="polite" className="text-xs text-secondary">{statusText}</p>
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:flex-col-reverse">
          {(parsed || error) && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl text-sm text-secondary hover:text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-sm:w-full [@media(pointer:coarse)]:h-11"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            disabled={importable === 0}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-sm font-medium bg-accent hover:brightness-110 text-on-accent disabled:opacity-40 disabled:cursor-not-allowed transition-[filter,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-sm:w-full [@media(pointer:coarse)]:h-11"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{importable > 0 ? `Import ${plural(importable, 'machine', 'machines')}` : 'Import'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default CsvImportPanel;
