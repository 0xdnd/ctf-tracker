import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTheme,
  ThemeProvider,
  extractCoordinates,
  RippleCoordinates,
} from '../../hooks/useTheme';
import { getCanvasThemeTokens, getDifficultyColors } from '../../components/tracker/GraphView';

// WCAG 2.1 Relative Luminance & Contrast Calculation Utilities
export function getChannelLuminance(val: number): number {
  const norm = val / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * getChannelLuminance(r) +
    0.7152 * getChannelLuminance(g) +
    0.0722 * getChannelLuminance(b)
  );
}

export function calculateContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const lum1 = getRelativeLuminance(...rgb1);
  const lum2 = getRelativeLuminance(...rgb2);
  const max = Math.max(lum1, lum2);
  const min = Math.min(lum1, lum2);
  return (max + 0.05) / (min + 0.05);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

// Canonical Token Dictionary matching src/index.css
export const THEME_CSS_TOKENS = {
  obsidian: {
    light: {
      surfaceBase: [244, 244, 245] as [number, number, number],
      surfaceCard: [255, 255, 255] as [number, number, number],
      surfaceElevated: [255, 255, 255] as [number, number, number],
      surfaceSunken: [228, 228, 231] as [number, number, number],
      textPrimary: [9, 9, 11] as [number, number, number],
      textSecondary: [51, 65, 85] as [number, number, number],
      textMuted: [82, 82, 91] as [number, number, number],
      textTertiary: [113, 113, 122] as [number, number, number],
      textDim: [100, 116, 139] as [number, number, number],
      borderSubtle: [228, 228, 231] as [number, number, number],
      borderStrong: [212, 212, 216] as [number, number, number],
      borderAccent: [2, 132, 199] as [number, number, number],
      cyberCyan: [2, 132, 199] as [number, number, number],
      cyberEmerald: [21, 128, 61] as [number, number, number],
      cyberCrimson: [225, 29, 72] as [number, number, number],
      cyberAmber: [180, 83, 9] as [number, number, number],
      cyberPurple: [147, 51, 234] as [number, number, number],
    },
    dark: {
      surfaceBase: [9, 9, 11] as [number, number, number],
      surfaceCard: [18, 18, 21] as [number, number, number],
      surfaceElevated: [24, 24, 27] as [number, number, number],
      surfaceSunken: [12, 12, 15] as [number, number, number],
      textPrimary: [244, 244, 245] as [number, number, number],
      textSecondary: [228, 228, 231] as [number, number, number],
      textMuted: [161, 161, 170] as [number, number, number],
      textTertiary: [113, 113, 122] as [number, number, number],
      textDim: [113, 113, 122] as [number, number, number],
      borderSubtle: [39, 39, 42] as [number, number, number],
      borderStrong: [63, 63, 70] as [number, number, number],
      borderAccent: [14, 165, 233] as [number, number, number],
      cyberCyan: [14, 165, 233] as [number, number, number],
      cyberEmerald: [16, 185, 129] as [number, number, number],
      cyberCrimson: [239, 68, 68] as [number, number, number],
      cyberAmber: [245, 158, 11] as [number, number, number],
      cyberPurple: [168, 85, 247] as [number, number, number],
    },
  },
  monolith: {
    light: {
      surfaceBase: [250, 250, 250] as [number, number, number],
      surfaceCard: [255, 255, 255] as [number, number, number],
      surfaceElevated: [255, 255, 255] as [number, number, number],
      surfaceSunken: [244, 244, 245] as [number, number, number],
      textPrimary: [9, 9, 11] as [number, number, number],
      textSecondary: [51, 65, 85] as [number, number, number],
      textMuted: [82, 82, 91] as [number, number, number],
      textTertiary: [113, 113, 122] as [number, number, number],
      textDim: [100, 116, 139] as [number, number, number],
      borderSubtle: [228, 228, 231] as [number, number, number],
      borderStrong: [212, 212, 216] as [number, number, number],
      borderAccent: [2, 132, 199] as [number, number, number],
      cyberCyan: [2, 132, 199] as [number, number, number],
      cyberEmerald: [21, 128, 61] as [number, number, number],
      cyberCrimson: [239, 68, 68] as [number, number, number],
      cyberAmber: [180, 83, 9] as [number, number, number],
      cyberPurple: [147, 51, 234] as [number, number, number],
    },
    dark: {
      surfaceBase: [24, 24, 27] as [number, number, number],
      surfaceCard: [39, 39, 42] as [number, number, number],
      surfaceElevated: [50, 50, 56] as [number, number, number],
      surfaceSunken: [9, 9, 11] as [number, number, number],
      textPrimary: [244, 244, 245] as [number, number, number],
      textSecondary: [228, 228, 231] as [number, number, number],
      textMuted: [161, 161, 170] as [number, number, number],
      textTertiary: [113, 113, 122] as [number, number, number],
      textDim: [113, 113, 122] as [number, number, number],
      borderSubtle: [63, 63, 70] as [number, number, number],
      borderStrong: [82, 82, 91] as [number, number, number],
      borderAccent: [56, 189, 248] as [number, number, number],
      cyberCyan: [56, 189, 248] as [number, number, number],
      cyberEmerald: [16, 185, 129] as [number, number, number],
      cyberCrimson: [244, 63, 94] as [number, number, number],
      cyberAmber: [245, 158, 11] as [number, number, number],
      cyberPurple: [168, 85, 247] as [number, number, number],
    },
  },
  htb: {
    dark: {
      surfaceBase: [0, 0, 0] as [number, number, number],
      surfaceCard: [11, 16, 21] as [number, number, number],
      surfaceElevated: [18, 24, 32] as [number, number, number],
      surfaceSunken: [5, 7, 10] as [number, number, number],
      textPrimary: [255, 255, 255] as [number, number, number],
      textSecondary: [228, 228, 231] as [number, number, number],
      textMuted: [148, 163, 184] as [number, number, number],
      textTertiary: [100, 116, 139] as [number, number, number],
      textDim: [113, 113, 122] as [number, number, number],
      borderSubtle: [28, 38, 51] as [number, number, number],
      borderStrong: [42, 58, 78] as [number, number, number],
      borderAccent: [159, 239, 0] as [number, number, number],
      cyberCyan: [159, 239, 0] as [number, number, number],
      cyberEmerald: [159, 239, 0] as [number, number, number],
      cyberCrimson: [244, 63, 94] as [number, number, number],
      cyberAmber: [245, 158, 11] as [number, number, number],
      cyberPurple: [168, 85, 247] as [number, number, number],
    },
    light: {
      surfaceBase: [241, 245, 249] as [number, number, number],
      surfaceCard: [255, 255, 255] as [number, number, number],
      surfaceElevated: [255, 255, 255] as [number, number, number],
      surfaceSunken: [226, 232, 240] as [number, number, number],
      textPrimary: [15, 23, 42] as [number, number, number],
      textSecondary: [51, 65, 85] as [number, number, number],
      textMuted: [71, 85, 105] as [number, number, number],
      textTertiary: [100, 116, 139] as [number, number, number],
      textDim: [100, 116, 139] as [number, number, number],
      borderSubtle: [203, 213, 225] as [number, number, number],
      borderStrong: [148, 163, 184] as [number, number, number],
      borderAccent: [21, 128, 61] as [number, number, number],
      cyberCyan: [14, 116, 144] as [number, number, number],
      cyberEmerald: [21, 128, 61] as [number, number, number],
      cyberCrimson: [225, 29, 72] as [number, number, number],
      cyberAmber: [217, 119, 6] as [number, number, number],
      cyberPurple: [126, 34, 206] as [number, number, number],
    },
  },
};

