import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { useCtfStore } from '../../store/useCtfStore';
import { Machine } from '../../types';
import * as helpers from '../../utils/helpers';
import { openSessionPanel } from './openSessionPanel';

// jsdom has no 2D canvas: the flag toggles in the Session popover fire confetti, whose timer then hits a null context.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('UnifiedHeader: calm bar, Session popover for variables and tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
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
      soundEnabled: true,
      activeTargetId: 'htb-luanne',
      machines: [
        {
          id: 'htb-luanne',
          name: 'Luanne',
          ip: '10.10.10.218',
          platform: 'HTB',
          status: 'foothold',
          difficulty: 'Easy',
          os: 'BSD',
          tags: ['BSD', 'OpenBSD'],
          certifications: ['CPTS'],
          timeSpentSeconds: 120,
          createdAt: new Date().toISOString()
        } as Machine
      ],
      globalVars: {
        lhost: '10.10.14.88',
        lport: '4444',
        targetIp: '10.10.10.218',
        interface: 'tun0',
        customVars: {}
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders brand logo and active target capsule cleanly', () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    expect(screen.getByText('ZERO')).toBeDefined();
    expect(screen.getByText('BOX')).toBeDefined();
    expect(screen.getByText('Luanne')).toBeDefined();
  });

  it('keeps the bar to the essentials and moves the quick tools into the Session popover', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    // Always visible: search, theme, profile, settings, RHOST chip, Session button.
    expect(screen.getByLabelText(/open command palette/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copy RHOST 10.10.10.218' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Session' })).toBeDefined();
    expect(screen.queryByLabelText('Buy Coffee')).toBeNull();

    // Everything else waits inside the popover, so none of it is in the bar.
    expect(screen.queryByLabelText('Scans Hub')).toBeNull();
    expect(screen.queryByLabelText('Attacker IP (LHOST)')).toBeNull();

    // R1: Notes workspace toggle pill button is completely removed
    expect(screen.queryByLabelText('Notes Workspace')).toBeNull();

    // R2: HUD popover dropdown button is completely removed
    expect(screen.queryByLabelText(/HUD - Tactical HUD Variables/i)).toBeNull();

    await openSessionPanel();
    expect(screen.getByRole('button', { name: 'Add target' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Scans Hub' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reverse Shell Crafter' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Snippets' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Field notes' })).toBeDefined();
  });

  it('copies RHOST in one click from the bar', () => {
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy RHOST 10.10.10.218' }));
    expect(copySpy).toHaveBeenCalledWith('10.10.10.218');
  });

  it('copies LHOST in two clicks: open Session, then the copy button', async () => {
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();
    fireEvent.click(screen.getByLabelText('Copy LHOST'));
    expect(copySpy).toHaveBeenCalledWith('10.10.14.88');
  });

  it('moves focus into the Session popover on open, and Escape closes it and returns focus to the trigger', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    const trigger = screen.getByRole('button', { name: 'Session' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const panel = await openSessionPanel();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Session' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the Session popover on an outside press', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
        <button type="button">elsewhere</button>
      </MemoryRouter>
    );
    await openSessionPanel();
    fireEvent.mouseDown(screen.getByText('elsewhere'));
    expect(screen.queryByRole('dialog', { name: 'Session' })).toBeNull();
  });

  it('runs a quick tool from the popover and closes it', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Scans Hub' }));
    expect(useCtfStore.getState().reconAutomationModalOpen).toBe(true);
    expect(screen.queryByRole('dialog', { name: 'Session' })).toBeNull();
  });

  it('keeps the stopwatch controls and user/root flag shortcuts reachable in the popover', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();
    fireEvent.click(screen.getByTitle('Start Stopwatch'));
    expect(useCtfStore.getState().isTimerRunning).toBe(true);
    expect(screen.getByTitle('Reset Stopwatch')).toBeDefined();
    fireEvent.click(screen.getByTitle('1-Click: Toggle Root Flag (Celebration!)'));
    expect(useCtfStore.getState().machines[0].status).toBe('root');
  });

  it('renders LHOST | RHOST | LPORT in the popover with direct editing and clipboard copy', async () => {
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
    const soundSpy = vi.spyOn(helpers, 'playCyberSound');

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();

    // LHOST (L)
    const lhostInput = screen.getByLabelText('Attacker IP (LHOST)') as HTMLInputElement;
    expect(lhostInput.value).toBe('10.10.14.88');
    fireEvent.change(lhostInput, { target: { value: '10.10.14.99' } });
    expect(useCtfStore.getState().globalVars.lhost).toBe('10.10.14.99');

    // RHOST (R)
    const targetInput = screen.getByLabelText('Target IP (RHOST)') as HTMLInputElement;
    expect(targetInput.value).toBe('10.10.10.218');
    fireEvent.change(targetInput, { target: { value: '10.10.10.220' } });
    fireEvent.blur(targetInput); // R commits on blur / Enter, not per keystroke
    expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.10.220');

    // LPORT (P)
    const lportInput = screen.getByLabelText('Listener Port (LPORT)') as HTMLInputElement;
    expect(lportInput.value).toBe('4444');
    fireEvent.change(lportInput, { target: { value: '9001' } });
    expect(useCtfStore.getState().globalVars.lport).toBe('9001');

    // 1-Click Copy Buttons
    const copyLhostBtn = screen.getByLabelText('Copy LHOST');
    const copyTargetBtn = screen.getByLabelText('Copy Target IP');
    const copyLportBtn = screen.getByLabelText('Copy LPORT');

    expect(copyLhostBtn).toBeDefined();
    expect(copyTargetBtn).toBeDefined();
    expect(copyLportBtn).toBeDefined();

    fireEvent.click(copyLhostBtn);
    expect(copySpy).toHaveBeenCalledWith('10.10.14.99');
    expect(soundSpy).toHaveBeenCalledWith('copy');

    fireEvent.click(copyTargetBtn);
    expect(copySpy).toHaveBeenCalledWith('10.10.10.220');

    fireEvent.click(copyLportBtn);
    expect(copySpy).toHaveBeenCalledWith('9001');
  });

  it('suppresses audio feedback on copy when soundEnabled is false', async () => {
    useCtfStore.setState({ soundEnabled: false });
    const soundSpy = vi.spyOn(helpers, 'playCyberSound');
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();

    const copyLhostBtn = screen.getByLabelText('Copy LHOST');
    fireEvent.click(copyLhostBtn);

    expect(copySpy).toHaveBeenCalledWith('10.10.14.88');
    expect(soundSpy).not.toHaveBeenCalledWith('copy');
  });

  it('handles extremely long strings (250+ chars) in LHOST/RHOST without breaking or crashing', async () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();

    const longDomain = 'subdomain.'.repeat(25) + 'target-infrastructure.internal.corp';
    const targetInput = screen.getByLabelText('Target IP (RHOST)') as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: longDomain } });
    fireEvent.blur(targetInput);

    expect(useCtfStore.getState().globalVars.targetIp).toBe(longDomain);
    expect(targetInput.value).toBe(longDomain);
    expect(targetInput.getAttribute('title')).toBe(longDomain);
  });

  it('associates visible LHOST, RHOST, LPORT label elements with input fields via htmlFor', async () => {
    const { container } = render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();

    const lhostLabel = container.querySelector('label[for="unified-lhost"]');
    const targetLabel = container.querySelector('label[for="unified-target-ip"]');
    const lportLabel = container.querySelector('label[for="unified-lport"]');

    expect(lhostLabel).not.toBeNull();
    expect(lhostLabel?.textContent?.trim()).toBe('LHOST');

    expect(targetLabel).not.toBeNull();
    expect(targetLabel?.textContent?.trim()).toBe('RHOST');

    expect(lportLabel).not.toBeNull();
    expect(lportLabel?.textContent?.trim()).toBe('LPORT');
  });

  it('handles empty variable copy gracefully without crashing or invoking safeCopyToClipboard', async () => {
    useCtfStore.setState({
      globalVars: {
        lhost: '',
        lport: '',
        targetIp: '',
        interface: '',
        customVars: {}
      }
    });

    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard');

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );
    await openSessionPanel();

    const copyLhostBtn = screen.getByLabelText('Copy LHOST');
    fireEvent.click(copyLhostBtn);
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('resets checkmark indicator after 1500ms and cleans up on rapid clicks', async () => {
    vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

    render(
          <MemoryRouter>
              <UnifiedHeader />
          </MemoryRouter>
      );
    await openSessionPanel();

    const copyLhostBtn = screen.getByLabelText('Copy LHOST');

    // Click once
    fireEvent.click(copyLhostBtn);
    expect(copyLhostBtn.querySelector('.lucide-check')).not.toBeNull();

    // Click again rapidly
    fireEvent.click(copyLhostBtn);
    expect(copyLhostBtn.querySelector('.lucide-check')).not.toBeNull();

    // Fast-forward 1500ms
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Check that button no longer shows check icon and restores copy icon
    expect(copyLhostBtn.querySelector('.lucide-check')).toBeNull();
    expect(copyLhostBtn.querySelector('.lucide-copy')).not.toBeNull();
  });
});

