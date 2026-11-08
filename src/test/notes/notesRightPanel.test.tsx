import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { NotesRightPanel } from '../../components/notes/NotesRightPanel';
import { NotesStatusBar } from '../../components/notes/NotesStatusBar';
import { useCtfStore } from '../../store/useCtfStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { getNoteOutline } from '../../utils/noteMeta';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

const globalVars = {
  lhost: '10.10.14.42', lport: '4444', targetIp: '10.10.11.5', domain: 'corp.local', username: 'u', password: 'p',
} as unknown as GlobalVariables;

const mk = (id: string, rawMarkdown = `body ${id}`): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown }) as unknown as CptsNoteEntry;

describe('NotesRightPanel', () => {
  const a = mk('A', 'see [[Note B]] here');
  const b = mk('B', 'intro');

  it('lists backlinks with a snippet and opens one', () => {
    const onOpen = vi.fn();
    render(
      <NotesRightPanel note={b} backlinks={[a]} outline={[]} onOpenNote={onOpen} onSelectHeading={vi.fn()} onCollapse={vi.fn()} />,
    );
    expect(screen.getByText('Backlinks (1)')).toBeInTheDocument();
    expect(screen.getByText('see [[Note B]] here')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Note A'));
    expect(onOpen).toHaveBeenCalledWith('A');
  });

  it('outline click sends the slug and indents by level', () => {
    const onSelect = vi.fn();
    render(
      <NotesRightPanel
        note={b}
        backlinks={[]}
        outline={[
          { level: 2, text: 'Step one', slug: 'step-one' },
          { level: 3, text: 'Deep', slug: 'deep' },
        ]}
        onOpenNote={vi.fn()}
        onSelectHeading={onSelect}
        onCollapse={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Step one'));
    expect(onSelect).toHaveBeenCalledWith('step-one');
    expect(screen.getByText('Step one').style.paddingLeft).toBe('8px');
    expect(screen.getByText('Deep').style.paddingLeft).toBe('20px');
  });

  it('shows empty states', () => {
    render(
      <NotesRightPanel note={b} backlinks={[]} outline={[]} onOpenNote={vi.fn()} onSelectHeading={vi.fn()} onCollapse={vi.fn()} />,
    );
    expect(screen.getByText('Backlinks (0)')).toBeInTheDocument();
    expect(screen.getByText('No backlinks yet.')).toBeInTheDocument();
    expect(screen.getByText('No headings in this note.')).toBeInTheDocument();
  });

  it('collapse button calls onCollapse', () => {
    const onCollapse = vi.fn();
    render(
      <NotesRightPanel note={b} backlinks={[]} outline={[]} onOpenNote={vi.fn()} onSelectHeading={vi.fn()} onCollapse={onCollapse} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Collapse details' }));
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });
});

describe('NotesStatusBar', () => {
  it('pluralizes words and backlinks', () => {
    const { rerender } = render(<NotesStatusBar wordCount={1} backlinkCount={1} />);
    expect(screen.getByTestId('status-words')).toHaveTextContent('1 word');
    expect(screen.getByTestId('status-words')).not.toHaveTextContent('1 words');
    expect(screen.getByTestId('status-backlinks')).toHaveTextContent('1 backlink');
    expect(screen.getByTestId('status-backlinks')).not.toHaveTextContent('1 backlinks');
    rerender(<NotesStatusBar wordCount={0} backlinkCount={2} />);
    expect(screen.getByTestId('status-words')).toHaveTextContent('0 words');
    expect(screen.getByTestId('status-backlinks')).toHaveTextContent('2 backlinks');
  });
});

describe('field manual right sidebar (CheatsheetView)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    resetNoteIndexCacheForTests();
    useCtfStore.setState({ customNotes: [mk('A', 'plain'), mk('B', 'intro')], userNotes: [], deletedNoteIds: [] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const setup = () =>
    render(
      <MemoryRouter initialEntries={['/field-manual?note=B']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>,
    );

  it('backlinks and outline update live after edits (no reload)', async () => {
    setup();
    expect(screen.getByTestId('status-backlinks')).toHaveTextContent('0 backlinks');
    await act(async () => {
      await useCtfStore.getState().updateNoteContent('A', 'see [[Note B]]');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(within(screen.getByTestId('right-panel-backlinks')).getByText('Note A')).toBeInTheDocument();
    expect(screen.getByTestId('status-backlinks')).toHaveTextContent('1 backlink');
    expect(screen.getByTestId('status-backlinks')).not.toHaveTextContent('1 backlinks');

    await act(async () => {
      await useCtfStore.getState().updateNoteContent('B', 'intro\n## Added section');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(within(screen.getByTestId('right-panel-outline')).getByText('Added section')).toBeInTheDocument();
    expect(screen.getByTestId('status-words')).toHaveTextContent('4 words');
  });

  it('is open by default and the viewer toggle closes it (inert + aria-hidden) and persists', () => {
    setup();
    const aside = screen.getByTestId('notes-right-sidebar');
    expect(aside).toHaveAttribute('data-state', 'open');
    expect(aside).not.toHaveAttribute('inert');

    fireEvent.click(screen.getByTestId('toggle-right-panel'));
    expect(aside).toHaveAttribute('data-state', 'closed');
    expect(aside).toHaveAttribute('inert');
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(localStorage.getItem('zerobox_notes_right_panel_open')).toBe('false');

    fireEvent.click(screen.getByTestId('toggle-right-panel'));
    expect(aside).toHaveAttribute('data-state', 'open');
    expect(aside).not.toHaveAttribute('aria-hidden');
  });

  it('starts closed when persisted closed', () => {
    localStorage.setItem('zerobox_notes_right_panel_open', 'false');
    setup();
    expect(screen.getByTestId('notes-right-sidebar')).toHaveAttribute('data-state', 'closed');
  });

  it('the collapse button inside the panel closes it', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse details' }));
    expect(screen.getByTestId('notes-right-sidebar')).toHaveAttribute('data-state', 'closed');
  });
});

describe('ObsidianTabContent variants', () => {
  const linking = mk('A', 'see [[Note B]]');
  const target = mk('B', '## One\n## Two\nbody');

  beforeEach(() => {
    vi.useFakeTimers();
    resetNoteIndexCacheForTests();
    useCtfStore.setState({ customNotes: [linking, target], userNotes: [], deletedNoteIds: [] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const renderTab = (variant?: 'dock' | 'shell') =>
    render(
      <ObsidianTabContent
        note={target}
        isActive
        globalVars={globalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
        viewMode="reading"
        {...(variant ? { variant } : {})}
      />,
    );

  it('shell variant has no inline outline or backlinks footer', () => {
    renderTab('shell');
    expect(screen.queryByText('OUTLINE:')).toBeNull();
    expect(screen.queryByText(/OBSIDIAN BACKLINKS/)).toBeNull();
  });

  it('dock variant (default) keeps both', () => {
    renderTab();
    expect(screen.getByText('OUTLINE:')).toBeInTheDocument();
    expect(screen.getByText(/OBSIDIAN BACKLINKS/)).toBeInTheDocument();
  });
});

describe('outline slugs resolve to rendered headings', () => {
  it('every outline entry slug has a matching heading element id in the body', () => {
    const raw = 'intro\n## Step one\n### Sub: part (A)\n## Réseau & more!\n# Late title\n```\n## fenced\n```\n#### Too deep';
    const note = { ...mk('Z', raw), title: 'Zeta', titleEn: 'Zeta' };
    const outline = getNoteOutline(raw, note);
    expect(outline.map((o) => o.text)).toEqual(['Step one', 'Sub: part (A)', 'Réseau & more!', 'Late title']);
    const { container } = render(
      <ObsidianTabContent
        note={note}
        isActive
        globalVars={globalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
        viewMode="reading"
        variant="shell"
      />,
    );
    for (const o of outline) {
      const el = container.querySelector(`[id="section-${o.slug}"]`);
      expect(el, `heading for ${o.slug}`).not.toBeNull();
      expect(/^H[1-6]$/.test(el!.tagName)).toBe(true);
    }
  });
});

describe('ObsidianNoteViewer headingRequest', () => {
  const note = mk('V', '# Title V\n## Step one\ntext');
  let scrollSpy: ReturnType<typeof vi.fn>;
  const originalScroll = Element.prototype.scrollIntoView;

  beforeEach(() => {
    resetNoteIndexCacheForTests();
    useCtfStore.setState({ customNotes: [note], userNotes: [], deletedNoteIds: [] });
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    cleanup();
    Element.prototype.scrollIntoView = originalScroll;
    vi.unstubAllGlobals();
  });

  const viewer = (extra: Record<string, unknown> = {}) => (
    <ObsidianNoteViewer
      note={note}
      openNotes={[note]}
      globalVars={globalVars}
      soundEnabled={false}
      onClose={vi.fn()}
      onNavigateToNote={vi.fn()}
      displayMode="page"
      {...extra}
    />
  );

  it('outline request while editing switches to Reading and scrolls the active pane once', () => {
    // Narrow screen: the viewer reads the media query, so Edit opens the raw editor.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    const { rerender } = render(viewer());
    fireEvent.click(screen.getByTitle('Switch to Edit View'));
    expect(screen.getByTestId('markdown-editor-textarea')).toBeInTheDocument();

    rerender(viewer({ headingRequest: { slug: 'step-one', nonce: 1 } }));
    expect(screen.queryByTestId('markdown-editor-textarea')).toBeNull();
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.instances[0]).toBe(document.getElementById('section-step-one'));
  });

  it('acts only on a larger nonce: no re-scroll on identical request, scrolls on a newer one', () => {
    const { rerender } = render(viewer());
    rerender(viewer({ headingRequest: { slug: 'step-one', nonce: 5 } }));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    rerender(viewer({ headingRequest: { slug: 'step-one', nonce: 5 } }));
    rerender(viewer({ headingRequest: { slug: 'step-one', nonce: 4 } }));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    rerender(viewer({ headingRequest: { slug: 'step-one', nonce: 6 } }));
    expect(scrollSpy).toHaveBeenCalledTimes(2);
  });

  it('does not scroll for a request that already existed when the viewer mounted', () => {
    render(viewer({ headingRequest: { slug: 'step-one', nonce: 9 } }));
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('exposes data-pane-id on the root and the right-panel toggle', () => {
    const onToggle = vi.fn();
    render(viewer({ paneId: 'pane-primary', isRightPanelOpen: true, onToggleRightPanel: onToggle }));
    expect(screen.getByTestId('obsidian-note-viewer-docked')).toHaveAttribute('data-pane-id', 'pane-primary');
    fireEvent.click(screen.getByTestId('toggle-right-panel'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('popout has no right-panel toggle', () => {
    render(viewer({ displayMode: 'popout', onToggleRightPanel: vi.fn() }));
    expect(screen.queryByTestId('toggle-right-panel')).toBeNull();
  });
});

describe('ObsidianNoteViewer headingRequest from wide Edit', () => {
  const note = mk('W', '# Title W\n## Step one\ntext');
  beforeEach(() => {
    resetNoteIndexCacheForTests();
    useCtfStore.setState({ customNotes: [note], userNotes: [], deletedNoteIds: [] });
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const viewer = (extra: Record<string, unknown> = {}) => (
    <ObsidianNoteViewer
      note={note}
      openNotes={[note]}
      globalVars={globalVars}
      soundEnabled={false}
      onClose={vi.fn()}
      onNavigateToNote={vi.fn()}
      displayMode="page"
      {...extra}
    />
  );

  it('switches from split Edit to Reading', () => {
    const { rerender } = render(viewer());
    fireEvent.click(screen.getByTitle('Switch to Edit View'));
    expect(screen.getByTestId('markdown-editor-textarea')).toBeInTheDocument();
    rerender(viewer({ headingRequest: { slug: 'step-one', nonce: 1 } }));
    expect(screen.queryByTestId('markdown-editor-textarea')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reading' })).toHaveAttribute('aria-pressed', 'true');
  });
});
