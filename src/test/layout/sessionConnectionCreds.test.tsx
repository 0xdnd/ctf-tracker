import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { useCtfStore } from '../../store/useCtfStore';
import type { Credential, Machine } from '../../types';
import * as helpers from '../../utils/helpers';
import { resolveTemplate } from '../../utils/variableSubstitution';
import { openSessionPanel } from './openSessionPanel';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const sampleMachine: Machine = {
  id: 'htb-forest',
  name: 'Forest',
  ip: '10.10.10.161',
  platform: 'HTB',
  status: 'recon',
  difficulty: 'Easy',
  os: 'Windows',
  tags: ['AD'],
  certifications: ['OSCP'],
  timeSpentSeconds: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  domain: 'htb.local',
};

const sampleCred: Credential = {
  id: 'cred-1',
  type: 'password',
  username: 'svc-alfresco',
  domain: 'htb.local',
  secret: 's3rvice',
  sourceMachineId: 'htb-forest',
  createdAt: new Date().toISOString(),
};

describe('SessionPanel Target & AD Credentials HUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    useCtfStore.setState({
      soundEnabled: false,
      activeTargetId: sampleMachine.id,
      machines: [sampleMachine],
      credentials: [sampleCred],
      globalVars: {
        lhost: '10.10.14.12',
        lport: '4444',
        targetIp: '10.10.10.161',
        interface: 'tun0',
        domain: '',
        dcIp: '',
        user: '',
        cred: '',
        customVars: {},
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps Target & AD creds collapsed when all 4 fields are empty, and expands on click', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>,
    );
    await openSessionPanel();

    const toggle = screen.getByRole('button', { name: /target & ad creds/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText('Target Domain (DOMAIN)')).toBeNull();
    expect(toggle.textContent).toContain('Vault (1)');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByLabelText('Target Domain (DOMAIN)')).toBeDefined();
    expect(screen.getByLabelText('Domain Controller IP (DC_IP)')).toBeDefined();
    expect(screen.getByLabelText('Target Username (USER)')).toBeDefined();
    expect(screen.getByLabelText('Target Password or Hash (PASS)')).toBeDefined();
  });

  it('auto-expands when any credential field is already populated and masks password by default', async () => {
    useCtfStore.setState({
      globalVars: {
        ...useCtfStore.getState().globalVars,
        domain: 'corp.local',
        user: 'alice',
        cred: 'P@ssw0rd!',
      },
    });

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>,
    );
    await openSessionPanel();

    const toggle = screen.getByRole('button', { name: /target & ad creds/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    const passInput = screen.getByLabelText('Target Password or Hash (PASS)') as HTMLInputElement;
    expect(passInput.type).toBe('password');
    expect(passInput.value).toBe('P@ssw0rd!');

    const revealBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(revealBtn);
    expect(passInput.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();
  });

  it('persists DOMAIN, DC_IP, USER, PASS to globalVars, supports 1-click copy, and resolves command templates', async () => {
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>,
    );
    await openSessionPanel();
    fireEvent.click(screen.getByRole('button', { name: /target & ad creds/i }));

    fireEvent.change(screen.getByLabelText('Target Domain (DOMAIN)'), { target: { value: 'ad.local' } });
    fireEvent.change(screen.getByLabelText('Domain Controller IP (DC_IP)'), { target: { value: '10.10.10.5' } });
    fireEvent.change(screen.getByLabelText('Target Username (USER)'), { target: { value: 'bob' } });
    fireEvent.change(screen.getByLabelText('Target Password or Hash (PASS)'), { target: { value: 'Winter2026!' } });

    const vars = useCtfStore.getState().globalVars;
    expect(vars.domain).toBe('ad.local');
    expect(vars.dcIp).toBe('10.10.10.5');
    expect(vars.user).toBe('bob');
    expect(vars.cred).toBe('Winter2026!');

    fireEvent.click(screen.getByLabelText('Copy DOMAIN'));
    expect(copySpy).toHaveBeenCalledWith('ad.local');
    fireEvent.click(screen.getByLabelText('Copy DC IP'));
    expect(copySpy).toHaveBeenCalledWith('10.10.10.5');
    fireEvent.click(screen.getByLabelText('Copy USER'));
    expect(copySpy).toHaveBeenCalledWith('bob');
    fireEvent.click(screen.getByLabelText('Copy PASS'));
    expect(copySpy).toHaveBeenCalledWith('Winter2026!');

    const resolved = resolveTemplate('nxc smb {DC_IP} -d {DOMAIN} -u {USER} -p {CRED}', vars);
    expect(resolved.text).toBe('nxc smb 10.10.10.5 -d ad.local -u bob -p Winter2026!');
    expect(resolved.unresolved).toEqual([]);
  });

  it('loads domain, username, and secret in one click from active target Vault credentials', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>,
    );
    await openSessionPanel();
    fireEvent.click(screen.getByRole('button', { name: /target & ad creds/i }));

    const vaultChip = screen.getByRole('button', { name: /htb\.local\\svc-alfresco/i });
    fireEvent.click(vaultChip);

    const vars = useCtfStore.getState().globalVars;
    expect(vars.domain).toBe('htb.local');
    expect(vars.user).toBe('svc-alfresco');
    expect(vars.cred).toBe('s3rvice');
  });
});
