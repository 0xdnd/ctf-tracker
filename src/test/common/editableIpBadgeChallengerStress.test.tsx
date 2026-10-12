import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EditableIpBadge } from '../../components/common/EditableIpBadge';
import { useCtfStore } from '../../store/useCtfStore';
import * as helpers from '../../utils/helpers';
import fs from 'fs';
import path from 'path';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('Challenger M1_2 Empirical Stress Harness: EditableIpBadge & Hardware CSS Tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCtfStore.setState({
      machines: [
        {
          id: 'test-mach-1',
          name: 'Test Machine 1',
          ip: '10.10.11.100',
          os: 'Linux',
          platform: 'HTB',
          difficulty: 'Easy',
          status: 'backlog',
          tags: [],
          certifications: ['OSCP'],
          timeSpentSeconds: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      soundEnabled: true,
      assignIpMachineId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. EditableIpBadge Tabular Numerals & Zero-Jitter Invariant', () => {
    it('applies tabular-nums class to container, badge wrapper, and text span for standard IP', () => {
      const { container } = render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" size="xs" showLabel />
      );

      const rootDiv = container.firstElementChild as HTMLElement;
      expect(rootDiv).toBeTruthy();
      expect(rootDiv.className).toContain('tabular-nums');

      const badgeWrapper = rootDiv.querySelector('div') as HTMLElement;
      expect(badgeWrapper).toBeTruthy();
      expect(badgeWrapper.className).toContain('tabular-nums');

      const ipSpan = screen.getByText('10.10.11.100');
      expect(ipSpan.className).toContain('tabular-nums');
      expect(ipSpan.className).toContain('font-bold');
    });

    it('applies tabular-nums class across various IP formats without font clipping', () => {
      const ipSamples = [
        '10.10.10.1',
        '192.168.1.254',
        '255.255.255.255',
        '111.111.111.111',
        '888.888.888.888',
        'fe80::1ff:fe23:4567:890a',
      ];

      for (const sample of ipSamples) {
        const { unmount } = render(
          <EditableIpBadge machineId="test-mach-1" initialIp={sample} size="md" />
        );
        const span = screen.getByText(sample);
        expect(span).toBeTruthy();
        expect(span.className).toContain('tabular-nums');
        // Verify no restrictive fixed-width container clipping the text
        const parentBadge = span.parentElement;
        expect(parentBadge?.className).not.toContain('w-');
        expect(parentBadge?.className).not.toContain('max-w-');
        unmount();
      }
    });

    it('enforces tabular-nums on placeholder / dynamic spawned IP badges', () => {
      const { container, rerender } = render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.x.x" size="xs" />
      );

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('tabular-nums');

      const actionButton = screen.getByRole('button', { name: /Set IP \(10\.10\.x\.x\)/i });
      expect(actionButton.className).toContain('tabular-nums');

      // Test with completely empty IP
      rerender(<EditableIpBadge machineId="test-mach-1" initialIp="" size="xs" />);
      const emptyActionButton = screen.getByRole('button', { name: /Set dynamic IP/i });
      expect(emptyActionButton.className).toContain('tabular-nums');
    });

    it('enforces tabular-nums in active input editing mode', () => {
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" size="sm" />
      );

      const editBtn = screen.getByRole('button', { name: /Change target IP/i });
      fireEvent.click(editBtn);

      const input = screen.getByRole('textbox', { name: /Edit machine IP address/i }) as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.className).toContain('tabular-nums');
      expect(input.value).toBe('10.10.11.100');

      // Container also enforces tabular-nums
      const containerDiv = input.closest('div');
      expect(containerDiv?.className).toContain('tabular-nums');
    });
  });

  describe('2. Universal Tactile Compression (active:scale-[0.97])', () => {
    it('applies active:scale-[0.97] to all interactive buttons in standard view mode', () => {
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" size="xs" />
      );

      const copyBtn = screen.getByRole('button', { name: /Copy IP/i });
      expect(copyBtn.className).toContain('active:scale-[0.97]');

      const editBtn = screen.getByRole('button', { name: /Change target IP/i });
      expect(editBtn.className).toContain('active:scale-[0.97]');
    });

    it('applies active:scale-[0.97] to placeholder action and edit buttons', () => {
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.x.x" size="xs" />
      );

      const setIpBtn = screen.getByRole('button', { name: /Set IP \(10\.10\.x\.x\)/i });
      expect(setIpBtn.className).toContain('active:scale-[0.97]');

      const editInlineBtn = screen.getByRole('button', { name: /Edit IP inline/i });
      expect(editInlineBtn.className).toContain('active:scale-[0.97]');
    });

    it('applies active:scale-[0.97] to Save and Cancel buttons in editing mode', () => {
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" size="sm" />
      );

      fireEvent.click(screen.getByRole('button', { name: /Change target IP/i }));

      const saveBtn = screen.getByTitle(/Save IP \(Enter\)/i);
      expect(saveBtn.className).toContain('active:scale-[0.97]');

      const cancelBtn = screen.getByTitle(/Cancel \(Esc\)/i);
      expect(cancelBtn.className).toContain('active:scale-[0.97]');
    });
  });

  describe('3. Lifecycle & Interaction Integrity', () => {
    it('sanitizes input and updates store on save', () => {
      const onSaved = vi.fn();
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" onSaved={onSaved} />
      );

      fireEvent.click(screen.getByRole('button', { name: /Change target IP/i }));
      const input = screen.getByRole('textbox', { name: /Edit machine IP address/i });

      // User enters URL prefix and trailing slash
      fireEvent.change(input, { target: { value: 'https://10.10.11.105/admin' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Checks sanitized value
      const updatedMach = useCtfStore.getState().machines.find((m) => m.id === 'test-mach-1');
      expect(updatedMach?.ip).toBe('10.10.11.105');
      expect(onSaved).toHaveBeenCalledWith('10.10.11.105');
    });

    it('reverts value on Escape key without updating store', () => {
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" />
      );

      fireEvent.click(screen.getByRole('button', { name: /Change target IP/i }));
      const input = screen.getByRole('textbox', { name: /Edit machine IP address/i });

      fireEvent.change(input, { target: { value: '1.2.3.4' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Still displays initial IP
      expect(screen.getByText('10.10.11.100')).toBeTruthy();
      const mach = useCtfStore.getState().machines.find((m) => m.id === 'test-mach-1');
      expect(mach?.ip).toBe('10.10.11.100');
    });

    it('triggers clipboard copy and plays cyber sound on copy click', () => {
      const spySound = vi.spyOn(helpers, 'playCyberSound');
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.11.100" />
      );

      const copyBtn = screen.getByRole('button', { name: /Copy IP/i });
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('10.10.11.100');
      expect(spySound).toHaveBeenCalledWith('copy');
    });

    it('sets assignIpMachineId in store when clicking placeholder button', () => {
      render(
        <EditableIpBadge machineId="test-mach-1" initialIp="10.10.x.x" />
      );

      const setBtn = screen.getByRole('button', { name: /Set IP \(10\.10\.x\.x\)/i });
      fireEvent.click(setBtn);

      expect(useCtfStore.getState().assignIpMachineId).toBe('test-mach-1');
    });
  });

  describe('4. Empirical CSS Specification & Token Verification', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js');
    const cssContent = fs.readFileSync(cssPath, 'utf-8').replace(/\r\n/g, '\n');
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8').replace(/\r\n/g, '\n');

    it('verifies .machined-edge specification matches PROJECT.md contract exactly', () => {
      expect(cssContent).toContain(
        '.machined-edge {\n  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.03);\n}'
      );
    });

    it('verifies .machined-edge-subtle specification is defined for dark surfaces', () => {
      expect(cssContent).toContain(
        '.machined-edge-subtle {\n  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.02);\n}'
      );
    });

    it('verifies .tabular-nums and body font-variant-numeric: tabular-nums are present', () => {
      expect(cssContent).toMatch(/body\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/);
      expect(cssContent).toMatch(/\.tabular-nums\s*\{[^}]*font-variant-numeric:\s*tabular-nums;\s*\}/);
    });

    it('verifies .interactive-button:active uses scale(0.97)', () => {
      expect(cssContent).toMatch(/\.interactive-button:active\s*\{[^}]*transform:\s*scale\(0\.97\);/);
    });

    it('verifies tailwind.config.js extends boxShadow machined tokens', () => {
      expect(tailwindContent).toContain("machined: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.03)'");
      expect(tailwindContent).toContain("'machined-subtle': 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.02)'");
    });

    it('verifies tailwind.config.js defines tactical accent colors (lime and azure)', () => {
      expect(tailwindContent).toContain("lime: '#9fef00'");
      expect(tailwindContent).toContain("azure: '#0ea5e9'");
    });

    it('verifies tactical focus indicator does not break under dark mode', () => {
      expect(cssContent).toContain('.tactical-focus:focus-visible');
      expect(cssContent).toContain('0 0 0 2px #09090b, 0 0 0 4px #0ea5e9');
    });
  });
});
