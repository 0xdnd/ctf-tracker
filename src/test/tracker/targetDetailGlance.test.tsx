import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TargetDetailPage } from '../../pages/TargetDetailPage';
import { useCtfStore } from '../../store/useCtfStore';

const base = {
  ip: '10.10.10.3',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'recon',
  tags: [],
  certifications: [],
  roomUrl: '',
  timeSpentSeconds: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mount = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/target/:id" element={<TargetDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('TargetDetailPage glance', () => {
  beforeEach(() => {
    useCtfStore.setState({
      isCatalogLoaded: true,
      soundEnabled: false,
      credentials: [],
      credAttempts: [],
      lootItems: [],
      machines: [
        { ...base, id: 'box-1', name: 'Lame', isActive: false },
        { ...base, id: 'box-2', name: 'Seasonal', isActive: true },
      ],
    } as never);
  });
  afterEach(() => cleanup());

  it('renders the strip and loot panel for a normal machine', () => {
    mount('/target/box-1');
    expect(screen.getByTestId('machine-summary-strip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-flags'));
    expect(screen.getByRole('heading', { name: 'Loot on this host' })).toBeInTheDocument();
  });

  it('renders neither for an active machine', () => {
    mount('/target/box-2');
    expect(screen.queryByTestId('machine-summary-strip')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Loot on this host' })).not.toBeInTheDocument();
  });
});
