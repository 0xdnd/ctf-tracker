import React from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, BookOpen, Check, Copy } from 'lucide-react';
import type { CheatsheetCommand, GlobalVariables } from '../../../types';
import { interpolateCommand } from '../../../utils/helpers';
import { useNotesWorkspaceStore } from '../../../store/useNotesWorkspaceStore';
import { SyntaxHighlightedCommand } from '../../common/SyntaxHighlightedCommand';
import { TACTICAL_SPRING, CASCADE_STAGGER_DELAY } from '../../../utils/motionTokens';
import { confirmAction } from '../../../store/useConfirmStore';
import { SNIPPET_PAGE_SIZE } from './constants';

interface SnippetListProps {
  filteredCommands: CheatsheetCommand[];
  visibleCommandCount: number;
  setVisibleCommandCount: React.Dispatch<React.SetStateAction<number>>;
  effectiveVars: GlobalVariables;
  copiedId: string | null;
  toggleStarCommand: (id: string) => void;
  deleteCustomCommand: (id: string) => void;
  handleCopy: (text: string, id: string) => void;
}

export const SnippetList: React.FC<SnippetListProps> = ({
  filteredCommands,
  visibleCommandCount,
  setVisibleCommandCount,
  effectiveVars,
  copiedId,
  toggleStarCommand,
  deleteCustomCommand,
  handleCopy,
}) => {
  return (
    <div className="space-y-3">
      {filteredCommands.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-subtle bg-surface-card/50 text-muted text-xs">
          No command snippets matching this query.
        </div>
      ) : (
        filteredCommands.slice(0, visibleCommandCount).map((cmd, idx) => {
          const interpolated = interpolateCommand(cmd.commandTemplate, effectiveVars);
          const isCopied = copiedId === cmd.id;

          return (
            <motion.div
              key={cmd.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ ...TACTICAL_SPRING, delay: CASCADE_STAGGER_DELAY(idx) }}
              className="cyber-snippet-contain p-3.5 rounded-xl border border-subtle bg-surface-card hover:border-strong transition-colors group"
            >
              {/* Snippet Header */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary text-sm">
                      {cmd.title}
                    </span>
                    {cmd.isCustom && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-secondary font-semibold">
                        CUSTOM
                      </span>
                    )}
                    {cmd.platform && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-muted">
                        {cmd.platform}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">{cmd.description}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <motion.button aria-label="Star snippet"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleStarCommand(cmd.id)}
                    className="p-1 max-md:p-2 rounded text-muted hover:text-callout-warn-fg transition-colors"
                    title="Bookmark / Star Snippet"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        cmd.isStarred ? 'fill-current text-callout-warn-fg' : ''
                      }`}
                    />
                  </motion.button>

                  {cmd.isCustom && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={async () => {
                        if (await confirmAction({ title: 'Delete this custom snippet?', body: 'This custom command will be permanently removed.', confirmLabel: 'Delete snippet', tone: 'danger' })) {
                          deleteCustomCommand(cmd.id);
                        }
                      }}
                      className="p-1 max-md:p-2 rounded text-muted hover:text-callout-danger-fg transition-colors"
                      title="Delete Snippet"
                      aria-label="Delete snippet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}

                  <button
                    type="button"
                    onClick={() => useNotesWorkspaceStore.getState().openCheat(cmd.id)}
                    className="p-1 max-md:p-2 rounded text-muted hover:text-primary transition-colors"
                    title="Open in Notes"
                    aria-label={`Open ${cmd.title} in Notes`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopy(interpolated, cmd.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] ${
                      isCopied
                        ? 'bg-callout-success-bg text-callout-success-fg border border-callout-success-border'
                        : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-strong'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-callout-success-fg" />
                        <span className="text-callout-success-fg">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rendered Command Code Box */}
              <div className="relative">
                <pre className="p-3 rounded-lg bg-surface-inverse text-xs text-on-inverse overflow-x-auto whitespace-pre-wrap break-all font-mono tabular-nums select-all">
                  {interpolated.includes('\n') ? (
                    interpolated
                  ) : (
                    <SyntaxHighlightedCommand command={interpolated} className="!bg-transparent !p-0 !rounded-none" />
                  )}
                </pre>
              </div>

              {/* Tags */}
              {cmd.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {cmd.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })
      )}
      {filteredCommands.length > visibleCommandCount && (
        <button
          type="button"
          onClick={() => setVisibleCommandCount((n) => n + SNIPPET_PAGE_SIZE)}
          className="inline-flex min-h-8 items-center rounded-md border border-subtle bg-surface-card px-3 text-xs font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary cursor-pointer [@media(pointer:coarse)]:min-h-11"
        >
          Show more ({filteredCommands.length - visibleCommandCount} left)
        </button>
      )}
    </div>
  );
};
