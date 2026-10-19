import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Terminal } from 'lucide-react';
import type { CheatsheetCommand } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { useActiveTargetIp } from '../../hooks/useActiveTargetIp';
import { contextFromGlobalVars, resolveTemplate } from '../../utils/variableSubstitution';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { CHEATSHEET_CATEGORIES } from '../../data/cheatsheetsData';

interface SnippetTabContentProps {
  entry: CheatsheetCommand;
}

export function cheatCategoryName(categoryId: string): string {
  return CHEATSHEET_CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId;
}

/** Read-only dock view of one cheatsheet entry, with the same variable substitution as the snippets drawer. */
export const SnippetTabContent: React.FC<SnippetTabContentProps> = ({ entry }) => {
  const { globalVars, soundEnabled } = useCtfStore(
    useShallow((s) => ({ globalVars: s.globalVars, soundEnabled: s.soundEnabled }))
  );
  const activeTargetIp = useActiveTargetIp();
  const context = useMemo(() => contextFromGlobalVars(globalVars, { activeTargetIp }), [globalVars, activeTargetIp]);
  const resolved = useMemo(
    () => resolveTemplate(entry.commandTemplate, context, { legacyAliases: true }),
    [entry.commandTemplate, context]
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await safeCopyToClipboard(resolved.text);
    if (soundEnabled) playCyberSound('copy');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article className="p-4 space-y-3 text-sm" data-testid={`snippet-tab-${entry.id}`}>
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{cheatCategoryName(entry.category)}</span>
          {entry.platform && (
            <span className="px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle">{entry.platform}</span>
          )}
        </div>
        <h2 className="text-base font-semibold text-primary">{entry.title}</h2>
        {entry.description && <p className="text-xs text-secondary">{entry.description}</p>}
      </header>

      <section aria-label="Command" className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted">Command</span>
          <div className="flex items-center gap-2">
            {resolved.unresolved.length > 0 && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded border border-callout-warn-border text-callout-warn-fg flex items-center gap-1"
                title={`Unresolved variable: ${resolved.unresolved.join(', ')}`}
              >
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                <span>
                  Missing: <span className="font-mono">{resolved.unresolved.join(', ')}</span>
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy command for ${entry.title}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer active:scale-[0.97] transition-interactive border ${
                copied
                  ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
                  : 'bg-surface-sunken border-subtle text-muted hover:text-primary hover:border-strong'
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <pre className="p-3 rounded-lg bg-surface-inverse text-xs text-on-inverse overflow-x-auto whitespace-pre-wrap break-all font-mono tabular-nums select-all">
          <code>{resolved.text}</code>
        </pre>
      </section>

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
