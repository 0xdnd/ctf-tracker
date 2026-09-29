import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { useCtfStore } from '../../store/useCtfStore';
import { Machine } from '../../types';
import * as helpers from '../../utils/helpers';

describe('UnifiedHeader Responsive Density & Direct Inline Variables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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

  it('renders quick action buttons with appropriate aria labels and titles without notes pill or HUD popover', () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Deploy.*Custom Lab Target/i)).toBeDefined();
    expect(screen.getByLabelText('Scans Hub')).toBeDefined();
    expect(screen.getByLabelText(/RevShell.*Reverse Shell Crafter/i)).toBeDefined();
    expect(screen.getByLabelText(/Snippets.*Tactical Snippets Drawer/i)).toBeDefined();
    expect(screen.getByLabelText('Buy Coffee')).toBeDefined();

    // R1: Notes workspace toggle pill button is completely removed
    expect(screen.queryByLabelText('Notes Workspace')).toBeNull();

    // R2: HUD popover dropdown button is completely removed
    expect(screen.queryByLabelText(/HUD - Tactical HUD Variables/i)).toBeNull();
  });

  it('renders direct inline L | R | P variables with direct editing and 1-click clipboard copy', () => {
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);
    const soundSpy = vi.spyOn(helpers, 'playCyberSound');

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    // LHOST (L)
    const lhostInput = screen.getByLabelText('Attacker IP (LHOST)') as HTMLInputElement;
    expect(lhostInput.value).toBe('10.10.14.88');
    fireEvent.change(lhostInput, { target: { value: '10.10.14.99' } });
    expect(useCtfStore.getState().globalVars.lhost).toBe('10.10.14.99');

    // RHOST (R)
    const targetInput = screen.getByLabelText('Target IP (RHOST)') as HTMLInputElement;
    expect(targetInput.value).toBe('10.10.10.218');
    fireEvent.change(targetInput, { target: { value: '10.10.10.220' } });
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

  it('suppresses audio feedback on copy when soundEnabled is false', () => {
    useCtfStore.setState({ soundEnabled: false });
    const soundSpy = vi.spyOn(helpers, 'playCyberSound');
    const copySpy = vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    const copyLhostBtn = screen.getByLabelText('Copy LHOST');
    fireEvent.click(copyLhostBtn);

    expect(copySpy).toHaveBeenCalledWith('10.10.14.88');
    expect(soundSpy).not.toHaveBeenCalledWith('copy');
  });

  it('handles extremely long strings (250+ chars) in LHOST/RHOST without breaking or crashing', () => {
    render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    const longDomain = 'subdomain.'.repeat(25) + 'target-infrastructure.internal.corp';
    const targetInput = screen.getByLabelText('Target IP (RHOST)') as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: longDomain } });

    expect(useCtfStore.getState().globalVars.targetIp).toBe(longDomain);
    expect(targetInput.value).toBe(longDomain);
    expect(targetInput.getAttribute('title')).toBe(longDomain);
  });

  it('associates visible L, R, P label elements with input fields via htmlFor', () => {
    const { container } = render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

    const lhostLabel = container.querySelector('label[for="unified-lhost"]');
    const targetLabel = container.querySelector('label[for="unified-target-ip"]');
    const lportLabel = container.querySelector('label[for="unified-lport"]');

    expect(lhostLabel).not.toBeNull();
    expect(lhostLabel?.textContent?.trim()).toBe('L');

    expect(targetLabel).not.toBeNull();
    expect(targetLabel?.textContent?.trim()).toBe('R');

    expect(lportLabel).not.toBeNull();
    expect(lportLabel?.textContent?.trim()).toBe('P');
  });

  it('handles empty variable copy gracefully without crashing or invoking safeCopyToClipboard', () => {
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

    const copyLhostBtn = screen.getByLabelText('Copy LHOST');
    fireEvent.click(copyLhostBtn);
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('resets checkmark indicator after 1500ms and cleans up on rapid clicks', () => {
    vi.spyOn(helpers, 'safeCopyToClipboard').mockResolvedValue(true);

    const { container } = render(
      <MemoryRouter>
        <UnifiedHeader />
      </MemoryRouter>
    );

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

