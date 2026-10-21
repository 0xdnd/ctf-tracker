import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MachineSummaryStrip } from './MachineSummaryStrip';
import { getMachineLoot } from '../../utils/machineLoot';
import type { MachineLoot } from '../../utils/machineLoot';
import type { Machine } from '../../types';
import type { Credential } from '../../types/loot';

const M = 'box-1';

function makeMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: M,
    name: 'Lame',
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
    ...overrides,
  } as Machine;
}

const cred = (id: string, extra: Partial<Credential> = {}): Credential => ({
  id,
  type: 'password',
  username: id,
  secret: 's',
  createdAt: '2026-01-01',
  ...extra,
});

const loot = (credentials: Credential[] = [], machineId = M): MachineLoot =>
  getMachineLoot({ credentials, credAttempts: [], lootItems: [] }, machineId);

afterEach(() => cleanup());

describe('MachineSummaryStrip', () => {
  it('shows the right counts', () => {
    const credentials = [
      cred('w', { verifications: { [M]: { status: 'user' } } }),
      cred('f', { sourceMachineId: M }),
      cred('t1'),
    ];
    const machine = makeMachine({
      services: [{ port: 22, protocol: 'tcp', service: 'ssh' }] as Machine['services'],
      findings: [{ id: 'a', title: 'A', severity: 'high' }] as Machine['findings'],
    });
    render(<MachineSummaryStrip machine={machine} machineLoot={loot(credentials)} onNavigate={() => {}} />);
    const strip = screen.getByTestId('machine-summary-strip');
    expect(within(strip).getByRole('button', { name: /^Stage: Recon/ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Access: User/ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Ports: 1\./ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Credentials: 1 work here, 1 found here/ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Not tried here: 2/ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Findings: 1\./ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Checklist: \d+%/ })).toBeInTheDocument();
  });

  it('shows "via credential" when an admin credential beats a user flag', () => {
    const machine = makeMachine({ status: 'foothold', userFlag: 'abc' });
    const credentials = [cred('adm', { verifications: { [M]: { status: 'admin' } } })];
    render(<MachineSummaryStrip machine={machine} machineLoot={loot(credentials)} onNavigate={() => {}} />);
    expect(screen.getByRole('button', { name: /^Access: Root via credential/ })).toBeInTheDocument();
    expect(screen.getByText('via credential')).toBeInTheDocument();
  });

  it('hides the Not tried chip at 0', () => {
    render(<MachineSummaryStrip machine={makeMachine()} machineLoot={loot()} onNavigate={() => {}} />);
    expect(screen.queryByRole('button', { name: /Not tried here/ })).not.toBeInTheDocument();
  });

  it('shows "Nothing outstanding" for a completed machine', () => {
    render(
      <MachineSummaryStrip machine={makeMachine({ status: 'completed' })} machineLoot={loot()} onNavigate={() => {}} />,
    );
    expect(screen.getByText('Nothing outstanding')).toBeInTheDocument();
  });

  it('lists outstanding items, and a pro-lab target has no flag items', () => {
    const { unmount } = render(
      <MachineSummaryStrip machine={makeMachine()} machineLoot={loot()} onNavigate={() => {}} />,
    );
    expect(screen.getByText(/User flag · Root flag · No ports recorded/)).toBeInTheDocument();
    unmount();

    const proLab = makeMachine({ id: 'custom-lab', platform: 'Custom', tags: ['pro-lab'], isCustom: true } as Partial<Machine>);
    render(<MachineSummaryStrip machine={proLab} machineLoot={loot([], 'custom-lab')} onNavigate={() => {}} />);
    const text = screen.getByTestId('machine-summary-strip').textContent ?? '';
    expect(text).not.toMatch(/User flag/);
    expect(text).not.toMatch(/Root flag/);
  });

  it('navigates to recon when Ports is clicked', () => {
    const onNavigate = vi.fn();
    render(<MachineSummaryStrip machine={makeMachine()} machineLoot={loot()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /^Ports:/ }));
    expect(onNavigate).toHaveBeenCalledWith('recon');
  });
});
