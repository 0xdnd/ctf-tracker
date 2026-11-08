import type { NoteMoreMenuEntry } from '../components/notes/NoteMoreMenu';
import type { CptsNoteEntry } from './obsidianManualUtils';
import type { SplitOrientation } from '../types/workspace';
import { copyNoteMarkdown, downloadNoteMarkdown, sendNoteToReport } from './noteActions';
import { copyShareLink } from './shareLink';
import { playCyberSound } from './helpers';
import { isTauriTarget } from './runtimeTarget';
import { useToastStore } from '../store/useToastStore';
import { confirmAction } from '../store/useConfirmStore';

/** Everything the note "more" menu needs. Optional parts leave their rows out. */
export interface NoteMenuContext {
  note: CptsNoteEntry;
  soundEnabled: boolean;
  /** The note's current text (read when a row is chosen, so edits saved elsewhere are included). */
  getMarkdown: () => string;
  /** Shown as "Copy commands (n)" when the note has commands. Each surface keeps its own copy rules. */
  onCopyCommands?: () => void;
  /** Split rows (full-screen workspace only). */
  split?: {
    isSplitView: boolean;
    orientation: SplitOrientation;
    onToggle: (orientation: SplitOrientation) => void;
  };
  /** "Move tab to other pane" row (the caller decides when it applies). */
  onMoveTab?: () => void;
  /** Extra rows placed after the split rows (the dock's own actions). */
  layoutItems?: NoteMoreMenuEntry[];
  /** "Open in new window" row; omit to hide it (a popout window). */
  popout?: { onOpen?: () => void };
  /** "Pin to all pages" row; omit to hide it. */
  pin?: { label?: string; onSelect: () => void };
  onDeleteNote?: (noteId: string, noteTitle?: string) => void;
}

const item = (
  id: string,
  label: string,
  testId: string,
  onSelect: () => void,
  tone?: 'default' | 'danger',
): NoteMoreMenuEntry => ({ kind: 'item', id, label, testId, onSelect, ...(tone ? { tone } : {}) });

/**
 * The note menu's rows, in order. NoteMoreMenu renders the language and text size rows right after the
 * first separator, so 'sep-reading' and 'sep-layout' always come as a pair.
 */
export function buildNoteMenuEntries(ctx: NoteMenuContext): NoteMoreMenuEntry[] {
  const { note, soundEnabled, getMarkdown } = ctx;
  const click = () => {
    if (soundEnabled) playCyberSound('click');
  };
  const entries: NoteMoreMenuEntry[] = [
    item('copy-md', 'Copy markdown', 'note-menu-copy-md', () => copyNoteMarkdown(getMarkdown(), soundEnabled)),
    item('download-md', 'Export .md', 'note-menu-download-md', () => downloadNoteMarkdown(note, getMarkdown(), soundEnabled)),
    item('report', 'Report', 'export-writeup-report-btn', () => sendNoteToReport(getMarkdown(), soundEnabled, note)),
  ];
  if (ctx.onCopyCommands && note.commands && note.commands.length > 0) {
    entries.push(item('copy-commands', `Copy commands (${note.commands.length})`, 'note-menu-copy-commands', ctx.onCopyCommands));
  }
  entries.push(
    item('share', 'Share link', 'note-menu-share', () => {
      void copyShareLink(`/field-manual?note=${note.id}`).then((ok) => {
        if (!ok) return;
        if (soundEnabled) playCyberSound('copy');
        useToastStore.getState().addToast({ type: 'success', message: 'Link copied' });
      });
    }),
    // The language and font rows render between these two separators.
    { kind: 'separator', id: 'sep-reading' },
    { kind: 'separator', id: 'sep-layout' },
  );

  const split = ctx.split;
  if (split) {
    entries.push(
      item(
        'split-h',
        split.isSplitView && split.orientation === 'horizontal' ? 'Close split' : 'Split horizontally',
        'toggle-split-horizontal',
        () => {
          click();
          split.onToggle('horizontal');
        },
      ),
      item(
        'split-v',
        split.isSplitView && split.orientation === 'vertical' ? 'Close split' : 'Split vertically',
        'toggle-split-vertical',
        () => {
          click();
          split.onToggle('vertical');
        },
      ),
    );
  }
  const onMoveTab = ctx.onMoveTab;
  if (onMoveTab) {
    entries.push(
      item('move-pane', 'Move tab to other pane', 'move-tab-other-pane', () => {
        click();
        onMoveTab();
      }),
    );
  }

  if (ctx.layoutItems) entries.push(...ctx.layoutItems);

  if (ctx.popout) {
    const onOpen = ctx.popout.onOpen;
    entries.push(
      item('popout', 'Open in new window', 'popout-window-button', () => {
        click();
        if (onOpen) {
          onOpen();
          return;
        }
        const popoutUrl = isTauriTarget()
          ? `${window.location.origin}${window.location.pathname}#/field-manual?note=${note.id}&popout=true`
          : `${window.location.origin}/field-manual?note=${note.id}&popout=true`;
        window.open(popoutUrl, `ZeroBoxFieldManual_${note.id}`, 'width=1100,height=850,menubar=no,status=no,toolbar=no');
      }),
    );
  }

  if (ctx.pin) {
    entries.push(item('pin', ctx.pin.label ?? 'Pin to all pages', 'pin-to-global-workspace', ctx.pin.onSelect));
  }

  const onDeleteNote = ctx.onDeleteNote;
  if (onDeleteNote) {
    entries.push(
      { kind: 'separator', id: 'sep-danger' },
      item(
        'delete',
        'Delete note',
        'note-menu-delete',
        async () => {
          const title = note.titleEn || note.title;
          const ok = await confirmAction({
            title: `Delete custom note "${title}"?`,
            body: 'This is permanent and cannot be undone.',
            confirmLabel: 'Delete',
            tone: 'danger',
          });
          if (ok) onDeleteNote(note.id, title);
        },
        'danger',
      ),
    );
  }
  return entries;
}
