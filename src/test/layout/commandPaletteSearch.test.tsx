import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CommandPalette } from '../../components/layout/CommandPalette';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { Machine } from '../../types';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
Element.prototype.scrollIntoView = vi.fn();

const Where: React.FC = () => <div data-testid="where">{useLocation().pathname}</div>;

const SECRET = 'Hunter2SecretPw';

const mountPalette = () =>
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <CommandPalette />
      <Where />
    </MemoryRouter>
  );

const type = (value: string) => {
  fireEvent.change(screen.getByLabelText('Command palette search input'), { target: { value } });
};

const press = (key: string) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
};

beforeEach(() => {
  const note = {
    id: 'note-zx',
    title: 'Tunnelling',
    titleEn: 'Tunnelling',
    summary: '',
    rawMarkdown: '# Pivot\nUse **zxqunique** port forward through the jump host.',
  } as unknown as CptsNoteEntry;
  const machine = {
    id: 'm1',
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    writeupMarkdown: '## Foothold\nSamba zxqunique exploit.',
  } as unknown as Machine;
  useCtfStore.setState({
    commandPaletteOpen: true,
    customNotes: [note],
    userNotes: [],
    machines: [machine],
    credentials: [
      { id: 'c1', type: 'password', username: 'svc_backup', secret: SECRET, createdAt: '' },
    ],
    lootItems: [],
  } as never);
});

afterEach(() => {
  cleanup();
  useCtfStore.setState({ commandPaletteOpen: false });
  useNotesWorkspaceStore.setState({ isOpen: false });
});

describe('command palette full-text search', () => {
  it('groups note and writeup hits with highlighted snippets', () => {
    mountPalette();
    type('zxqunique');
    expect(screen.getByRole('group', { name: 'Notes' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Writeups' })).toBeTruthy();
    const marks = Array.from(document.querySelectorAll('mark')).map((m) => m.textContent);
    expect(marks).toEqual(['zxqunique', 'zxqunique']);
  });

  it('Enter opens the first hit (note) in the notes workspace', () => {
    mountPalette();
    type('zxqunique');
    press('Enter');
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe('note-zx');
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);
  });

  it('ArrowDown crosses groups and Enter routes to the writeup', () => {
    mountPalette();
    type('zxqunique');
    press('ArrowDown');
    expect(document.querySelector('[data-palette-index="1"]')?.className).toContain('ring-accent');
    press('Enter');
    expect(screen.getByTestId('where').textContent).toBe('/writeup/m1');
  });

  it('never surfaces credential secrets, but finds the credential by name', () => {
    mountPalette();
    type(SECRET);
    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.queryByRole('group', { name: 'Vault' })).toBeNull();
    type('svc_backup');
    expect(screen.getByRole('group', { name: 'Vault' })).toBeTruthy();
    expect(document.body.textContent).not.toContain(SECRET);
  });
});
