import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { LegacyNotesRedirect } from '../../components/common/LegacyNotesRedirect';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { getAllCptsNotes, mergeUserNotePools, type CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { FIXTURE_IMPORTED_NOTES, seedImportedNotes } from '../fixtures/userNoteFixtures';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
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

const SRC_DIR = path.resolve(__dirname, '..', '..');

function renderNotesView(initial = '/notes') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>
  );
}

describe('Notes area ships no bundled notes', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [],
      userNotes: [],
      userWikilinkMap: {},
      deletedNoteIds: [],
      notesImportModalOpen: false,
    });
    useNotesWorkspaceStore.setState({ openTabIds: [], activeTabId: null, isOpen: false });
  });

  afterEach(() => cleanup());

  it('has no bundled notes data in the app source tree', () => {
    expect(fs.existsSync(path.join(SRC_DIR, 'data', 'cptsNotesIndex.json'))).toBe(false);
    expect(fs.existsSync(path.join(SRC_DIR, 'utils', 'cptsVaultRegistry.ts'))).toBe(false);
    const offenders: string[] = [];
    (function walk(dir: string) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== 'test') walk(p);
        } else if (/\.(tsx?|json)$/.test(e.name)) {
          const text = fs.readFileSync(p, 'utf8');
          if (/methodology-notes\.json|cptsNotesIndex/.test(text)) offenders.push(path.relative(SRC_DIR, p));
        }
      }
    })(SRC_DIR);
    expect(offenders).toEqual([]);
  });

  it('returns an empty note pool until the user imports or writes notes', () => {
    expect(getAllCptsNotes()).toEqual([]);
    expect(useNotesWorkspaceStore.getState().getActiveNote()).toBeNull();
    expect(useNotesWorkspaceStore.getState().getOpenNotes()).toEqual([]);
  });

  it('merges authored and imported notes, with the authored copy winning on id clashes', () => {
    const authored: CptsNoteEntry = { ...FIXTURE_IMPORTED_NOTES[0], rawMarkdown: 'authored copy' };
    const merged = mergeUserNotePools([authored], FIXTURE_IMPORTED_NOTES);
    expect(merged.map((n) => n.id)).toEqual(FIXTURE_IMPORTED_NOTES.map((n) => n.id));
    expect(merged[0].rawMarkdown).toBe('authored copy');
  });

  it('shows the empty state with import and new-note actions when the user has no notes', () => {
    renderNotesView();

    const empty = screen.getByTestId('notes-empty-state');
    expect(empty).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No notes yet' })).toBeInTheDocument();
    expect(
      screen.getByText('Import your own Obsidian vault or markdown notes, or write a new note.')
    ).toBeInTheDocument();
    // The workspace explorer is not rendered without notes
    expect(screen.queryByText('FIELD MANUAL')).not.toBeInTheDocument();
    // No bundled-catalog wording anywhere in the view
    expect(document.body.textContent || '').not.toMatch(/cpts/i);

    const importBtn = Array.from(empty.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Import notes');
    expect(importBtn).toBeDefined();
    fireEvent.click(importBtn!);
    expect(useCtfStore.getState().notesImportModalOpen).toBe(true);
  });

  it('opens the new-note modal from the empty state', () => {
    renderNotesView();
    const empty = screen.getByTestId('notes-empty-state');
    const newNoteBtn = Array.from(empty.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'New note');
    expect(newNoteBtn).toBeDefined();
    fireEvent.click(newNoteBtn!);
    expect(screen.getByText('New field manual note')).toBeInTheDocument();
  });

  it('shows imported notes instead of the empty state once the user imports a vault', () => {
    seedImportedNotes();
    renderNotesView('/notes?note=02-web-directory-fuzzing');

    expect(screen.queryByTestId('notes-empty-state')).not.toBeInTheDocument();
    expect(screen.getByText('FIELD MANUAL')).toBeInTheDocument();
    expect(screen.getAllByText(/Web Content Discovery/).length).toBeGreaterThan(0);
  });

  it('persists an edit to an imported note and the edited note is what the notes view resolves', async () => {
    seedImportedNotes();
    await useCtfStore.getState().updateNoteContent('07-kerberos-attacks-master', '# Kerberos\n\nMy own edit.');

    const stored = useCtfStore.getState().userNotes.find((n) => n.id === '07-kerberos-attacks-master');
    expect(stored?.rawMarkdown).toBe('# Kerberos\n\nMy own edit.');
    expect(useCtfStore.getState().customNotes).toEqual([]);
    expect(getAllCptsNotes().find((n) => n.id === '07-kerberos-attacks-master')?.rawMarkdown).toBe(
      '# Kerberos\n\nMy own edit.'
    );
  });
});

describe('Legacy notes routes redirect to /notes', () => {
  const LocationProbe = () => {
    const loc = useLocation();
    return <div data-testid="location">{`${loc.pathname}${loc.search}${loc.hash}`}</div>;
  };

  const renderAt = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/notes" element={<LocationProbe />} />
          <Route path="/cpts" element={<LegacyNotesRedirect />} />
          <Route path="/cpts-manual" element={<LegacyNotesRedirect />} />
        </Routes>
      </MemoryRouter>
    );

  afterEach(() => cleanup());

  it('redirects /cpts-manual and keeps the ?note= query and hash', () => {
    renderAt('/cpts-manual?note=01-recon-port-scanning#nmap');
    expect(screen.getByTestId('location').textContent).toBe('/notes?note=01-recon-port-scanning#nmap');
  });

  it('redirects /cpts', () => {
    renderAt('/cpts');
    expect(screen.getByTestId('location').textContent).toBe('/notes');
  });

  it('keeps the legacy routes wired to the redirect in App.tsx', () => {
    const app = fs.readFileSync(path.join(SRC_DIR, 'App.tsx'), 'utf8');
    // Plain strings (not regex literals): check-seo parses <Route> text in every src file.
    expect(app).toContain('<Route path="/cpts" element={<LegacyNotesRedirect />} />');
    expect(app).toContain('<Route path="/cpts-manual" element={<LegacyNotesRedirect />} />');
  });
});
