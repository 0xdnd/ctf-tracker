import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { FieldManualShell } from '../../components/notes/FieldManualShell';
import { NotesRibbon } from '../../components/notes/NotesRibbon';
import { NotesRightPanel } from '../../components/notes/NotesRightPanel';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { useCtfStore } from '../../store/useCtfStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

const shell = (extra: Partial<React.ComponentProps<typeof FieldManualShell>> = {}) => {
  const onCloseDrawers = vi.fn();
  render(
    <FieldManualShell
      ribbon={<div />}
      left={<div>left</div>}
      right={<div>right</div>}
      statusBar={null}
      isLeftOpen
      isRightOpen
      isNarrow={false}
      onCloseDrawers={onCloseDrawers}
      {...extra}
    >
      <div>center</div>
    </FieldManualShell>,
  );
  return onCloseDrawers;
};

beforeEach(() => {
  resetNoteIndexCacheForTests();
  useCtfStore.setState({ soundEnabled: false });
});
afterEach(cleanup);

describe('FieldManualShell per-side drawers', () => {
  it('a left overlay with an inline right aside shows the scrim and Escape closes drawers', () => {
    const onClose = shell({ narrowLeft: true, narrowRight: false, sidebarWidth: 240 });
    expect(screen.getByTestId('notes-drawer-scrim')).toBeInTheDocument();
    expect(screen.getByTestId('notes-left-panel').className).toContain('absolute');
    expect(screen.getByTestId('notes-right-sidebar').className).not.toContain('absolute');
    expect(screen.getByTestId('notes-right-sidebar').style.width).toBe('240px');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('inline asides have no scrim and Escape is left alone', () => {
    const onClose = shell();
    expect(screen.queryByTestId('notes-drawer-scrim')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('an inline open left aside with a closed overlay right one has no scrim', () => {
    shell({ narrowLeft: false, narrowRight: true, isRightOpen: false });
    expect(screen.queryByTestId('notes-drawer-scrim')).toBeNull();
  });
});

describe('NotesRibbon footer', () => {
  it('keeps the default footer and replaces it when given one', () => {
    const props = { activePanel: null, onSelectPanel: vi.fn(), onOpenSwitcher: vi.fn() };
    const { unmount } = render(<NotesRibbon {...props} onBack={vi.fn()} />);
    expect(screen.getByLabelText('Back to ZeroBox')).toBeInTheDocument();
    expect(screen.getByTestId('notes-ribbon')).toHaveAttribute('data-tour', 'notes-ribbon');
    unmount();
    render(
      <NotesRibbon
        {...props}
        footer={<button type="button">custom</button>}
        panelButtonProps={{ files: { 'data-testid': 'files-btn' } }}
      />,
    );
    expect(screen.queryByLabelText('Back to ZeroBox')).toBeNull();
    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByTestId('files-btn')).toHaveAttribute('aria-label', 'Files');
  });
});

describe('NotesRightPanel width', () => {
  it('defaults to 260px and accepts a class', () => {
    const props = { note: null, backlinks: [], outline: [], onOpenNote: vi.fn(), onSelectHeading: vi.fn(), onCollapse: vi.fn() };
    const { container, unmount } = render(<NotesRightPanel {...props} />);
    expect((container.firstChild as HTMLElement).className).toContain('w-[260px]');
    unmount();
    const r = render(<NotesRightPanel {...props} className="w-[240px]" />);
    expect((r.container.firstChild as HTMLElement).className).toContain('w-[240px]');
  });
});

describe('ObsidianTabContent headingRequest', () => {
  const globalVars = { lhost: '', lport: '', targetIp: '', domain: '', username: '', password: '' } as unknown as GlobalVariables;
  const note = {
    id: 'hn',
    title: 'Heading note',
    category: 'Test',
    rawMarkdown: '# Heading note\n\n## Alpha\n\ntext\n\n## Beta\n\nmore',
  } as unknown as CptsNoteEntry;

  it('scrolls once per newer nonce and switches raw back to reading', async () => {
    const scrolled: string[] = [];
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.textContent ?? '');
    } as typeof Element.prototype.scrollIntoView;
    const onViewModeChange = vi.fn();
    const base = { note, isActive: true, globalVars, soundEnabled: false, onNavigateToNote: vi.fn(), variant: 'shell' as const };
    const { rerender } = render(<ObsidianTabContent {...base} viewMode="reading" headingRequest={{ slug: 'alpha', nonce: 5 }} />);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    // A request that predates the mount is not acted on.
    expect(scrolled).toEqual([]);
    rerender(<ObsidianTabContent {...base} viewMode="reading" headingRequest={{ slug: 'beta', nonce: 6 }} />);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(scrolled.some((t) => t.includes('Beta'))).toBe(true);
    rerender(
      <ObsidianTabContent
        {...base}
        viewMode="raw"
        onViewModeChange={onViewModeChange}
        headingRequest={{ slug: 'alpha', nonce: 7 }}
      />,
    );
    expect(onViewModeChange).toHaveBeenCalledWith('reading');
    Element.prototype.scrollIntoView = orig;
  });
});
