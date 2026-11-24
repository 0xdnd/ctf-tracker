import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { NotFoundPage } from './NotFoundPage';
import { useCtfStore } from '../store/useCtfStore';

describe('NotFoundPage Component', () => {
  it('renders a short 404 heading and one sentence', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-vector']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /isn.t here/i })).toBeInTheDocument();
    expect(screen.getByText(/Nothing lives at this address/)).toBeInTheDocument();
  });

  it('detects suggestion for cheatsheet keywords', () => {
    render(
      <MemoryRouter initialEntries={['/cheat-shell-payloads']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Did you mean/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cheatsheets' })).toHaveAttribute('href', '/cheatsheets');
  });

  it('detects suggestion for vault / loot keywords', () => {
    render(
      <MemoryRouter initialEntries={['/loot-credentials']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Did you mean/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Evidence Vault' })).toHaveAttribute('href', '/vault');
  });

  it('renders exactly two recovery actions', () => {
    render(
      <MemoryRouter initialEntries={['/random-unknown']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Back to tracker')).toBeInTheDocument();
    expect(screen.getByText('Search (Ctrl+K)')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('opens command palette when Search button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/test-404']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    const searchBtn = screen.getByText(/Search \(Ctrl\+K\)/i);
    fireEvent.click(searchBtn);

    expect(useCtfStore.getState().commandPaletteOpen).toBe(true);
  });
});
