import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { EvidenceVaultPage } from './EvidenceVaultPage';
import { useCtfStore } from '../store/useCtfStore';

describe('EvidenceVaultPage component', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      machines: [
        {
          id: 'box-1',
          name: 'Lame',
          ip: '10.10.10.3',
          platform: 'HTB',
          os: 'Linux',
          tags: ['Samba', 'SMB'],
          certifications: ['OSCP'],
          difficulty: 'Easy',
          status: 'root',
          userFlag: 'c4ca4238a0b923820dcc509a6f75849b',
          rootFlag: 'c81e728d9d4c2f636f067f89cc14862c',
          userPwnedAt: '2026-09-01T10:00:00Z',
          rootPwnedAt: '2026-09-01T11:00:00Z',
          timeSpentSeconds: 3600,
          quickNotes: 'Credentials: admin:SuperSecretPass123! found in smb share',
          createdAt: '2026-09-01T09:00:00Z',
          updatedAt: '2026-09-01T11:00:00Z',
        },
        {
          id: 'box-2',
          name: 'Forest',
          ip: '10.10.10.161',
          platform: 'HTB',
          os: 'Windows',
          tags: ['Active Directory', 'Kerberos'],
          certifications: ['OSCP', 'CPTS'],
          difficulty: 'Medium',
          status: 'foothold',
          userFlag: 'eccbc87e4b5ce2fe28308fd9f2a7baf3',
          timeSpentSeconds: 1800,
          quickNotes: 'Hash: svc-alfresco:$krb5asrep$23$svc-alfresco@HTB.LOCAL',
          createdAt: '2026-09-02T09:00:00Z',
          updatedAt: '2026-09-02T10:00:00Z',
        },
      ],
      globalVars: {
        lhost: '10.10.14.25',
        lport: '4444',
        targetIp: '10.10.10.3',
        interface: 'tun0',
        customVars: {},
      },
      soundEnabled: false,
    });
  });

  it('renders Evidence & Loot Vault title and KPI summary stats', () => {
    render(
      <BrowserRouter>
        <EvidenceVaultPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Evidence vault' })).toBeInTheDocument();
    // Verify KPI counters exist
    expect(screen.getByText('Total artifacts')).toBeInTheDocument();
    expect(screen.getByText('Flags captured')).toBeInTheDocument();
  });

  it('aggregates flags and extracted credentials from store machines', () => {
    render(
      <BrowserRouter>
        <EvidenceVaultPage />
      </BrowserRouter>
    );

    // Should find Lame and Forest entries
    expect(screen.getAllByText('Lame').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Forest').length).toBeGreaterThan(0);

    // Flags should be categorized
    expect(screen.getAllByText('Root Flag').length).toBeGreaterThan(0);
    expect(screen.getAllByText('User Flag').length).toBeGreaterThan(0);
  });

  it('filters vault items by search query', () => {
    render(
      <BrowserRouter>
        <EvidenceVaultPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search credentials/i);
    fireEvent.change(searchInput, { target: { value: 'Forest' } });

    expect(screen.queryByText('Forest')).toBeInTheDocument();
    expect(screen.queryByText('Lame')).not.toBeInTheDocument();
  });

  it('toggles secret visibility between masked and unmasked', () => {
    render(
      <BrowserRouter>
        <EvidenceVaultPage />
      </BrowserRouter>
    );

    // Initially secrets should be masked by default
    const maskedElements = screen.getAllByText(/••••/);
    expect(maskedElements.length).toBeGreaterThan(0);

    // Click "Reveal All" button
    const revealAllBtn = screen.getByRole('button', { name: /Reveal all/i });
    fireEvent.click(revealAllBtn);

    // Secret should now be visible
    expect(screen.getByText('c81e728d9d4c2f636f067f89cc14862c')).toBeInTheDocument();

    // Click "Mask All" button
    const maskAllBtn = screen.getByRole('button', { name: /Mask all/i });
    fireEvent.click(maskAllBtn);

    // Secret should be masked again
    expect(screen.queryByText('c81e728d9d4c2f636f067f89cc14862c')).not.toBeInTheDocument();
  });

  it('allows logging custom loot through the modal', async () => {
    render(
      <BrowserRouter>
        <EvidenceVaultPage />
      </BrowserRouter>
    );

    // Open add modal
    const logBtn = screen.getByRole('button', { name: /Log evidence/i });
    fireEvent.click(logBtn);

    expect(screen.getByText('Log new evidence')).toBeInTheDocument();

    // Fill form
    const usernameInput = screen.getByPlaceholderText(/e\.g\. Administrator/i);
    const secretInput = screen.getByPlaceholderText(/Paste password, hash/i);

    fireEvent.change(usernameInput, { target: { value: 'backup_admin' } });
    fireEvent.change(secretInput, { target: { value: 'Spring2026!Pwned' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Save to Vault/i });
    fireEvent.click(saveBtn);

    // Modal closes and item appears
    await waitFor(() => {
      expect(screen.queryByText('Log new evidence')).not.toBeInTheDocument();
    });

    expect(screen.getByText('backup_admin')).toBeInTheDocument();
  });

  it('exports CSV with formula guard, BOM and CRLF', async () => {
    const payload = "=cmd|' /C calc'!A0";
    useCtfStore.setState({
      machines: [
        {
          id: 'box-x',
          name: 'Evil',
          ip: '10.10.10.9',
          platform: 'HTB',
          os: 'Linux',
          tags: [],
          certifications: [],
          difficulty: 'Easy',
          status: 'foothold',
          userFlag: payload,
          timeSpentSeconds: 0,
          quickNotes: `Credentials: ${payload}:pw`,
          createdAt: '2026-09-02T09:00:00Z',
          updatedAt: '2026-09-02T10:00:00Z',
        },
      ],
    });
    let blob: Blob | undefined;
    const createUrl = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:test';
    });
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <EvidenceVaultPage />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Download CSV' }));

    expect(blob).toBeDefined();
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    expect(text).toContain('\r\n');
    expect(text).not.toMatch(/(?<!\r)\n/);
    expect(text).toContain(`'${payload}`);
    expect(text).not.toMatch(/(^|,)=cmd/m);
  });
});
