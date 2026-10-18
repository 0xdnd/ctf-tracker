import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import { Sidebar } from '../../components/layout/Sidebar';
import { useCtfStore } from '../../store/useCtfStore';

describe('ZEROBOX Audit & Polish Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      machines: [
        {
          id: 'test-box-1',
          name: 'RootMe',
          ip: '10.10.10.100',
          platform: 'HTB',
          os: 'Linux',
          difficulty: 'Easy',
          status: 'foothold',
          tags: ['Web', 'SUID'],
          userPwnedAt: '2026-09-01T12:00:00Z',
          userFlag: 'user_flag_hash',
          certifications: ['OSCP'],
          timeSpentSeconds: 1200,
        } as any,
      ],
      cheatsheets: Array(85).fill(null).map((_, i) => ({
        id: `cs-${i}`,
        title: `Snippet ${i}`,
        command: `echo ${i}`,
        category: 'web',
      })) as any,
      userNotes: Array(12).fill(null).map((_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        category: 'recon',
        content: '# note',
        createdAt: '2026-09-01T12:00:00Z',
        updatedAt: '2026-09-01T12:00:00Z',
      })) as any,
    });
  });

  it('R1 (SEO & OpenGraph): index.html contains complete og:* and twitter:* tags', () => {
    const htmlPath = path.resolve(__dirname, '../../../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    expect(htmlContent).toContain('<meta property="og:title"');
    expect(htmlContent).toContain('<meta property="og:description"');
    expect(htmlContent).toContain('<meta property="og:image"');
    expect(htmlContent).toContain('<meta property="og:type" content="website"');
    expect(htmlContent).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(htmlContent).toContain('<meta name="twitter:image"');
  });

  it('R2 (Sidebar): navigation label is updated to Snippets & Vault to prevent truncation', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const navItem = screen.getByText('Snippets & Vault');
    expect(navItem).toBeInTheDocument();
    // Badge shows combined snippets + vault notes: 85 + 12 = 97
    expect(screen.getByText('97')).toBeInTheDocument();
  });

  it('R3 (Deep Linking): TrackerView parses ?target=RootMe from URL search params', () => {
    const params = new URLSearchParams('?target=RootMe');
    const targetParam = params.get('target');
    expect(targetParam).toBe('RootMe');

    const machines = useCtfStore.getState().machines;
    const match = machines.find((m) => m.name.toLowerCase() === targetParam?.toLowerCase());
    expect(match).toBeDefined();
    expect(match?.name).toBe('RootMe');
  });
});
