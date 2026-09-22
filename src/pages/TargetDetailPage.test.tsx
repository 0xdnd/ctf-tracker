import React from 'react';
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
    expect(screen.queryByText('TARGET NOT FOUND')).not.toBeInTheDocument();
  });

  it('shows TARGET NOT FOUND for completely unknown machine', () => {
    render(
      <MemoryRouter initialEntries={['/target/non-existent-box']}>
        <Routes>
          <Route path="/target/:id" element={<TargetDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('TARGET NOT FOUND')).toBeInTheDocument();
  });
});
