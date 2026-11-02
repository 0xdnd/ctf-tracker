import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { NotFoundPage } from './NotFoundPage';
import { useCtfStore } from '../store/useCtfStore';

describe('NotFoundPage Component', () => {
  it('renders calm 404 header and status information', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-vector']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /isn.t on the board/i })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('404.404.404.404')).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
    expect(screen.getByText('No foothold')).toBeInTheDocument();
    expect(screen.getAllByText('/non-existent-vector').length).toBeGreaterThanOrEqual(1);
  });

  it('detects suggestion for cheatsheet keywords', () => {
    render(
      <MemoryRouter initialEntries={['/cheat-shell-payloads']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Did you mean/i)).toBeInTheDocument();
    expect(screen.getAllByText('Cheatsheets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'Cheatsheets' })[0]).toHaveAttribute('href', '/cheatsheets');
  });

  it('detects suggestion for vault / loot keywords', () => {
    render(
      <MemoryRouter initialEntries={['/loot-credentials']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Did you mean/i)).toBeInTheDocument();
    expect(screen.getAllByText('Evidence Vault').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: 'Evidence Vault' })[0]).toHaveAttribute('href', '/vault');
  });

  it('renders primary recovery actions and directory grid', () => {
    render(
      <MemoryRouter initialEntries={['/random-unknown']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Back to tracker')).toBeInTheDocument();
    expect(screen.getByText('Search (Ctrl+K)')).toBeInTheDocument();
    expect(screen.getByText('Go back')).toBeInTheDocument();

    // Section directory
    expect(screen.getByText('Machine Tracker')).toBeInTheDocument();
    expect(screen.getByText('Evidence Vault')).toBeInTheDocument();
    expect(screen.getByText('Exam Simulator')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
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