describe('R3 Theme Transitions & Color Contrast Hardening Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    delete (document as any).startViewTransition;
    delete (document.documentElement as any).animate;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    delete (document as any).startViewTransition;
    delete (document.documentElement as any).animate;
    vi.restoreAllMocks();
  });

  describe('1. Programmatic WCAG 2.1 AA Contrast Assertions across 3 Themes x 2 Modes', () => {
    const themes = ['obsidian', 'monolith', 'htb'] as const;

    themes.forEach((themeName) => {
      (['light', 'dark'] as const).forEach((mode) => {
        describe(`Theme: ${themeName.toUpperCase()} [${mode.toUpperCase()}]`, () => {
          const tokens = THEME_CSS_TOKENS[themeName][mode];

          it('asserts text-primary achieves WCAG AAA (> 7:1) contrast against primary surfaces', () => {
            const contrastOnCard = calculateContrastRatio(tokens.textPrimary, tokens.surfaceCard);
            const contrastOnBase = calculateContrastRatio(tokens.textPrimary, tokens.surfaceBase);

            expect(contrastOnCard).toBeGreaterThanOrEqual(7.0);
            expect(contrastOnBase).toBeGreaterThanOrEqual(7.0);
          });

          it('asserts text-secondary achieves WCAG AAA (>= 7:1) contrast against cards and base', () => {
            const contrastOnCard = calculateContrastRatio(tokens.textSecondary, tokens.surfaceCard);
            const contrastOnBase = calculateContrastRatio(tokens.textSecondary, tokens.surfaceBase);

            expect(contrastOnCard).toBeGreaterThanOrEqual(7.0);
            expect(contrastOnBase).toBeGreaterThanOrEqual(7.0);
          });

          it('asserts text-muted achieves WCAG AA (>= 4.5:1) contrast against cards and base', () => {
            const contrastOnCard = calculateContrastRatio(tokens.textMuted, tokens.surfaceCard);
            const contrastOnBase = calculateContrastRatio(tokens.textMuted, tokens.surfaceBase);

            expect(contrastOnCard).toBeGreaterThanOrEqual(4.5);
            expect(contrastOnBase).toBeGreaterThanOrEqual(4.5);
          });

          it('asserts text-tertiary achieves large-text / UI threshold (>= 3.0:1) against cards', () => {
            const contrastOnCard = calculateContrastRatio(tokens.textTertiary, tokens.surfaceCard);
            expect(contrastOnCard).toBeGreaterThanOrEqual(3.0);
          });

          it('asserts border-accent meets UI component contrast (>= 3.0:1) against base foundation', () => {
            const contrastOnBase = calculateContrastRatio(tokens.borderAccent, tokens.surfaceBase);
            expect(contrastOnBase).toBeGreaterThanOrEqual(3.0);
          });
        });
      });
    });

    it('asserts HTB Neon Lime button requires black text for extreme contrast (>14:1) and rejects white text', () => {
      const limeRgb = THEME_CSS_TOKENS.htb.dark.borderAccent; // [159, 239, 0]
      const blackRgb: [number, number, number] = [0, 0, 0];
      const whiteRgb: [number, number, number] = [255, 255, 255];

      const blackContrast = calculateContrastRatio(blackRgb, limeRgb);
      const whiteContrast = calculateContrastRatio(whiteRgb, limeRgb);

      expect(blackContrast).toBeGreaterThan(14.0);
      expect(whiteContrast).toBeLessThan(3.0); // White text on lime is an accessibility violation!
    });
  });

  describe('2. GraphView Attack Canvas Tokens & Difficulty WCAG Compliance', () => {
    it('verifies all 3 core themes in both modes provide >= 4.5:1 text contrast on canvas cards', () => {
      const themes = ['obsidian', 'monolith', 'htb'] as const;

      themes.forEach((theme) => {
        [true, false].forEach((isDark) => {
          const canvasTokens = getCanvasThemeTokens(theme, isDark);
          const textRgb = hexToRgb(canvasTokens.textPrimary);
          const cardRgb = hexToRgb(canvasTokens.cardBg);
          const mutedRgb = hexToRgb(canvasTokens.textMuted);

          const primaryContrast = calculateContrastRatio(textRgb, cardRgb);
          const mutedContrast = calculateContrastRatio(mutedRgb, cardRgb);

          expect(primaryContrast).toBeGreaterThanOrEqual(7.0);
          expect(mutedContrast).toBeGreaterThanOrEqual(4.5);
        });
      });
    });

    it('verifies getDifficultyColors produces >= 4.5:1 contrast against surface card in both light and dark modes', () => {
      const difficulties = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
      const lightCardRgb: [number, number, number] = [255, 255, 255];
      const darkCardRgb: [number, number, number] = [18, 18, 21];

      difficulties.forEach((diff) => {
        const lightColors = getDifficultyColors(diff, false);
        const darkColors = getDifficultyColors(diff, true);

        const lightTextRgb = hexToRgb(lightColors.text);
        const darkTextRgb = hexToRgb(darkColors.text);

        const lightContrast = calculateContrastRatio(lightTextRgb, lightCardRgb);
        const darkContrast = calculateContrastRatio(darkTextRgb, darkCardRgb);

        expect(lightContrast).toBeGreaterThanOrEqual(4.5);
        expect(darkContrast).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('3. View Transitions API & Circular Ripple Invariants (useTheme.ts)', () => {
    it('executes circular ripple clipPath animation when View Transitions API is available', async () => {
      const mockReady = Promise.resolve();
      const mockStartViewTransition = vi.fn().mockImplementation(() => {
        return {
          ready: mockReady,
          finished: Promise.resolve(),
        };
      });

      const mockAnimate = vi.fn().mockReturnValue({ finished: Promise.resolve() });

      // Mock View Transitions API on document
      (document as any).startViewTransition = mockStartViewTransition;
      document.documentElement.animate = mockAnimate;

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      // Trigger theme toggle with explicit click coordinates
      const clickCoords: RippleCoordinates = { x: 300, y: 400 };
      await act(async () => {
        result.current.toggleTheme(clickCoords);
      });

      // Assert startViewTransition was called
      expect(mockStartViewTransition).toHaveBeenCalledTimes(1);

      // Await ready promise
      await act(async () => {
        await mockReady;
      });

      // Assert document.documentElement.animate was triggered with circular clipPath
      expect(mockAnimate).toHaveBeenCalledWith(
        {
          clipPath: [
            'circle(0px at 300px 400px)',
            expect.stringMatching(/^circle\(\d+(\.\d+)?px at 300px 400px\)$/),
          ],
        },
        expect.objectContaining({
          duration: 350,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          pseudoElement: '::view-transition-new(root)',
        })
      );

      delete (document as any).startViewTransition;
      delete (document.documentElement as any).animate;
    });

    it('gracefully handles rejected View Transition without throwing or crashing', async () => {
      const mockRejectReady = Promise.reject(new DOMException('Transition aborted', 'AbortError'));
      mockRejectReady.catch(() => {});
      const mockFinished = Promise.reject(new Error('Aborted'));
      mockFinished.catch(() => {});

      const mockStartViewTransition = vi.fn().mockImplementation((cb: () => void) => {
        cb();
        return {
          ready: mockRejectReady,
          finished: mockFinished,
        };
      });

      (document as any).startViewTransition = mockStartViewTransition;
      document.documentElement.animate = vi.fn();

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      await act(async () => {
        expect(() => {
          result.current.toggleTheme({ x: 100, y: 100 });
        }).not.toThrow();
      });

      delete (document as any).startViewTransition;
      delete (document.documentElement as any).animate;
    });
  });

  describe('4. Coordinate Extraction & Prefers-Reduced-Motion Invariants', () => {
    it('extracts coordinates accurately from coordinates object, mouse events, and element rects', () => {
      // 1. Direct object
      expect(extractCoordinates({ x: 120, y: 240 })).toEqual({ x: 120, y: 240 });

      // 2. MouseEvent with clientX/clientY
      const mouseEvt = { clientX: 450, clientY: 600 } as React.MouseEvent;
      expect(extractCoordinates(mouseEvt)).toEqual({ x: 450, y: 600 });

      // 3. MouseEvent with clientX === 0
      const mouseEvtZero = { clientX: 0, clientY: 100 } as React.MouseEvent;
      expect(extractCoordinates(mouseEvtZero)).toEqual({ x: 0, y: 100 });

      // 4. Target element bounding box center
      const fakeElement = {
        getBoundingClientRect: () => ({
          left: 100,
          top: 200,
          width: 80,
          height: 40,
          right: 180,
          bottom: 240,
        }),
      } as unknown as HTMLElement;

      const keyEvt = { currentTarget: fakeElement } as unknown as React.KeyboardEvent;
      expect(extractCoordinates(keyEvt)).toEqual({ x: 140, y: 220 });

      // 5. Undefined fallback
      const fallback = extractCoordinates(undefined);
      expect(typeof fallback.x).toBe('number');
      expect(typeof fallback.y).toBe('number');
    });

    it('bypasses View Transitions and animation classes when prefers-reduced-motion is active', () => {
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

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      act(() => {
        result.current.toggleTheme();
      });

      // View Transitions MUST NOT be called!
      expect(mockStartViewTransition).not.toHaveBeenCalled();

      // Theme-transition class MUST NOT be added
      expect(document.documentElement.classList.contains('theme-transition')).toBe(false);

      delete (document as any).startViewTransition;
      window.matchMedia = origMatchMedia;
    });
  });

  describe('5. Zero-Flicker Synchronous Mount & State Persistence Invariants', () => {
    it('applies initial theme to DOM synchronously on mount without animated transition class', () => {
      localStorage.setItem('zerobox-theme-mode', 'dark');

      renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
      expect(document.documentElement.style.colorScheme).toBe('dark');
      expect(document.documentElement.classList.contains('theme-transition')).toBe(false);
    });

    it('persists theme mode changes to localStorage under zerobox-theme-mode', () => {
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      act(() => {
        result.current.setTheme('light');
      });

      expect(localStorage.getItem('zerobox-theme-mode')).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorage.getItem('zerobox-theme-mode')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('handles rapid sequential theme switches without corrupting DOM classes or throwing', () => {
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      act(() => {
        result.current.setTheme('light');
        result.current.setTheme('dark');
        result.current.setTheme('light');
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
    });
  });
});
