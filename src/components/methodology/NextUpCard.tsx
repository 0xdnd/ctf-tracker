import React from 'react';
import { Check, CheckCircle2, Compass, Copy, PlayCircle } from 'lucide-react';
import { CyberButton } from '../common/CyberButton';

export interface NextUpItem {
  id: string;
  title: string;
  description?: string;
  commandSnippet?: string;
}

export interface NextUpCardProps {
  phaseNumber: number | null;
  phaseTitle: string | null;
  item: NextUpItem | null;
  interpolatedCommand?: string;
  isCopied: boolean;
  onCopy: (commandSnippet: string, itemId: string) => void;
  onMarkDone: (itemId: string) => void;
  onStart: (itemId: string) => void;
}

/** "Next up" focus card for the methodology checklist: the active or next actionable item. */
export const NextUpCard: React.FC<NextUpCardProps> = ({
  phaseNumber,
  phaseTitle,
  item,
  interpolatedCommand,
  isCopied,
  onCopy,
  onMarkDone,
  onStart,
}) => {
  if (!item) {
    return (
      <div className="p-3.5 rounded-2xl border border-callout-success-border bg-callout-success-bg flex items-center gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-callout-success-fg flex-shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold text-primary">
          Every applicable task for this target is done or marked N/A.
        </span>
      </div>
    );
  }

  return (
    <div data-testid="next-up-card" className="p-3.5 rounded-2xl border border-subtle bg-surface-card machined-edge space-y-2.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold text-muted">
        <Compass className="w-4 h-4 text-muted" aria-hidden="true" />
        <span>Next up</span>
        {phaseNumber != null && (
          <span className="text-secondary">
            Phase {String(phaseNumber).padStart(2, '0')}{phaseTitle ? ` · ${phaseTitle.replace(/^Phase\s*\d+\s*:\s*/i, '')}` : ''}
          </span>
        )}
      </div>

      <div>
        <div className="text-sm font-semibold text-primary">{item.title}</div>
        {item.description && <div className="mt-0.5 text-xs text-muted">{item.description}</div>}
      </div>

      {interpolatedCommand && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-card border border-subtle text-[11px] font-mono">
          <span className="truncate text-primary select-all">{interpolatedCommand}</span>
          <button
            type="button"
            onClick={() => item.commandSnippet && onCopy(item.commandSnippet, item.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card hover:bg-surface-elevated border border-subtle text-muted hover:text-primary flex-shrink-0 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98]"
            title="Copy interpolated command"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-callout-success-fg" />
                <span className="text-callout-success-fg font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <CyberButton
          variant="secondary"
          size="sm"
          iconLeft={<PlayCircle className="h-3.5 w-3.5" />}
          onClick={() => onStart(item.id)}
        >
          Start
        </CyberButton>
        <CyberButton
          variant="primary"
          size="sm"
          iconLeft={<CheckCircle2 className="h-3.5 w-3.5" />}
          onClick={() => onMarkDone(item.id)}
        >
          Mark done
        </CyberButton>
      </div>
    </div>
  );
};

export default NextUpCard;
