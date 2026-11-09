import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { GlobalHudVarsBar } from '../../components/methodology/GlobalHudVarsBar';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const box = (id: string, ip: string, extra: Partial<Machine> = {}) =>
  ({
    id,
    name: `Box ${id}`,
    ip,
    platform: 'HTB',
    status: 'foothold',
    difficulty: 'Easy',
    os: 'Linux',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }) as unknown as Machine;

const setup = (machines: Machine[], activeTargetId: string | null, targetIp = '') => {
  useCtfStore.setState({
    soundEnabled: false,
    machines,
    activeTargetId,
    unexportedChangesCount: 0,
    globalVars: { lhost: '10.10.14.1', lport: '4444', targetIp, interface: 'tun0', customVars: {} },
  } as never);
};

const header = () =>
  render(
    <MemoryRouter>
      <UnifiedHeader />
    </MemoryRouter>
  );

const rInput = () => screen.getByLabelText('Target IP (RHOST)') as HTMLInputElement;
const machineIp = (id: string) => useCtfStore.getState().machines.find((m) => m.id === id)!.ip;

describe('header R field follows the engaged target', () => {
  beforeEach(() => {
    window.matchMedia =
      window.matchMedia ||
      (vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as never);
  });
  afterEach(() => cleanup());

  it('shows the engaged machine IP, not a stale global RHOST', () => {
    setup([box('a', '10.10.10.5')], 'a', '10.10.10.99');
    header();
    expect(rInput().value).toBe('10.10.10.5');
  });

  it('never shows a placeholder machine IP; falls back to the global value', () => {
    setup([box('a', '10.10.10.X')], 'a', '10.10.10.77');
    header();
    expect(rInput().value).toBe('10.10.10.77');
  });

  it('saves into the engaged machine on blur, once, and not per keystroke', () => {
    setup([box('a', '10.10.10.5')], 'a', '10.10.10.5');
    header();
    fireEvent.change(rInput(), { target: { value: '10.10.10.6' } });
    expect(machineIp('a')).toBe('10.10.10.5');
    expect(useCtfStore.getState().unexportedChangesCount).toBe(0);
    fireEvent.blur(rInput());
    expect(machineIp('a')).toBe('10.10.10.6');
    expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.10.6');
    expect(useCtfStore.getState().unexportedChangesCount).toBe(1);
  });

  it('saves on Enter and sanitises a pasted URL', () => {
    setup([box('a', '10.10.10.5')], 'a', '10.10.10.5');
    header();
    rInput().focus(); // Enter commits by blurring the focused input
    fireEvent.change(rInput(), { target: { value: ' http://10.10.10.8/admin ' } });
    fireEvent.keyDown(rInput(), { key: 'Enter' });
    expect(machineIp('a')).toBe('10.10.10.8');
    expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.10.8');
  });

  it('leaves a live box (isActive) untouched and only updates the global value', () => {
    setup([box('live', '', { isActive: true })], 'live', '10.10.10.5');
    header();
    fireEvent.change(rInput(), { target: { value: '10.10.10.9' } });
    fireEvent.blur(rInput());
    expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.10.9');
    expect(machineIp('live')).toBe('');
    expect(useCtfStore.getState().unexportedChangesCount).toBe(0);
  });

  it('clearing R clears both the machine and the global IP', () => {
    setup([box('a', '10.10.10.5')], 'a', '10.10.10.5');
    header();
    fireEvent.change(rInput(), { target: { value: '' } });
    fireEvent.blur(rInput());
    expect(machineIp('a')).toBe('');
    expect(useCtfStore.getState().globalVars.targetIp).toBe('');
    expect(rInput().value).toBe('');
  });

  it('with nothing engaged it only edits the global value', () => {
    setup([box('a', '10.10.10.5')], null, '10.10.10.5');
    header();
    fireEvent.change(rInput(), { target: { value: '10.10.10.6' } });
    fireEvent.blur(rInput());
    expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.10.6');
    expect(machineIp('a')).toBe('10.10.10.5');
  });
});

describe('methodology HUD TARGET_IP follows the engaged target', () => {
  afterEach(() => cleanup());

  const openBar = () => {
    localStorage.setItem('zb.methodology.varsExpanded', '1');
    render(<GlobalHudVarsBar />);
    return screen.getByPlaceholderText('10.10.10.X') as HTMLInputElement;
  };

  it('shows the machine IP and writes edits to it on blur', () => {
    setup([box('a', '10.10.10.5')], 'a', '10.10.10.99');
    const input = openBar();
    expect(input.value).toBe('10.10.10.5');
    fireEvent.change(input, { target: { value: '10.10.10.6' } });
    expect(machineIp('a')).toBe('10.10.10.5');
    fireEvent.blur(input);
    expect(machineIp('a')).toBe('10.10.10.6');
    expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.10.6');
  });

  it('does not write a live box and supports clearing', () => {
    setup([box('live', '', { isActive: true })], 'live', '10.10.10.5');
    const input = openBar();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(useCtfStore.getState().globalVars.targetIp).toBe('');
    expect(machineIp('live')).toBe('');
    expect(useCtfStore.getState().unexportedChangesCount).toBe(0);
  });
});
