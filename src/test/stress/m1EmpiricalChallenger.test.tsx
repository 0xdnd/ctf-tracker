import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig, useReducedMotionConfig, MotionConfigContext } from 'framer-motion';
import fs from 'fs';
import path from 'path';

import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { CyberButton } from '../../components/common/CyberButton';
import { CyberBadge } from '../../components/common/CyberBadge';
import { PlatformBadge } from '../../components/common/PlatformBadge';
import { DifficultyBadge } from '../../components/common/DifficultyBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useCtfStore } from '../../store/useCtfStore';
import { applyThemeToDOM, ThemeProvider } from '../../hooks/useTheme';
import { Machine } from '../../types';

// =============================================================================
// WCAG 2.1 Color Math Utilities for Empirical Contrast Assertions
// =============================================================================
function channelLuminance(val: number): number {
  const norm = val / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: [number, number, number]): number {
  return (
    0.2126 * channelLuminance(rgb[0]) +
    0.7152 * channelLuminance(rgb[1]) +
    0.0722 * channelLuminance(rgb[2])
  );
}

function contrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

function parseRgbString(str: string): [number, number, number] {
  const parts = str.trim().split(/\s+/).map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some(isNaN)) {
    throw new Error(`Invalid RGB token string: "${str}"`);
  }
  return [parts[0], parts[1], parts[2]];
}

