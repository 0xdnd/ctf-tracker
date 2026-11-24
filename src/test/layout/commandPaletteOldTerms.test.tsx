import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from '../../components/layout/CommandPalette';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
Element.prototype.scrollIntoView = vi.fn();

const type = (value: string) => {
  fireEvent.change(screen.getByLabelText('Command palette search input'), { target: { value } });
};

// The renamed palette entries keep the words people used to type, so old muscle memory still finds them.
describe('command palette keeps old search words', () => {
  beforeEach(() => {
    useCtfStore.setState({ commandPaletteOpen: true, customNotes: [], userNotes: [], machines: [] });
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <CommandPalette />
      </MemoryRouter>,
    );
  });
  afterEach(() => cleanup());

  it.each([
    ['operator', /Switch profile or log in/],
    ['json', /Backup and restore/],
    ['dossier', /About ZeroBox and its creator/],
    ['daniel', /About ZeroBox and its creator/],
    ['field notes', /Open or close the notes panel/],
    ['sidecar', /Open or close the notes panel/],
  ])('"%s" finds %s', (word, label) => {
    type(word);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });
});
