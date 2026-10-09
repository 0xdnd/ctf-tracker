import React from 'react';
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

    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Unresolved route')).toBeInTheDocument();
    expect(screen.getByText('/non-existent-vector')).toBeInTheDocument();
  });

  it('detects suggestion for cheatsheet keywords', () => {
    render(
      <MemoryRouter initialEntries={['/cheat-shell-payloads']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Looking for this page\?/i)).toBeInTheDocument();
    expect(screen.getAllByText('Cheatsheets').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Open Cheatsheets')).toBeInTheDocument();
  });

  it('detects suggestion for vault / loot keywords', () => {
    render(
      <MemoryRouter initialEntries={['/loot-credentials']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Looking for this page\?/i)).toBeInTheDocument();
    expect(screen.getAllByText('Evidence Vault').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Open Evidence Vault')).toBeInTheDocument();
  });

  it('renders primary recovery actions and directory grid', () => {
    render(
      <MemoryRouter initialEntries={['/random-unknown']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Back to tracker')).toBeInTheDocument();
    expect(screen.getByText('Search (Ctrl+K)')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();

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