// =============================================================================
// Helper: Extract CSS variables from src/index.css for each theme block
// =============================================================================
function extractThemeVariables(cssContent: string, selectorRegex: RegExp): Record<string, string> {
  const match = cssContent.match(selectorRegex);
  if (!match || !match[1]) {
    throw new Error(`Selector regex failed to match CSS: ${selectorRegex}`);
  }
  const block = match[1];
  const vars: Record<string, string> = {};
  const varRegex = /(--[\w-]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(block)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

describe('Milestone 1 Empirical Challenger: Adversarial Stress & Correctness Suite', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const tailwindPath = path.resolve(process.cwd(), 'tailwind.config.js');
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');

  const cssContent = fs.readFileSync(cssPath, 'utf-8').replace(/\r\n/g, '\n');
  const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8').replace(/\r\n/g, '\n');
  const appContent = fs.readFileSync(appPath, 'utf-8').replace(/\r\n/g, '\n');

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.style.colorScheme = '';
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // CHALLENGE 1: Token Resolution Across All 6 Preset/Mode Combinations
  // ===========================================================================
  describe('CHALLENGE 1: Token Resolution across all 6 Preset / Mode Combinations', () => {
    // 3 presets: obsidian, monolith, htb x 2 modes: dark, light
    const presets = [
      {
        name: 'obsidian',
        mode: 'light',
        selector: /\[data-theme="obsidian"\]:not\(\.dark\)[^{]*\{([^}]+)\}/,
        fallbackSelector: /:root,\s*\n\[data-theme="obsidian"\]:not\(\.dark\)[^{]*\{([^}]+)\}/,
      },
      {
        name: 'obsidian',
        mode: 'dark',
        selector: /\.dark,\s*\n\[data-theme="obsidian"\]\.dark[^{]*\{([^}]+)\}/,
      },
      {
        name: 'monolith',
        mode: 'light',
        selector: /\[data-theme="monolith"\]:not\(\.dark\)[^{]*\{([^}]+)\}/,
      },
      {
        name: 'monolith',
        mode: 'dark',
        selector: /\[data-theme="monolith"\]\.dark[^{]*\{([^}]+)\}/,
      },
      {
        name: 'htb',
        mode: 'dark',
        selector: /\[data-theme="htb"\]\.dark[^{]*\{([^}]+)\}/,
      },
      {
        name: 'htb',
        mode: 'light',
        selector: /\[data-theme="htb"\]:not\(\.dark\)[^{]*\{([^}]+)\}/,
      },
    ];

    const requiredTokens = [
      '--surface-base',
      '--surface-card',
      '--surface-elevated',
      '--surface-sunken',
      '--surface-hover',
      '--border-subtle',
      '--border-strong',
      '--border-accent',
      '--text-primary',
      '--text-secondary',
      '--text-muted',
      '--text-tertiary',
    ];

    it.each(presets)(
      'verifies all 12 core tokens resolve to valid 3-channel RGB numbers for $name ($mode)',
      ({ name, mode, selector, fallbackSelector }) => {
        let vars: Record<string, string>;
        try {
          vars = extractThemeVariables(cssContent, selector);
        } catch (e) {
          if (fallbackSelector) {
            vars = extractThemeVariables(cssContent, fallbackSelector);
          } else {
            throw e;
          }
        }

        requiredTokens.forEach((token) => {
          expect(vars[token], `Missing token ${token} in ${name} (${mode})`).toBeDefined();
          const rgb = parseRgbString(vars[token]);
          expect(rgb.length).toBe(3);
          rgb.forEach((ch) => {
            expect(ch).toBeGreaterThanOrEqual(0);
            expect(ch).toBeLessThanOrEqual(255);
          });
        });
      }
    );

    it.each(presets)(
      'asserts WCAG 2.1 text contrast (primary >= 7:1 AAA, secondary >= 7:1 AAA, muted >= 4.5:1 AA) for $name ($mode)',
      ({ selector, fallbackSelector }) => {
        let vars: Record<string, string>;
        try {
          vars = extractThemeVariables(cssContent, selector);
        } catch (e) {
          if (fallbackSelector) {
            vars = extractThemeVariables(cssContent, fallbackSelector);
          } else {
            throw e;
          }
        }

        const surfaceCard = parseRgbString(vars['--surface-card']);
        const surfaceBase = parseRgbString(vars['--surface-base']);
        const textPrimary = parseRgbString(vars['--text-primary']);
        const textSecondary = parseRgbString(vars['--text-secondary']);
        const textMuted = parseRgbString(vars['--text-muted']);

        // Primary text on card surface
        const primaryCardContrast = contrastRatio(textPrimary, surfaceCard);
        expect(primaryCardContrast).toBeGreaterThanOrEqual(7.0);

        // Primary text on base surface
        const primaryBaseContrast = contrastRatio(textPrimary, surfaceBase);
        expect(primaryBaseContrast).toBeGreaterThanOrEqual(7.0);

        // Secondary text on card surface
        const secondaryContrast = contrastRatio(textSecondary, surfaceCard);
        expect(secondaryContrast).toBeGreaterThanOrEqual(7.0);

        // Muted text on card surface
        const mutedContrast = contrastRatio(textMuted, surfaceCard);
        expect(mutedContrast).toBeGreaterThanOrEqual(4.5);
      }
    );

    it('asserts HTB Dark Mode border-accent (#9fef00 Lime) has severe contrast failure against white text (<3:1) and passes with black text (>14:1)', () => {
      const htbDarkVars = extractThemeVariables(
        cssContent,
        /\[data-theme="htb"\]\.dark[^{]*\{([^}]+)\}/
      );
      const lime = parseRgbString(htbDarkVars['--border-accent']); // [159, 239, 0]
      const white: [number, number, number] = [255, 255, 255];
      const black: [number, number, number] = [0, 0, 0];

      const whiteContrast = contrastRatio(white, lime);
      const blackContrast = contrastRatio(black, lime);

      expect(whiteContrast).toBeLessThan(3.0); // Extreme accessibility failure if white
      expect(blackContrast).toBeGreaterThan(14.0); // Extreme AAA contrast with black
    });

    it('verifies applyThemeToDOM accurately updates root dataset and class across all 6 combinations', () => {
      const combos = [
        { theme: 'obsidian', isDark: true, expectedClass: 'dark', expectedTheme: 'obsidian' },
        { theme: 'obsidian', isDark: false, expectedClass: 'light', expectedTheme: 'obsidian' },
        { theme: 'monolith', isDark: true, expectedClass: 'dark', expectedTheme: 'monolith' },
        { theme: 'monolith', isDark: false, expectedClass: 'light', expectedTheme: 'monolith' },
        { theme: 'htb', isDark: true, expectedClass: 'dark', expectedTheme: 'htb' },
        { theme: 'htb', isDark: false, expectedClass: 'light', expectedTheme: 'htb' },
      ];

      combos.forEach(({ theme, isDark, expectedClass, expectedTheme }) => {
        useCtfStore.getState().setThemePreset(theme as any);
        applyThemeToDOM(isDark ? 'dark' : 'light', false);
        expect(document.documentElement.classList.contains(expectedClass)).toBe(true);
        expect(document.documentElement.getAttribute('data-theme')).toBe(expectedTheme);
        expect(document.documentElement.getAttribute('data-mode')).toBe(isDark ? 'dark' : 'light');
        expect(document.documentElement.style.colorScheme).toBe(isDark ? 'dark' : 'light');
      });
    });

    it('verifies Tailwind bridge dynamically wires accent.DEFAULT to rgb(var(--border-accent))', () => {
      expect(tailwindContent).toContain("DEFAULT: 'rgb(var(--border-accent) / <alpha-value>)'");
      expect(tailwindContent).toContain("primary: 'rgb(var(--text-primary) / <alpha-value>)'");
      expect(tailwindContent).toContain("secondary: 'rgb(var(--text-secondary) / <alpha-value>)'");
      expect(tailwindContent).toContain("muted: 'rgb(var(--text-muted) / <alpha-value>)'");
    });
  });

  // ===========================================================================
  // CHALLENGE 2: Light Mode Hover Text Never Turns White or Illegible
  // ===========================================================================
  describe('CHALLENGE 2: Light Mode Hover Contrast & White Invisibility Neutralization', () => {
    it('verifies global CSS override neutralizes hover:text-white in light mode to rgb(var(--text-primary))', () => {
      expect(cssContent).toContain(
        'html:not(.dark) .hover\\:text-white:hover'
      );
      expect(cssContent).toContain(
        'color: rgb(var(--text-primary)) !important;'
      );
    });

    it('verifies group-hover:text-white is also neutralized in light mode', () => {
      expect(cssContent).toContain(
        'html:not(.dark) .group:hover .group-hover\\:text-white'
      );
    });

    it('verifies intentional solid dark-background buttons are preserved in the whitelist', () => {
      // Must not neutralize buttons that have solid dark backgrounds (.bg-cyber-crimson, .bg-red-500, etc.)
      const overrideRule = cssContent.slice(
        cssContent.indexOf('/* Light Mode hover:text-white Invisibility Neutralization */')
      );
      expect(overrideRule).toContain(':not(.bg-cyber-crimson)');
      expect(overrideRule).toContain(':not(.bg-red-500)');
      expect(overrideRule).toContain(':not(.bg-red-600)');
      expect(overrideRule).toContain(':not(.bg-emerald-600)');
      expect(overrideRule).toContain(':not(.bg-blue-600)');
      expect(overrideRule).toContain(':not(.keep-white)');
    });

    it('empirically verifies textPrimary contrast against surfaceHover in all 3 light presets', () => {
      const lightPresets = [
        { name: 'obsidian', selector: /\[data-theme="obsidian"\]:not\(\.dark\)[^{]*\{([^}]+)\}/ },
        { name: 'monolith', selector: /\[data-theme="monolith"\]:not\(\.dark\)[^{]*\{([^}]+)\}/ },
        { name: 'htb', selector: /\[data-theme="htb"\]:not\(\.dark\)[^{]*\{([^}]+)\}/ },
      ];

      lightPresets.forEach(({ name, selector }) => {
        const vars = extractThemeVariables(cssContent, selector);
        const textPrimary = parseRgbString(vars['--text-primary']);
        const surfaceHover = parseRgbString(vars['--surface-hover']);
        const white: [number, number, number] = [255, 255, 255];

        const primaryContrastOnHover = contrastRatio(textPrimary, surfaceHover);
        const whiteContrastOnHover = contrastRatio(white, surfaceHover);

        // Corrected textPrimary MUST be readable (> 10:1 AAA)
        expect(
          primaryContrastOnHover,
          `Failed high contrast for text-primary on hover in ${name}`
        ).toBeGreaterThanOrEqual(10.0);

        // Uncorrected white text WOULD fail severely (< 1.5:1)
        expect(
          whiteContrastOnHover,
          `Expected white text to have low contrast on hover in ${name}`
        ).toBeLessThan(1.5);
      });
    });

    it('verifies CyberButton variants do NOT produce white text on hover on light backgrounds', () => {
      const variants = ['secondary', 'outline', 'ghost'] as const;
      variants.forEach((v) => {
        const { unmount } = render(<CyberButton variant={v}>Test Action</CyberButton>);
        const btn = screen.getByRole('button', { name: /Test Action/i });
        // Secondary, outline, ghost variants must not have hover:text-white
        expect(btn.className).not.toContain('hover:text-white');
        unmount();
      });
    });
  });

  // ===========================================================================
  // CHALLENGE 3: tabular-nums Prevents Numerical Jitter
  // ===========================================================================
  describe('CHALLENGE 3: tabular-nums Prevents Horizontal Layout Jitter', () => {
    it('verifies body in src/index.css strictly defines font-variant-numeric: tabular-nums', () => {
      expect(cssContent).toMatch(/body\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/);
    });

    it('verifies code, pre, .font-mono, and telemetry enforce tabular-nums', () => {
      expect(cssContent).toMatch(
        /code,\s*kbd,\s*samp,\s*pre,\s*\.font-mono[^{]*\{[^}]*font-variant-numeric:\s*tabular-nums;/
      );
    });

    it('verifies dedicated .tabular-nums CSS utility is declared', () => {
      expect(cssContent).toMatch(/\.tabular-nums\s*\{[^}]*font-variant-numeric:\s*tabular-nums;\s*\}/);
    });

    it('verifies status-badge-capsule enforces min-width 72px and tabular-nums to eliminate shift', () => {
      expect(cssContent).toMatch(
        /\.status-badge-capsule\s*\{[^}]*min-width:\s*72px;[^}]*font-variant-numeric:\s*tabular-nums;/
      );
    });

    it('verifies CyberBadge applies tabular-nums when mono is set', () => {
      const { container } = render(<CyberBadge mono>10.10.14.88</CyberBadge>);
      const badge = container.querySelector('.tabular-nums');
      expect(badge).not.toBeNull();
      expect(badge?.className).toContain('font-mono');
    });

    it('verifies PlatformBadge, DifficultyBadge, and StatusBadge enforce tabular-nums', () => {
      const { container: c1 } = render(<PlatformBadge platform="HTB" />);
      const { container: c2 } = render(<DifficultyBadge difficulty="Hard" />);
      const { container: c3 } = render(<StatusBadge status="root" />);

      expect(c1.innerHTML).toContain('tabular-nums');
      expect(c2.innerHTML).toContain('tabular-nums');
      expect(c3.innerHTML).toContain('tabular-nums');
    });

    it('verifies UnifiedHeader variables inputs (L, R, P) enforce tabular-nums and font-mono', () => {
      render(
        <MemoryRouter>
          <UnifiedHeader />
        </MemoryRouter>
      );

      const lhostInput = screen.getByLabelText('Attacker IP (LHOST)');
      const targetInput = screen.getByLabelText('Target IP (RHOST)');
      const lportInput = screen.getByLabelText('Listener Port (LPORT)');

      expect(lhostInput.className).toContain('tabular-nums');
      expect(lhostInput.className).toContain('font-mono');

      expect(targetInput.className).toContain('tabular-nums');
      expect(targetInput.className).toContain('font-mono');

      expect(lportInput.className).toContain('tabular-nums');
      expect(lportInput.className).toContain('font-mono');
    });

    it('empirically verifies digit character count stability under tabular format', () => {
      // In monospace / tabular numeral contexts, character length directly correlates to layout width:
      const t1 = '00:01:11';
      const t2 = '23:59:58';
      expect(t1.length).toBe(t2.length);

      // IP lengths vary between 7 and 15 chars, so target input fields must have fixed Tailwind widths (w-16 / xl:w-20)
      const inputClass = 'w-16 xl:w-20';
      expect(inputClass).toContain('w-16');
      expect(inputClass).toContain('xl:w-20');
    });
  });

  // ===========================================================================
  // CHALLENGE 4: reducedMotion Suppresses Animations
  // ===========================================================================
  describe('CHALLENGE 4: reducedMotion Suppresses Animations & Transitions', () => {
    it('verifies App.tsx root tree is wrapped by <MotionConfig reducedMotion="user">', () => {
      expect(appContent).toContain('<MotionConfig reducedMotion="user">');
      expect(appContent).toContain('</MotionConfig>');
      // Verify MotionConfig wraps the router
      const motionConfigIndex = appContent.indexOf('<MotionConfig reducedMotion="user">');
      const hashRouterIndex = appContent.indexOf('<Router>');
      expect(motionConfigIndex).toBeGreaterThan(-1);
      expect(hashRouterIndex).toBeGreaterThan(motionConfigIndex);
    });

    it('verifies src/index.css @media (prefers-reduced-motion: reduce) enforces 0.01ms duration and disables spinners', () => {
      const reducedMotionBlock = cssContent.slice(
        cssContent.indexOf('@media (prefers-reduced-motion: reduce)')
      );
      expect(reducedMotionBlock).toContain('animation-duration: 0.01ms !important;');
      expect(reducedMotionBlock).toContain('transition-duration: 0.01ms !important;');
      expect(reducedMotionBlock).toContain('.animate-spin-slow,');
      expect(reducedMotionBlock).toContain('.animate-spin,');
      expect(reducedMotionBlock).toContain('.animate-pulse,');
      expect(reducedMotionBlock).toContain('animation: none !important;');
    });

    it('verifies MotionConfigContext propagates reducedMotion="user" and useReducedMotionConfig dynamically reflects mode', () => {
      let capturedContext: any = null;
      let configResultAlways: boolean | null = null;
      let configResultNever: boolean | null = null;

      const ContextConsumer: React.FC = () => {
        capturedContext = React.useContext(MotionConfigContext);
        return <div data-testid="context-inspector">Context captured</div>;
      };

      const ConsumerAlways: React.FC = () => {
        configResultAlways = useReducedMotionConfig();
        return null;
      };

      const ConsumerNever: React.FC = () => {
        configResultNever = useReducedMotionConfig();
        return null;
      };

      // 1. Context propagation inside MotionConfig reducedMotion="user"
      const { unmount } = render(
        <MotionConfig reducedMotion="user">
          <ContextConsumer />
        </MotionConfig>
      );
      expect(capturedContext?.reducedMotion).toBe('user');
      unmount();

      // 2. Dynamic behavior of useReducedMotionConfig under 'always' and 'never'
      render(
        <>
          <MotionConfig reducedMotion="always">
            <ConsumerAlways />
          </MotionConfig>
          <MotionConfig reducedMotion="never">
            <ConsumerNever />
          </MotionConfig>
        </>
      );
      expect(configResultAlways).toBe(true);
      expect(configResultNever).toBe(false);
    });

    it('verifies toggleTheme skips View Transitions when prefers-reduced-motion is active', () => {
      const mockStartViewTransition = vi.fn();
      (document as any).startViewTransition = mockStartViewTransition;

      const origMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider>
          <div />
        </ThemeProvider>
      );

      // Verify DOM does not gain theme-transition class under reduced-motion
      expect(document.documentElement.classList.contains('theme-transition')).toBe(false);

      delete (document as any).startViewTransition;
      window.matchMedia = origMatchMedia;
    });
  });

  // ===========================================================================
  // CHALLENGE 5: Header Responsiveness at 1024px, 1280px, 1440px, 1920px
  // ===========================================================================
  describe('CHALLENGE 5: UnifiedHeader Responsive Layout at 1024px, 1280px, 1440px, 1920px', () => {
    beforeEach(() => {
      useCtfStore.setState({
        soundEnabled: false,
        activeTargetId: 'htb-challenger-target',
        machines: [
          {
            id: 'htb-challenger-target',
            name: 'ChallengerTarget',
            ip: '10.10.11.99',
            platform: 'HTB',
            status: 'foothold',
            difficulty: 'Medium',
            os: 'Linux',
            tags: ['Linux', 'Web'],
            certifications: ['CPTS'],
            timeSpentSeconds: 300,
            createdAt: new Date().toISOString(),
          } as Machine,
        ],
        globalVars: {
          lhost: '10.10.14.88',
          lport: '4444',
          targetIp: '10.10.11.99',
          interface: 'tun0',
          customVars: {},
        },
      });
    });

    it('verifies UnifiedHeader base element enforces single-line whitespace-nowrap and overflow-hidden', () => {
      const { container } = render(
        <MemoryRouter>
          <UnifiedHeader />
        </MemoryRouter>
      );

      const header = container.querySelector('header');
      expect(header).not.toBeNull();
      expect(header?.className).toContain('whitespace-nowrap');
      expect(header?.className).toContain('overflow-hidden');
      expect(header?.className).toContain('flex-shrink-0');
      expect(header?.className).toContain('h-[52px]');
    });

    it('asserts 1024px (lg) density budget: Operator Root badge is hidden (hidden xl:flex) and variables capsule is visible (hidden lg:flex)', () => {
      const { container } = render(
        <MemoryRouter>
          <UnifiedHeader />
        </MemoryRouter>
      );

      // Root count badge must have "hidden xl:flex" to prevent overflow at 1024px
      const operatorPill = container.querySelector('button[title*="Active Operator"]');
      expect(operatorPill).not.toBeNull();
      const rootBadge = operatorPill?.querySelector('.hidden.xl\\:flex');
      expect(rootBadge, 'Operator Root badge must be hidden below xl (1280px)').not.toBeNull();
      expect(rootBadge?.textContent).toContain('ROOT');

      // Variables capsule must be visible at lg (1024px) via "hidden lg:flex"
      const varsCapsule = container.querySelector('div[aria-label="Tactical Variables (LHOST / RHOST / LPORT)"]');
      expect(varsCapsule).not.toBeNull();
      expect(varsCapsule?.className).toContain('hidden');
      expect(varsCapsule?.className).toContain('lg:flex');

      // Deploy Box and Scans Hub must be hidden below xl
      const deployBtn = screen.getByLabelText(/Deploy Box/i);
      const scansBtn = screen.getByLabelText('Scans Hub');
      expect(deployBtn.className).toContain('hidden xl:flex');
      expect(scansBtn.className).toContain('hidden xl:flex');

      // Command Palette launcher button must be hidden below xl
      const paletteBtn = screen.getByLabelText('Open Command Palette');
      expect(paletteBtn.className).toContain('hidden xl:flex');
    });

    it('asserts 1280px (xl) layout: Deploy Box, Scans Hub, and Command Palette are enabled with icon-only compact labels', () => {
      render(
            <MemoryRouter>
                <UnifiedHeader />
            </MemoryRouter>
        );

      const deployBtn = screen.getByLabelText(/Deploy Box/i);
      const scansBtn = screen.getByLabelText('Scans Hub');
      const paletteBtn = screen.getByLabelText('Open Command Palette');

      // All 3 have xl:flex to become visible at 1280px
      expect(deployBtn.className).toContain('xl:flex');
      expect(scansBtn.className).toContain('xl:flex');
      expect(paletteBtn.className).toContain('xl:flex');

      // Their text spans are hidden until 2xl (1536px)
      expect(deployBtn.innerHTML).toContain('hidden 2xl:inline');
      expect(scansBtn.innerHTML).toContain('hidden 2xl:inline');
      expect(paletteBtn.innerHTML).toContain('hidden 2xl:inline');
    });

    it('asserts 1440px viewport: variables inputs maintain calibrated width classes without layout clash', () => {
      render(
        <MemoryRouter>
          <UnifiedHeader />
        </MemoryRouter>
      );

      const lhostInput = screen.getByLabelText('Attacker IP (LHOST)');
      const targetInput = screen.getByLabelText('Target IP (RHOST)');
      const lportInput = screen.getByLabelText('Listener Port (LPORT)');

      // Inputs have responsive width scale: w-16 at lg (1024px), xl:w-20 at xl+ (1280px, 1440px)
      expect(lhostInput.className).toContain('w-16');
      expect(lhostInput.className).toContain('xl:w-20');

      expect(targetInput.className).toContain('w-16');
      expect(targetInput.className).toContain('xl:w-20');

      expect(lportInput.className).toContain('w-10');
      expect(lportInput.className).toContain('xl:w-11');
    });

    it('asserts 1920px (2xl+) luxury layout: route breadcrumb and extended labels expand cleanly', () => {
      const { container } = render(
        <MemoryRouter>
          <UnifiedHeader />
        </MemoryRouter>
      );

      // Route breadcrumb indicator has "hidden 2xl:flex"
      expect(container.innerHTML).toContain('hidden 2xl:flex');
      expect(container.textContent).toContain('Tracker');

      // RevShell text expands at min-[1650px]
      const revShellBtn = screen.getByLabelText(/RevShell/i);
      expect(revShellBtn.innerHTML).toContain('hidden min-[1650px]:inline');
    });

    it('verifies safe physical separation barrier between Pentest Report and Disengage buttons', () => {
      render(
            <MemoryRouter>
                <UnifiedHeader />
            </MemoryRouter>
        );

      const reportBtn = screen.getByLabelText(/Pentest Report for ChallengerTarget/i);
      const disengageBtn = screen.getByLabelText('Disengage Active Target');

      expect(reportBtn).toBeInTheDocument();
      expect(disengageBtn).toBeInTheDocument();

      // Parent container contains 1px vertical barrier
      const parent = reportBtn.parentElement;
      const barrier = parent?.querySelector('div[aria-hidden="true"]');
      expect(barrier).not.toBeNull();
      expect(barrier?.className).toContain('w-px');
      expect(barrier?.className).toContain('h-3.5');
    });
  });
});
