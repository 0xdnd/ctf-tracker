import type { CanvasThemeTokens } from './types';

// ---------------------------------------------------------------------------
// Multi-Theme Tokens Engine
// ---------------------------------------------------------------------------
export function getCanvasThemeTokens(themePreset: string = 'obsidian', isDark: boolean = true): CanvasThemeTokens {
  const p = String(themePreset || 'obsidian').toLowerCase().trim();
  if (!isDark || p === 'light') {
    if (p === 'offsec' || p === 'monolith' || p === 'clean-monolith' || p === 'clean monolith' || p === 'red-team' || p === 'redteam' || p === 'red team' || p === 'crimson') {
      return {
        canvasBg: '#F8FAFC',
        cardBg: '#FFFFFF',
        cardBorder: '#CBD5E1',
        cardHoverBorder: '#B91C1C',
        textPrimary: '#0F172A',
        textMuted: '#475569',
        codeBg: '#E2E8F0',
        codeBorder: '#CBD5E1',
        accent: '#B91C1C',
        accentGlow: 'none',
        gridColor: '#CBD5E1',
        statusRoot: '#15803D',
        statusFoothold: '#D97706',
        statusUnsolved: '#B91C1C',
      };
    }
    if (p === 'htb' || p === 'hackthebox' || p === 'hack-the-box' || p === 'hack the box') {
      return {
        canvasBg: '#F1F5F9',
        cardBg: '#FFFFFF',
        cardBorder: '#CBD5E1',
        cardHoverBorder: '#15803D',
        textPrimary: '#0F172A',
        textMuted: '#475569',
        codeBg: '#E2E8F0',
        codeBorder: '#CBD5E1',
        accent: '#15803D',
        accentGlow: 'none',
        gridColor: '#CBD5E1',
        statusRoot: '#15803D',
        statusFoothold: '#D97706',
        statusUnsolved: '#475569',
      };
    }
    if (p === 'light') {
      return {
        canvasBg: '#F8FAFC',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        cardHoverBorder: '#008B99',
        textPrimary: '#0F172A',
        textMuted: '#64748B',
        codeBg: '#F1F5F9',
        codeBorder: '#CBD5E1',
        accent: '#008B99',
        accentGlow: 'none',
        gridColor: '#E2E8F0',
        statusRoot: '#059669',
        statusFoothold: '#D97706',
        statusUnsolved: '#008B99',
      };
    }
    if (p === 'obsidian' || p === 'obsidian-dark' || p === 'obsidian dark') {
      return {
        canvasBg: '#F4F4F5',
        cardBg: '#FFFFFF',
        cardBorder: '#E4E4E7',
        cardHoverBorder: '#0284C7',
        textPrimary: '#09090B',
        textMuted: '#52525B',
        codeBg: '#E4E4E7',
        codeBorder: '#D4D4D8',
        accent: '#0284C7',
        accentGlow: 'none',
        gridColor: '#E4E4E7',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#0284C7',
      };
    }
    return {
      canvasBg: '#F8FAFC',
      cardBg: '#FFFFFF',
      cardBorder: '#CBD5E1',
      cardHoverBorder: '#008B99',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      codeBg: '#F1F5F9',
      codeBorder: '#CBD5E1',
      accent: '#008B99',
      accentGlow: 'none',
      gridColor: '#008B99',
      statusRoot: '#059669',
      statusFoothold: '#D97706',
      statusUnsolved: '#0284C7',
    };
  }

  switch (p) {
    case 'industrial':
      return {
        canvasBg: '#000000',
        cardBg: '#0A0A0A',
        cardBorder: '#323232',
        cardHoverBorder: '#00FF66',
        textPrimary: '#FFFFFF',
        textMuted: '#AAAAAA',
        codeBg: '#050505',
        codeBorder: '#323232',
        accent: '#00FF66',
        accentGlow: 'none',
        gridColor: '#323232',
        statusRoot: '#00FF66',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#00FF66',
      };
    case 'oled':
      return {
        canvasBg: '#000000',
        cardBg: '#0A0A0A',
        cardBorder: '#262626',
        cardHoverBorder: '#38BDF8',
        textPrimary: '#F1F5F9',
        textMuted: '#737373',
        codeBg: '#050505',
        codeBorder: '#1F1F1F',
        accent: '#38BDF8',
        accentGlow: 'none',
        gridColor: '#38BDF8',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#38BDF8',
      };
    case 'offsec':
    case 'monolith':
    case 'clean-monolith':
    case 'clean monolith':
    case 'red-team':
    case 'redteam':
    case 'red team':
    case 'crimson':
      return {
        canvasBg: '#09090C',
        cardBg: '#101015',
        cardBorder: '#272730',
        cardHoverBorder: '#FF4646',
        textPrimary: '#F4F4F5',
        textMuted: '#A1A1AA',
        codeBg: '#050508',
        codeBorder: '#272730',
        accent: '#FF4646',
        accentGlow: 'none',
        gridColor: '#272730',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#FF4646',
      };
    case 'htb':
    case 'hackthebox':
    case 'hack-the-box':
    case 'hack the box':
      return {
        canvasBg: '#000000',
        cardBg: '#0B1015',
        cardBorder: '#1C2633',
        cardHoverBorder: '#9FEF00',
        textPrimary: '#FFFFFF',
        textMuted: '#94A3B8',
        codeBg: '#05070A',
        codeBorder: '#1C2633',
        accent: '#9FEF00',
        accentGlow: 'none',
        gridColor: '#1C2633',
        statusRoot: '#9FEF00',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#64748B',
      };
    case 'zerobox':
      return {
        canvasBg: '#070B14',
        cardBg: '#0D1527',
        cardBorder: '#1E2D4A',
        cardHoverBorder: '#00F0FF',
        textPrimary: '#E2E8F0',
        textMuted: '#94A3B8',
        codeBg: '#060A12',
        codeBorder: '#162238',
        accent: '#00F0FF',
        accentGlow: 'none',
        gridColor: '#1E2D4A',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#06B6D4',
      };
    case 'obsidian':
    case 'obsidian-dark':
    case 'obsidian dark':
    case 'neon':
    default:
      return {
        canvasBg: '#09090B',
        cardBg: '#121215',
        cardBorder: '#27272A',
        cardHoverBorder: '#0EA5E9',
        textPrimary: '#F4F4F5',
        textMuted: '#A1A1AA',
        codeBg: '#0C0C0F',
        codeBorder: '#27272A',
        accent: '#0EA5E9',
        accentGlow: 'none',
        gridColor: '#27272A',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#0EA5E9',
      };
  }
}
