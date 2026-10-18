import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { NotFoundPage } from './NotFoundPage';
import { useCtfStore } from '../store/useCtfStore';

describe('NotFoundPage Component', () => {
  it('renders tactical 404 security protocol and status', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-vector']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('TARGET_VECTOR_UNMAPPED')).toBeInTheDocument();
    expect(screen.getByText('0x404_NOT_FOUND')).toBeInTheDocument();
    expect(screen.getByText('SIGNAL LOST')).toBeInTheDocument();
    expect(screen.getByText('/non-existent-vector')).toBeInTheDocument();
  });

  it('detects fuzzy match for cheatsheet keywords', () => {
    render(
      <MemoryRouter initialEntries={['/cheat-shell-payloads']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Intelligent Route Match Detected/i)).toBeInTheDocument();
    expect(screen.getAllByText('Cheatsheet & Shell Crafter').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Jump to Route')).toBeInTheDocument();
  });

  it('detects fuzzy match for manual / cpts keywords', () => {
    render(
      <MemoryRouter initialEntries={['/cpts-notes-vault']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Intelligent Route Match Detected/i)).toBeInTheDocument();
    expect(screen.getAllByText('CPTS Field Manual').length).toBeGreaterThanOrEqual(1);
  });

  it('renders primary recovery actions and module launchpad', () => {
    render(
      <MemoryRouter initialEntries={['/random-unknown']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('MISSION CONTROL')).toBeInTheDocument();
    expect(screen.getByText('COMMAND PALETTE')).toBeInTheDocument();
    expect(screen.getByText('STEP BACK')).toBeInTheDocument();

    // Module pills
    expect(screen.getByText('Mission Control Tracker')).toBeInTheDocument();
    expect(screen.getByText('Methodology Framework')).toBeInTheDocument();
    expect(screen.getByText('24-Hour Exam Simulator')).toBeInTheDocument();
  });

  it('opens command palette when Command Palette button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/test-404']}>
        <NotFoundPage />
      </MemoryRouter>
    );

    const paletteBtn = screen.getByText('COMMAND PALETTE');
    fireEvent.click(paletteBtn);

    expect(useCtfStore.getState().commandPaletteOpen).toBe(true);
  });
});
