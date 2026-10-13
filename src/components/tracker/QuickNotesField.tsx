import React, { useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { GlobalVariables } from '../../types';
import { ObsidianMarkdownBody } from '../cheatsheet/ObsidianMarkdownBody';

export interface QuickNotesFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  globalVars: GlobalVariables;
  soundEnabled: boolean;
  /** The machine's IP: `{TARGET}` in its notes always means this machine. */
  targetIp?: string;
  /** Extra classes for the preview panel (match the textarea's surface). */
  previewClassName?: string;
}

const TOGGLE_BTN =
  'inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 cursor-pointer';

/**
 * Machine quick notes: the existing autosaving textarea plus a Preview mode
 * that renders the notes like the notes workspace (code blocks get Copy with
 * variables filled in, placeholders show as chips).
 */
export const QuickNotesField: React.FC<QuickNotesFieldProps> = ({
  value,
  onChange,
  globalVars,
  soundEnabled,
  targetIp,
  previewClassName = '',
  ...textareaProps
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Preview or edit notes" className="inline-flex gap-1 rounded-lg border border-subtle bg-surface-sunken p-0.5">
        {(['preview', 'edit'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`${TOGGLE_BTN} ${
              mode === m ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'
            }`}
          >
            {m === 'preview' ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {m === 'preview' ? 'Preview' : 'Edit'}
          </button>
        ))}
      </div>

      {mode === 'edit' ? (
        <textarea {...textareaProps} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div
          data-testid="quick-notes-preview"
          className={`rounded-md border border-subtle bg-surface-sunken p-3 text-primary ${previewClassName}`}
        >
          {value.trim() ? (
            <ObsidianMarkdownBody
              content={value}
              globalVars={globalVars}
              soundEnabled={soundEnabled}
              fontSize="sm"
              targetIp={targetIp}
            />
          ) : (
            <p className="text-xs text-muted">No notes yet. Switch to Edit to write some.</p>
          )}
        </div>
      )}
    </div>
  );
};
