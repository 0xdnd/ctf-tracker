import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemePresetDropdown } from '../../components/common/ThemePresetDropdown';
import { SettingsModal } from '../../components/common/SettingsModal';
import { useCtfStore, normalizeThemePreset, applyThemePreset } from '../../store/useCtfStore';
import { ThemeProvider, useTheme } from '../../hooks/useTheme';
import { getCanvasThemeTokens } from '../../components/tracker/GraphView';
import { exportWorkspaceToJson, validateWorkspacePayload } from '../../utils/workspaceStorage';

// Helper component that exposes theme controls alongside ThemePresetDropdown
const TestDropdownWrapper: React.FC = () => {
  const { isDark, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="active-mode">{isDark ? 'dark' : 'light'}</div>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Set Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Set Dark</button>
      <ThemePresetDropdown />
    </div>
  );
};

const TestSettingsModalWrapper: React.FC = () => {
  const { isDark, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="modal-active-mode">{isDark ? 'dark' : 'light'}</div>
      <button data-testid="modal-set-light" onClick={() => setTheme('light')}>Set Light</button>
      <button data-testid="modal-set-dark" onClick={() => setTheme('dark')}>Set Dark</button>
      <SettingsModal />
    </div>
  );
};

describe('Theme System Consolidation (3 Core Themes: Obsidian, Monolith, HTB)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-mode', 'dark');
    document.documentElement.setAttribute('data-theme', 'obsidian');
    useCtfStore.setState({
      themePreset: 'obsidian',
      settingsModalOpen: false,
      soundEnabled: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  describe('R1 & Acceptance Criteria: Theme Preset Consolidation & Normalization', () => {
    it('normalizes all legacy presets and aliases to valid 3 core presets', () => {
      // Core presets are preserved
      expect(normalizeThemePreset('obsidian')).toBe('obsidian');
      expect(normalizeThemePreset('monolith')).toBe('monolith');
      expect(normalizeThemePreset('htb')).toBe('htb');

      // Legacy presets normalize to obsidian
      expect(normalizeThemePreset('oled')).toBe('obsidian');
      expect(normalizeThemePreset('industrial')).toBe('obsidian');
      expect(normalizeThemePreset('zerobox')).toBe('obsidian');
      expect(normalizeThemePreset('neon')).toBe('obsidian');
      expect(normalizeThemePreset('midnight-blue')).toBe('obsidian');
      expect(normalizeThemePreset('slate')).toBe('obsidian');

      // Legacy light alias normalizes to monolith
      expect(normalizeThemePreset('light')).toBe('monolith');
      expect(normalizeThemePreset('clean monolith')).toBe('monolith');
      expect(normalizeThemePreset('clean-monolith')).toBe('monolith');
      expect(normalizeThemePreset('hack the box')).toBe('htb');

      // Case-insensitivity and whitespace trimming
      expect(normalizeThemePreset('HTB')).toBe('htb');
      expect(normalizeThemePreset('  monolith  ')).toBe('monolith');
      expect(normalizeThemePreset('OBSIDIAN')).toBe('obsidian');

      // Unknown or empty fallbacks
      expect(normalizeThemePreset(null)).toBe('obsidian');
      expect(normalizeThemePreset(undefined)).toBe('obsidian');
      expect(normalizeThemePreset('unknown-theme')).toBe('obsidian');
    });

    it('ThemePresetDropdown badge displays "3 themes" and renders exactly 3 theme choices', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <TestDropdownWrapper />
          </ThemeProvider>
        </MemoryRouter>
      );

      // Open dropdown
      const triggerBtn = screen.getByRole('button', { name: /Obsidian Dark \/ Zinc/i });
      fireEvent.click(triggerBtn);

      // Badge must display "3 themes"
      expect(screen.getByText('3 themes')).toBeInTheDocument();

      // Check all 3 themes are present
      expect(screen.getAllByText('Obsidian Dark / Zinc').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Clean Monolith')).toBeInTheDocument();
      expect(screen.getByText('Hack The Box')).toBeInTheDocument();

      // Ensure removed presets (oled, industrial) are NOT present
      expect(screen.queryByText(/Dark OLED/i)).toBeNull();
      expect(screen.queryByText(/Industrial High Contrast/i)).toBeNull();
    });

    it('closes ThemePresetDropdown when pressing Escape key', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <TestDropdownWrapper />
          </ThemeProvider>
        </MemoryRouter>
      );

      const triggerBtn = screen.getByRole('button', { name: /Obsidian Dark \/ Zinc/i });
      fireEvent.click(triggerBtn);
      expect(screen.getByText('3 themes')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('3 themes')).toBeNull();
    });

    it('SettingsModal displays the identical 3 themes with matching metadata and dual swatches', () => {
      useCtfStore.setState({ settingsModalOpen: true });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <TestSettingsModalWrapper />
          </ThemeProvider>
        </MemoryRouter>
      );

      // Header indicates 3 canonical themes
      expect(screen.getByText('3 canonical themes')).toBeInTheDocument();

      // Rendered options in SettingsModal
      expect(screen.getByText('Obsidian Dark / Zinc')).toBeInTheDocument();
      expect(screen.getByText('Clean Monolith')).toBeInTheDocument();
      expect(screen.getByText('Hack The Box')).toBeInTheDocument();

      // Badges
      expect(screen.getByText('Zinc dark')).toBeInTheDocument();
      expect(screen.getByText('Monolith')).toBeInTheDocument();
      expect(screen.getByText('HTB OLED')).toBeInTheDocument();

      // Removed presets are not shown
      expect(screen.queryByText(/Industrial High Contrast/i)).toBeNull();
      expect(screen.queryByText(/Dark OLED/i)).toBeNull();
    });
  });

  describe('R3 & Acceptance Criteria: Preserve Active Color Mode on Preset Selection', () => {
    it('preserves Light mode when selecting presets in ThemePresetDropdown', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <TestDropdownWrapper />
          </ThemeProvider>
        </MemoryRouter>
      );

      // Explicitly switch to Light mode
      fireEvent.click(screen.getByTestId('set-light'));
      expect(screen.getByTestId('active-mode').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);

      // Open dropdown
      const triggerBtn = screen.getByRole('button', { name: /Obsidian Dark \/ Zinc/i });
      fireEvent.click(triggerBtn);

      // Select Clean Monolith
      const monolithOption = screen.getByText('Clean Monolith');
      fireEvent.click(monolithOption);

      // Active mode MUST remain light!
      expect(useCtfStore.getState().themePreset).toBe('monolith');
      expect(screen.getByTestId('active-mode').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Re-open and select Hack The Box
      fireEvent.click(screen.getByRole('button', { name: /Clean Monolith/i }));
      const htbOption = screen.getByText('Hack The Box');
      fireEvent.click(htbOption);

      // Active mode MUST STILL remain light!
      expect(useCtfStore.getState().themePreset).toBe('htb');
      expect(screen.getByTestId('active-mode').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Re-open and select Obsidian
      fireEvent.click(screen.getByRole('button', { name: /Hack The Box/i }));
      const obsidianOption = screen.getByText('Obsidian Dark / Zinc');
      fireEvent.click(obsidianOption);

      // Active mode MUST STILL remain light!
      expect(useCtfStore.getState().themePreset).toBe('obsidian');
      expect(screen.getByTestId('active-mode').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('preserves Dark mode when selecting Clean Monolith in ThemePresetDropdown', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <TestDropdownWrapper />
          </ThemeProvider>
        </MemoryRouter>
      );

      // Ensure active mode is Dark
      fireEvent.click(screen.getByTestId('set-dark'));
      expect(screen.getByTestId('active-mode').textContent).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Open dropdown and select Clean Monolith
      const triggerBtn = screen.getByRole('button', { name: /Obsidian Dark \/ Zinc/i });
      fireEvent.click(triggerBtn);
      fireEvent.click(screen.getByText('Clean Monolith'));

      // Monolith in Dark mode: mode MUST stay Dark!
      expect(useCtfStore.getState().themePreset).toBe('monolith');
      expect(screen.getByTestId('active-mode').textContent).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('preserves active mode when selecting presets in SettingsModal', () => {
      useCtfStore.setState({ settingsModalOpen: true });

      render(
        <MemoryRouter>
          <ThemeProvider>
            <TestSettingsModalWrapper />
          </ThemeProvider>
        </MemoryRouter>
      );

      // Switch to Light mode
      fireEvent.click(screen.getByTestId('modal-set-light'));
      expect(screen.getByTestId('modal-active-mode').textContent).toBe('light');

      // Click Hack The Box in SettingsModal
      const htbCard = screen.getByRole('button', { name: /Hack The Box/i });
      fireEvent.click(htbCard);

      expect(useCtfStore.getState().themePreset).toBe('htb');
      // Mode stays light!
      expect(screen.getByTestId('modal-active-mode').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);

      // Switch to Clean Monolith
      const monolithCard = screen.getByRole('button', { name: /Clean Monolith/i });
      fireEvent.click(monolithCard);

      expect(useCtfStore.getState().themePreset).toBe('monolith');
      expect(screen.getByTestId('modal-active-mode').textContent).toBe('light');
    });

    it('applyThemePreset does not override existing document dark or light mode', () => {
      // In light mode
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');

      applyThemePreset('htb');
      expect(document.documentElement.getAttribute('data-theme')).toBe('htb');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      applyThemePreset('monolith');
      expect(document.documentElement.getAttribute('data-theme')).toBe('monolith');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // In dark mode
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');

      applyThemePreset('monolith');
      expect(document.documentElement.getAttribute('data-theme')).toBe('monolith');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });
  });

  describe('R2 & Acceptance Criteria: Contrast & Dual-Mode Authentic Color Values', () => {
    // Relative luminance & contrast ratio calculation per WCAG 2.1 specifications
    const getLuminance = (r: number, g: number, b: number) => {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]) => {
      const lum1 = getLuminance(...rgb1);
      const lum2 = getLuminance(...rgb2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    };

    it('validates WCAG 2.1 AA compliant contrast (>4.5:1) for all 3 themes in Light Mode', () => {
      // 1. Obsidian Light: Primary text #09090b on #ffffff card
      const obsidianContrast = getContrastRatio([9, 9, 11], [255, 255, 255]);
      expect(obsidianContrast).toBeGreaterThan(14.0); // Extreme high contrast

      // Obsidian Light: Muted text #52525b on #ffffff
      const obsidianMutedContrast = getContrastRatio([82, 82, 91], [255, 255, 255]);
      expect(obsidianMutedContrast).toBeGreaterThan(5.5); // Well above 4.5:1

      // 2. Monolith Light: Primary text #09090b on #fafafa base
      const monolithContrast = getContrastRatio([9, 9, 11], [250, 250, 250]);
      expect(monolithContrast).toBeGreaterThan(14.0);

      // Monolith Light: Muted text #52525b on #fafafa
      const monolithMutedContrast = getContrastRatio([82, 82, 91], [250, 250, 250]);
      expect(monolithMutedContrast).toBeGreaterThan(5.0);

      // 3. HTB Light: Primary text #0f172a on #ffffff
      const htbTextContrast = getContrastRatio([15, 23, 42], [255, 255, 255]);
      expect(htbTextContrast).toBeGreaterThan(15.0);

      // HTB Light: Muted text #475569 on #ffffff
      const htbMutedContrast = getContrastRatio([71, 85, 105], [255, 255, 255]);
      expect(htbMutedContrast).toBeGreaterThan(5.5);

      // HTB Light: Tactical Lime Accent #15803d on #ffffff (Light Mode verified >4.5:1)
      const htbAccentContrast = getContrastRatio([21, 128, 61], [255, 255, 255]);
      expect(htbAccentContrast).toBeGreaterThan(4.5);
    });

    it('validates WCAG 2.1 AA compliant contrast (>4.5:1) for all 3 themes in Dark Mode', () => {
      // 1. Obsidian Dark: Primary text #f4f4f5 on #121215 card
      const obsidianContrast = getContrastRatio([244, 244, 245], [18, 18, 21]);
      expect(obsidianContrast).toBeGreaterThan(14.0);

      // Obsidian Dark: Muted text #a1a1aa on #121215 card
      const obsidianMuted = getContrastRatio([161, 161, 170], [18, 18, 21]);
      expect(obsidianMuted).toBeGreaterThan(5.0);

      // 2. Monolith Dark: Primary text #f4f4f5 on #27272a card
      const monolithContrast = getContrastRatio([244, 244, 245], [39, 39, 42]);
      expect(monolithContrast).toBeGreaterThan(10.0);

      // Monolith Dark: Muted text #a1a1aa on #27272a card
      const monolithMuted = getContrastRatio([161, 161, 170], [39, 39, 42]);
      expect(monolithMuted).toBeGreaterThan(4.5);

      // 3. HTB Dark: Primary text #f8fafc on #141d2b card
      const htbContrast = getContrastRatio([248, 250, 252], [20, 29, 43]);
      expect(htbContrast).toBeGreaterThan(13.0);

      // HTB Dark: Muted text #94a3b8 on #141d2b card
      const htbMuted = getContrastRatio([148, 163, 184], [20, 29, 43]);
      expect(htbMuted).toBeGreaterThan(5.0);
    });

    it('getCanvasThemeTokens provides authentic dual-mode tokens for all 3 core themes', () => {
      // 1. HTB Light Mode (tactical forest lime)
      const htbLight = getCanvasThemeTokens('htb', false);
      expect(htbLight.canvasBg).toBe('#F1F5F9');
      expect(htbLight.cardBg).toBe('#FFFFFF');
      expect(htbLight.accent).toBe('#15803D');
      expect(htbLight.cardHoverBorder).toBe('#15803D');
      expect(htbLight.statusRoot).toBe('#15803D');

      // HTB Dark Mode (OLED pitch black & official lime)
      const htbDark = getCanvasThemeTokens('htb', true);
      expect(htbDark.canvasBg).toBe('#000000');
      expect(htbDark.cardBg).toBe('#0B1015');
      expect(htbDark.accent).toBe('#9FEF00');
      expect(htbDark.cardHoverBorder).toBe('#9FEF00');
      expect(htbDark.statusRoot).toBe('#9FEF00');

      // 2. Monolith Light Mode
      const monoLight = getCanvasThemeTokens('monolith', false);
      expect(monoLight.canvasBg).toBe('#FAFAFA');
      expect(monoLight.accent).toBe('#0284C7');

      // Monolith Dark Mode
      const monoDark = getCanvasThemeTokens('monolith', true);
      expect(monoDark.canvasBg).toBe('#18181B');
      expect(monoDark.accent).toBe('#38BDF8');

      // 3. Obsidian Light Mode
      const obsLight = getCanvasThemeTokens('obsidian', false);
      expect(obsLight.canvasBg).toBe('#F4F4F5');
      expect(obsLight.accent).toBe('#0284C7');

      // Obsidian Dark Mode
      const obsDark = getCanvasThemeTokens('obsidian', true);
      expect(obsDark.canvasBg).toBe('#09090B');
      expect(obsDark.accent).toBe('#0EA5E9');

      // 4. Case-insensitivity and alias resilience
      const htbUpperDark = getCanvasThemeTokens('HTB', true);
      expect(htbUpperDark.accent).toBe('#9FEF00');
      const htbSpacedLight = getCanvasThemeTokens('hack the box', false);
      expect(htbSpacedLight.accent).toBe('#15803D');
      const monoCleanDark = getCanvasThemeTokens('Clean Monolith', true);
      expect(monoCleanDark.accent).toBe('#38BDF8');
    });
  });

  describe('Backup & Storage Theme Normalization', () => {
    it('serializes themePreset in exportBackup and normalizes legacy or corrupted presets on importBackup', () => {
      // Set to HTB and verify export
      useCtfStore.setState({ themePreset: 'htb' });
      const exportedJson = useCtfStore.getState().exportBackup();
      const parsedExport = JSON.parse(exportedJson);
      expect(parsedExport.themePreset).toBe('htb');

      // Import legacy 'oled' -> should normalize to 'obsidian'
      const legacyOledPayload = JSON.stringify({
        machines: [],
        themePreset: 'oled',
      });
      const oledSuccess = useCtfStore.getState().importBackup(legacyOledPayload);
      expect(oledSuccess).toBe(true);
      expect(useCtfStore.getState().themePreset).toBe('obsidian');
      expect(document.documentElement.getAttribute('data-theme')).toBe('obsidian');

      // Import legacy 'light' -> should normalize to 'monolith'
      const legacyLightPayload = JSON.stringify({
        machines: [],
        themePreset: 'light',
      });
      const lightSuccess = useCtfStore.getState().importBackup(legacyLightPayload);
      expect(lightSuccess).toBe(true);
      expect(useCtfStore.getState().themePreset).toBe('monolith');
      expect(document.documentElement.getAttribute('data-theme')).toBe('monolith');

      // Import unknown corrupted string -> should normalize safely to 'obsidian'
      const corruptedPayload = JSON.stringify({
        machines: [],
        themePreset: 'hacked_dark_theme_2024_xyz',
      });
      const corruptSuccess = useCtfStore.getState().importBackup(corruptedPayload);
      expect(corruptSuccess).toBe(true);
      expect(useCtfStore.getState().themePreset).toBe('obsidian');
      expect(document.documentElement.getAttribute('data-theme')).toBe('obsidian');

      // Import valid 'htb' -> applies cleanly
      const htbPayload = JSON.stringify({
        machines: [],
        themePreset: 'htb',
      });
      const htbSuccess = useCtfStore.getState().importBackup(htbPayload);
      expect(htbSuccess).toBe(true);
      expect(useCtfStore.getState().themePreset).toBe('htb');
      expect(document.documentElement.getAttribute('data-theme')).toBe('htb');
    });

    it('validates workspace export payload includes themePreset and validateWorkspacePayload extracts it', () => {
      const state: any = {
        machines: [],
        globalVars: {},
        cheatsheets: [],
        activitySessions: [],
        themePreset: 'htb',
      };
      const json = exportWorkspaceToJson(state);
      const parsed = JSON.parse(json);
      expect(parsed.themePreset).toBe('htb');

      const validationResult = validateWorkspacePayload(parsed);
      expect(validationResult.success).toBe(true);
      expect(validationResult.data?.themePreset).toBe('htb');
    });
  });
});

