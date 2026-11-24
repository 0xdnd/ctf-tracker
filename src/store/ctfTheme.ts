import { APP_VERSION } from '../utils/appVersion';

/** Workspace store: theme presets, brand and UI scale types and helpers. */

export interface BrandTheme {
  id: string;
  namePrefix: string;
  nameSuffix: string;
  suffixColor: string;
  tagline: string;
  badge: string;
}

export const ZEROBOX_BRAND: BrandTheme = {
  id: 'zerobox',
  namePrefix: 'ZERO',
  nameSuffix: 'BOX',
  suffixColor: 'cyber-box-glow',
  tagline: 'Tactical Cyber Operations Suite',
  badge: `v${APP_VERSION}`,
};

export const BRAND_THEMES: BrandTheme[] = [ZEROBOX_BRAND];

export type CoreThemePreset = 'obsidian' | 'htb' | 'offsec';

export type LegacyThemePreset = 'industrial' | 'neon' | 'zerobox' | 'oled' | 'light' | 'monolith';

export type ThemePreset = 'obsidian' | 'htb' | 'offsec';

export function normalizeThemePreset(preset: string | null | undefined): ThemePreset {
  if (!preset) return 'obsidian';
  const p = String(preset).toLowerCase().trim();
  if (p === 'htb' || p === 'hackthebox' || p === 'hack-the-box' || p === 'htb-oled' || p === 'hack the box') return 'htb';
  // 'monolith' (and its legacy 'light' / 'clean-monolith' aliases) was retired: saved values, backups and sync
  // imports land on the Red Team / OffSec theme. No schema bump; the stored string is rewritten on next persist.
  if (p === 'offsec' || p === 'red-team' || p === 'redteam' || p === 'red team' || p === 'crimson') return 'offsec';
  if (p === 'monolith' || p === 'light' || p === 'clean-monolith' || p === 'clean monolith') return 'offsec';
  // Legacy aliases ('oled', 'industrial', 'zerobox', 'neon', 'midnight-blue', 'slate', etc.) map to 'obsidian'
  return 'obsidian';
}

export type UiScale = 'auto' | 'tiny' | 'compact' | 'normal' | 'large' | 'huge';

export function applyThemePreset(preset: ThemePreset | string) {
  const normalizedPreset: ThemePreset = normalizeThemePreset(preset);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedPreset);

    // Synchronize browser tab favicon with active theme preset
    try {
      const faviconMap: Record<string, string> = {
        obsidian: `${import.meta.env.BASE_URL}favicon-zerobox.png`,
        htb: `${import.meta.env.BASE_URL}favicon-htb.png`,
        offsec: `${import.meta.env.BASE_URL}favicon-offsec.png`,
      };
      const iconPath = faviconMap[normalizedPreset] || `${import.meta.env.BASE_URL}favicon-zerobox.png`;
      const favicons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      favicons.forEach(el => {
        el.href = iconPath;
      });
    } catch {
      // Ignore in non-browser or mock environments
    }
  }
}
