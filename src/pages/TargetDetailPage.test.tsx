import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TargetDetailPage } from './TargetDetailPage';
import { useCtfStore } from '../store/useCtfStore';

describe('TargetDetailPage slug matching', () => {
  beforeEach(() => {
    useCtfStore.setState({
      isCatalogLoaded: true,
      machines: [
        {
          id: 'htb-included',
          name: 'Included',
          ip: '10.129.1.9',
          os: 'Linux',
          platform: 'HTB',
          difficulty: 'Very Easy',
          status: 'foothold',
          tags: ['TFTP', 'Starting Point'],
          certifications: ['HTB-Starting-Point'],
          timeSpentSeconds: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
  });

  it('renders target when route param matches exact id', () => {
    render(
      <MemoryRouter initialEntries={['/target/htb-included']}>
        <Routes>
          <Route path="/target/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.getByText('10.129.1.9')).toBeInTheDocument();
  });

  it('renders target when route param matches bare name slug', () => {
    render(
      <MemoryRouter initialEntries={['/target/included']}>
        <Routes>
          <Route path="/target/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.queryByText('Target not found')).not.toBeInTheDocument();
  });

  it('shows Target not found for completely unknown machine', () => {
    render(
      <MemoryRouter initialEntries={['/target/non-existent-box']}>
        <Routes>
          <Route path="/target/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Target not found')).toBeInTheDocument();
  });

  it('switches to Recon tab and displays dropzone', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter initialEntries={['/target/htb-included']}>
        <Routes>
          <Route path="/target/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const reconTabBtn = screen.getByRole('button', { name: /^Recon$/ });
    expect(reconTabBtn).toBeInTheDocument();

    fireEvent.click(reconTabBtn);
    expect(screen.getByText(/RECON ARTIFACT DROPZONE & SERVICE DISCOVERY/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & Drop Scan File/i)).toBeInTheDocument();
  });

  it('renders discovered attack surface in overview tab when machine has services', async () => {
    const { fireEvent } = await import('@testing-library/react');
    useCtfStore.setState({
      machines: [
        {
          id: 'htb-included',
          name: 'Included',
          ip: '10.129.1.9',
          os: 'Linux',
          platform: 'HTB',
          difficulty: 'Very Easy',
          status: 'recon',
          tags: ['TFTP', 'Starting Point'],
          certifications: ['HTB-Starting-Point'],
          timeSpentSeconds: 0,
          services: [
            { port: 80, protocol: 'tcp', state: 'open', service: 'http', version: 'Apache 2.4.41' },
            { port: 69, protocol: 'udp', state: 'open', service: 'tftp' },
          ],
          openPorts: [80, 69],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/target/htb-included']}>
        <Routes>
          <Route path="/target/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const overviewTabBtn = screen.getByRole('button', { name: /Flags & intel/i });
    fireEvent.click(overviewTabBtn);

    expect(screen.getByText(/Attack surface \(2 ports\)/i)).toBeInTheDocument();
    expect(screen.getByText('80/tcp')).toBeInTheDocument();
    expect(screen.getByText('69/udp')).toBeInTheDocument();
  });
});
