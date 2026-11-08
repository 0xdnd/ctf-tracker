import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { ObsidianFontSize } from '../cheatsheet/ObsidianMarkdownBody';

export type NoteMoreMenuEntry =
  | {
      kind: 'item';
      id: string;
      label: string;
      testId: string;
      onSelect(): void;
      tone?: 'default' | 'danger';
      hint?: string;
    }
  | { kind: 'separator'; id: string };

export interface NoteMoreMenuProps {
  entries: NoteMoreMenuEntry[];
  /** Stepper row: the menu stays open. */
  language: 'en' | 'he';
  onLanguageChange(l: 'en' | 'he'): void;
  /** Stepper row: the menu stays open. */
  fontSize: ObsidianFontSize;
  onFontSmaller(): void;
  onFontLarger(): void;
}

const ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';
const rowBase =
  'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none focus:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';
const stepBtn =
  'inline-flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-sm px-1.5 text-[12px] font-medium text-secondary transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40';

/**
 * The note header's "more" menu. Like OverflowMenu (menu roles, arrow-key roving focus, Escape
 * closes and refocuses the trigger, outside press closes) but plain rows are the only ones that
 * close it: the language and font rows are steppers and leave it open.
 */
export const NoteMoreMenu: React.FC<NoteMoreMenuProps> = ({
  entries,
  language,
  onLanguageChange,
  fontSize,
  onFontSmaller,
  onFontLarger,
}) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const getItems = useCallback(
    (): HTMLButtonElement[] =>
      menuRef.current ? Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR)) : [],
    [],
  );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) getItems()[0]?.focus();
  }, [open, getItems]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    // Capture phase on window, so Escape closes only the menu wherever focus is, before the
    // viewer's own Escape handling (which closes a popout window) sees it.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      close(true);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('keydown', onEscape, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onEscape, true);
    };
  }, [open, close]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getItems();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(current + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(current - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  const steppers = (
    <>
      <div className="flex h-8 items-center justify-between gap-2 px-2 text-[13px] text-secondary">
        <span className="font-medium">Language</span>
        <span role="group" aria-label="Language" className="flex items-center gap-0.5">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={language === 'en'}
            tabIndex={-1}
            data-testid="modal-lang-en"
            onClick={() => onLanguageChange('en')}
            title="English technical playbook only"
            className={`${stepBtn} ${language === 'en' ? 'bg-accent text-on-accent hover:bg-accent hover:text-on-accent' : ''}`}
          >
            EN
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={language === 'he'}
            tabIndex={-1}
            data-testid="modal-lang-he"
            onClick={() => onLanguageChange('he')}
            title="רשימות אישיות בעברית בלבד"
            className={`${stepBtn} ${language === 'he' ? 'bg-accent text-on-accent hover:bg-accent hover:text-on-accent' : ''}`}
          >
            עב
          </button>
        </span>
      </div>
      <div className="flex h-8 items-center justify-between gap-2 px-2 text-[13px] text-secondary">
        <span className="font-medium">Text size</span>
        <span role="group" aria-label="Text size" className="flex items-center gap-0.5">
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            data-testid="decrease-font-size-button"
            onClick={onFontSmaller}
            disabled={fontSize === 'sm'}
            title="Decrease note font size"
            aria-label="Decrease note font size"
            className={stepBtn}
          >
            A-
          </button>
          <span data-testid="font-size-indicator" className="min-w-6 text-center text-[11px] font-semibold text-accent">
            {fontSize}
          </span>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            data-testid="increase-font-size-button"
            onClick={onFontLarger}
            disabled={fontSize === 'xl'}
            title="Increase note font size"
            aria-label="Increase note font size"
            className={stepBtn}
          >
            A+
          </button>
        </span>
      </div>
    </>
  );

  // The two stepper rows sit after the first separator, as in the prototype.
  const firstSeparator = entries.findIndex((e) => e.kind === 'separator');

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        data-testid="note-more-menu-button"
        aria-label="More options"
        title="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-expanded:bg-surface-hover aria-expanded:text-primary"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="More options"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-[100] mt-1 w-[190px] rounded-md border border-strong bg-surface-elevated p-1 shadow-xl"
        >
          {entries.map((entry, index) => (
            <React.Fragment key={entry.id}>
              {entry.kind === 'separator' ? (
                <div role="separator" className="my-1 border-t border-subtle" />
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  data-testid={entry.testId}
                  onClick={() => {
                    close(true);
                    entry.onSelect();
                  }}
                  className={`${rowBase} cursor-pointer ${
                    entry.tone === 'danger'
                      ? 'text-callout-danger-fg hover:bg-callout-danger-bg focus:bg-callout-danger-bg'
                      : 'text-secondary hover:bg-surface-hover hover:text-primary focus:text-primary'
                  }`}
                >
                  <span className="flex-1 truncate">{entry.label}</span>
                  {entry.hint && <span className="text-[11px] text-tertiary">{entry.hint}</span>}
                </button>
              )}
              {index === firstSeparator && steppers}
            </React.Fragment>
          ))}
          {firstSeparator === -1 && steppers}
        </div>
      )}
    </div>
  );
};

export default NoteMoreMenu;
