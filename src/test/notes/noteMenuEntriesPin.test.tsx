import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { useCtfStore } from '../../store/useCtfStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

// Pins the full-screen note menu (labels, test ids, separators and the stepper rows' position) so the
// entry list can move into a shared builder without the menu changing.

const globalVars = {
  lhost: '10.10.14.42', lport: '4444', targetIp: '10.10.11.5', domain: 'corp.local', username: 'u', password: 'p',
} as unknown as GlobalVariables;

const mk = (id: string, extra: Partial<CptsNoteEntry> = {}): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown: 'body', ...extra }) as unknown as CptsNoteEntry;

const withCmds = mk('a', { commands: ['echo one', 'echo two'] });
const plain = mk('b');

const menuSequence = (): string[] => {
  fireEvent.click(screen.getByTestId('note-more-menu-button'));
  const menu = screen.getByRole('menu');
  const rows = menu.querySelectorAll<HTMLElement>('[role="separator"], [role="menuitem"], [role="menuitemradio"]');
  return Array.from(rows).map((el) =>
    el.getAttribute('role') === 'separator' ? '---' : `${el.dataset.testid}|${el.textContent?.trim()}`,
  );
};

const renderViewer = (note: CptsNoteEntry, extra: Record<string, unknown> = {}) =>
  render(
    <ObsidianNoteViewer
      note={note}
      openNotes={[note, plain === note ? withCmds : plain]}
      allAvailableNotes={[withCmds, plain]}
      globalVars={globalVars}
      soundEnabled={false}
      onClose={vi.fn()}
      onNavigateToNote={vi.fn()}
      {...extra}
    />,
  );

const STEPPERS = [
  'modal-lang-en|EN',
  'modal-lang-he|עב',
  'decrease-font-size-button|A-',
  'increase-font-size-button|A+',
];
const HEAD = [
  'note-menu-copy-md|Copy markdown',
  'note-menu-download-md|Export .md',
  'export-writeup-report-btn|Report',
];
const SHARE = 'note-menu-share|Share link';
const PAGE_TAIL = ['popout-window-button|Open in new window', 'pin-to-global-workspace|Pin to all pages'];

beforeEach(() => {
  localStorage.clear();
  resetNoteIndexCacheForTests();
  useCtfStore.setState({ soundEnabled: false });
});
afterEach(cleanup);

describe('full-screen note menu entries (pinned)', () => {
  it('plain note, page mode', () => {
    renderViewer(plain);
    expect(menuSequence()).toEqual([...HEAD, SHARE, '---', ...STEPPERS, '---', ...PAGE_TAIL]);
  });

  it('note with commands adds Copy commands before Share', () => {
    renderViewer(withCmds);
    expect(menuSequence()).toEqual([
      ...HEAD,
      'note-menu-copy-commands|Copy commands (2)',
      SHARE,
      '---',
      ...STEPPERS,
      '---',
      ...PAGE_TAIL,
    ]);
  });

  it('split controls, closed split', () => {
    renderViewer(plain, { onToggleSplit: vi.fn(), onMoveTabToOtherPane: vi.fn() });
    expect(menuSequence()).toEqual([
      ...HEAD,
      SHARE,
      '---',
      ...STEPPERS,
      '---',
      'toggle-split-horizontal|Split horizontally',
      'toggle-split-vertical|Split vertically',
      ...PAGE_TAIL,
    ]);
  });

  it('open vertical split with two tabs adds Move tab', () => {
    renderViewer(plain, {
      onToggleSplit: vi.fn(),
      onMoveTabToOtherPane: vi.fn(),
      isSplitView: true,
      splitOrientation: 'vertical',
    });
    expect(menuSequence()).toEqual([
      ...HEAD,
      SHARE,
      '---',
      ...STEPPERS,
      '---',
      'toggle-split-horizontal|Split horizontally',
      'toggle-split-vertical|Close split',
      'move-tab-other-pane|Move tab to other pane',
      ...PAGE_TAIL,
    ]);
  });

  it('popout drops the page-only rows', () => {
    renderViewer(plain, { displayMode: 'popout' });
    expect(menuSequence()).toEqual([...HEAD, SHARE, '---', ...STEPPERS, '---']);
  });

  it('delete sits last behind its own separator', () => {
    renderViewer(withCmds, { onDeleteNote: vi.fn() });
    expect(menuSequence()).toEqual([
      ...HEAD,
      'note-menu-copy-commands|Copy commands (2)',
      SHARE,
      '---',
      ...STEPPERS,
      '---',
      ...PAGE_TAIL,
      '---',
      'note-menu-delete|Delete note',
    ]);
  });
});
