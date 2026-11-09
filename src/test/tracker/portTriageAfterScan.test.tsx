import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
  isActive: false,
};

const services = [{ port: 80, protocol: 'tcp', service: 'http', version: 'Apache 2.4' }];

// The triage table lives on the Flags & intel tab.
const mount = (id: string) => {
  const view = render(
    <MemoryRouter initialEntries={[`/target/${id}`]}>
      <Routes>
        <Route path="/target/:id" element={<TargetDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByTestId('tab-flags'));
  return view;
};

const TRIAGE_HEADING = /Port Triage/i;

describe('TargetDetailPage port triage after a scan import', () => {
  beforeEach(() => {
    useCtfStore.setState({
      isCatalogLoaded: true,
      soundEnabled: false,
      credentials: [],
      credAttempts: [],
      lootItems: [],
      machines: [
        { ...base, id: 'scanned-triaged', name: 'Triaged', services, portTriage: { '80': { status: 'checking', note: 'try dirsearch' } } },
        { ...base, id: 'scanned-clean', name: 'Clean', services },
        { ...base, id: 'no-scan', name: 'NoScan', openPorts: [22] },
      ],
    } as never);
  });
  afterEach(() => cleanup());

  it('keeps the triage table visible when services exist and manual triage entries exist', () => {
    mount('scanned-triaged');
    expect(screen.getByText(TRIAGE_HEADING)).toBeInTheDocument();
    expect(screen.getByDisplayValue('try dirsearch')).toBeInTheDocument();
  });

  it('still hides the triage table behind the attack-surface view when services exist and nothing was triaged', () => {
    mount('scanned-clean');
    expect(screen.queryByText(TRIAGE_HEADING)).not.toBeInTheDocument();
  });

  it('shows the triage table when no scan was imported', () => {
    mount('no-scan');
    expect(screen.getByText(TRIAGE_HEADING)).toBeInTheDocument();
  });
});
