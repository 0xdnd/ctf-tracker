import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemePresetDropdown } from '../../components/common/ThemePresetDropdown';
import { SettingsModal } from '../../components/common/SettingsModal';
import { useCtfStore, normalizeThemePreset, applyThemePreset, SCHEMA_VERSION } from '../../store/useCtfStore';
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

describe('Theme System Consolidation (3 Core Themes: Obsidian, OffSec, HTB)', () => {
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
      expect(normalizeThemePreset('htb')).toBe('htb');
      expect(normalizeThemePreset('offsec')).toBe('offsec');
      expect(normalizeThemePreset('red-team')).toBe('offsec');

      // Legacy presets normalize to obsidian
      expect(normalizeThemePreset('oled')).toBe('obsidian');
      expect(normalizeThemePreset('industrial')).toBe('obsidian');
      expect(normalizeThemePreset('zerobox')).toBe('obsidian');
      expect(normalizeThemePreset('neon')).toBe('obsidian');
      expect(normalizeThemePreset('midnight-blue')).toBe('obsidian');
      expect(normalizeThemePreset('slate')).toBe('obsidian');

      // The retired Clean Monolith theme (and its legacy 'light' alias) lands on Red Team / OffSec
      expect(normalizeThemePreset('monolith')).toBe('offsec');
      expect(normalizeThemePreset('MONOLITH')).toBe('offsec');
      expect(normalizeThemePreset('light')).toBe('offsec');
      expect(normalizeThemePreset('clean monolith')).toBe('offsec');
      expect(normalizeThemePreset('clean-monolith')).toBe('offsec');
      expect(normalizeThemePreset('hack the box')).toBe('htb');

      // Case-insensitivity and whitespace trimming
      expect(normalizeThemePreset('HTB')).toBe('htb');
      expect(normalizeThemePreset('  monolith  ')).toBe('offsec');
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
      expect(screen.getByText('Hack The Box')).toBeInTheDocument();
      expect(screen.getByText('Red Team / OffSec')).toBeInTheDocument();

      // Ensure removed presets (oled, industrial, Clean Monolith) are NOT present
      expect(screen.queryByText('Clean Monolith')).toBeNull();
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
      expect(screen.getByText('Hack The Box')).toBeInTheDocument();
      expect(screen.getByText('Red Team / OffSec')).toBeInTheDocument();
      expect(screen.queryByText('Clean Monolith')).toBeNull();

      // Badges
      expect(screen.getByText('Zinc dark')).toBeInTheDocument();
      expect(screen.getByText('Red Team')).toBeInTheDocument();
      expect(screen.getByText('HTB OLED')).toBeInTheDocument();
      expect(screen.queryByText('Monolith')).toBeNull();

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

      // Select Red Team / OffSec
      const offsecOption = screen.getByText('Red Team / OffSec');
      fireEvent.click(offsecOption);

      // Active mode MUST remain light!
      expect(useCtfStore.getState().themePreset).toBe('offsec');
      expect(screen.getByTestId('active-mode').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Re-open and select Hack The Box
      fireEvent.click(screen.getByRole('button', { name: /Red Team \/ OffSec/i }));
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

    it('preserves Dark mode when selecting Red Team / OffSec in ThemePresetDropdown', () => {
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

      // Open dropdown and select Red Team / OffSec
      const triggerBtn = screen.getByRole('button', { name: /Obsidian Dark \/ Zinc/i });
      fireEvent.click(triggerBtn);
      fireEvent.click(screen.getByText('Red Team / OffSec'));

      // OffSec in Dark mode: mode MUST stay Dark!
      expect(useCtfStore.getState().themePreset).toBe('offsec');
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

      // Switch to Red Team / OffSec
      const offsecCard = screen.getByRole('button', { name: /Red Team \/ OffSec/i });
      fireEvent.click(offsecCard);

      expect(useCtfStore.getState().themePreset).toBe('offsec');
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

      applyThemePreset('offsec');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // In dark mode
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');

      applyThemePreset('offsec');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });
  });

  describe('Retired Clean Monolith theme', () => {
    it('applyThemePreset("monolith") applies the OffSec theme, never a data-theme with no CSS', () => {
      applyThemePreset('monolith');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');
      applyThemePreset('Clean Monolith');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');
    });

    it('applyThemePreset("offsec") points every icon link at the red favicon', () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = '/favicon-zerobox.png';
      document.head.appendChild(link);
      applyThemePreset('offsec');
      expect(link.getAttribute('href')).toBe('/favicon-offsec.png');
      applyThemePreset('htb');
      expect(link.getAttribute('href')).toBe('/favicon-htb.png');
      link.remove();
    });

    it('setThemePreset("monolith") stores offsec', () => {
      useCtfStore.getState().setThemePreset('monolith');
      expect(useCtfStore.getState().themePreset).toBe('offsec');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');
    });

    it('rehydrating a persisted blob that saved monolith lands on offsec', async () => {
      localStorage.setItem(
        'zerobox-tactical-store',
        JSON.stringify({ state: { themePreset: 'monolith' }, version: SCHEMA_VERSION })
      );
      await useCtfStore.persist.rehydrate();
      expect(useCtfStore.getState().themePreset).toBe('offsec');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');
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

      // 2. OffSec Light: Primary text #0f172a on #f8fafc base
      const offsecContrast = getContrastRatio([15, 23, 42], [248, 250, 252]);
      expect(offsecContrast).toBeGreaterThan(14.0);

      // OffSec Light: Muted text #475569 on #f8fafc
      const offsecMutedContrast = getContrastRatio([71, 85, 105], [248, 250, 252]);
      expect(offsecMutedContrast).toBeGreaterThan(5.0);

      // OffSec Light: white button text on blood-red accent #b91c1c
      const offsecButtonContrast = getContrastRatio([255, 255, 255], [185, 28, 28]);
      expect(offsecButtonContrast).toBeGreaterThan(4.5);

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

      // 2. OffSec Dark: Primary text #f4f4f5 on #101015 card
      const offsecContrast = getContrastRatio([244, 244, 245], [16, 16, 21]);
      expect(offsecContrast).toBeGreaterThan(10.0);

      // OffSec Dark: Muted text #a1a1aa on #101015 card
      const offsecMuted = getContrastRatio([161, 161, 170], [16, 16, 21]);
      expect(offsecMuted).toBeGreaterThan(4.5);

      // OffSec Dark: black button text on tactical red accent #ff4646 (rest and the 85% hover mix)
      const offsecButtonContrast = getContrastRatio([0, 0, 0], [255, 70, 70]);
      expect(offsecButtonContrast).toBeGreaterThan(4.5);
      const hoverMix = [255 * 0.85 + 5 * 0.15, 70 * 0.85 + 5 * 0.15, 70 * 0.85 + 8 * 0.15] as [number, number, number];
      expect(getContrastRatio([0, 0, 0], hoverMix)).toBeGreaterThan(4.5);

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

      // 2. OffSec Light Mode
      const offsecLight = getCanvasThemeTokens('offsec', false);
      expect(offsecLight.canvasBg).toBe('#F8FAFC');
      expect(offsecLight.accent).toBe('#B91C1C');

      // OffSec Dark Mode
      const offsecDark = getCanvasThemeTokens('offsec', true);
      expect(offsecDark.canvasBg).toBe('#09090C');
      expect(offsecDark.accent).toBe('#FF4646');

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
      // The retired Clean Monolith name resolves to the OffSec canvas tokens
      const monoCleanDark = getCanvasThemeTokens('Clean Monolith', true);
      expect(monoCleanDark.accent).toBe('#FF4646');
      const monoLegacyLight = getCanvasThemeTokens('monolith', false);
      expect(monoLegacyLight.accent).toBe('#B91C1C');
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

      // Import legacy 'light' (the retired Clean Monolith) -> should normalize to 'offsec'
      const legacyLightPayload = JSON.stringify({
        machines: [],
        themePreset: 'light',
      });
      const lightSuccess = useCtfStore.getState().importBackup(legacyLightPayload);
      expect(lightSuccess).toBe(true);
      expect(useCtfStore.getState().themePreset).toBe('offsec');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');

      // Import 'monolith' directly -> should normalize to 'offsec'
      const monolithSuccess = useCtfStore.getState().importBackup(JSON.stringify({ machines: [], themePreset: 'monolith' }));
      expect(monolithSuccess).toBe(true);
      expect(useCtfStore.getState().themePreset).toBe('offsec');
      expect(document.documentElement.getAttribute('data-theme')).toBe('offsec');

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

