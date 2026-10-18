import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadChakraPetch } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: monoFont } = loadJetBrainsMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});
const { fontFamily: cyberFont } = loadChakraPetch("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});
const { fontFamily: sansFont } = loadInter("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

export type ThemePreset = "oled" | "obsidian" | "monolith" | "htb";

export interface ThemeTokens {
  id: ThemePreset;
  name: string;
  tagline: string;
  darkHex: string;
  lightHex: string;
  surfaceBase: string;
  surfaceCard: string;
  surfaceElevated: string;
  surfaceSunken: string;
  surfaceHover: string;
  borderSubtle: string;
  borderStrong: string;
  borderAccent: string;
  accentFg: string;
  cyberAccent: string;
  cyberAccentGlow: string;
  cyberAccentBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textTertiary: string;
  windowBarBg: string;
  headerBg: string;
  trackBarBg: string;
  hudBg: string;
  hudBorder: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemeTokens> = {
  // 1. OLED Black & Electric Sky Blue (Dominant Theme matching app [data-theme="oled"].dark)
  oled: {
    id: "oled",
    name: "OLED Black / Electric Blue",
    tagline: "True pitch OLED black and electric sky blue",
    darkHex: "#38bdf8", // Electric Sky Blue
    lightHex: "#0284c7",
    surfaceBase: "#000000", // True Zero-Nit OLED Black
    surfaceCard: "#0a0a0d", // Dark Carbon Surface
    surfaceElevated: "#121216", // Elevated Card/Popover
    surfaceSunken: "#050507", // Sunken Terminal/Code Surface
    surfaceHover: "#181820", // Tactile Hover
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(56, 189, 248, 0.35)",
    borderAccent: "#38bdf8", // Electric Sky Blue
    accentFg: "#09090b",
    cyberAccent: "#38bdf8", // Primary Cyber Accent
    cyberAccentGlow: "rgba(56, 189, 248, 0.50)",
    cyberAccentBg: "rgba(56, 189, 248, 0.12)",
    textPrimary: "#ffffff", // Pure White High-Contrast
    textSecondary: "#e4e4e7",
    textMuted: "#94a3b8",
    textTertiary: "#64748b",
    windowBarBg: "#060608",
    headerBg: "#08080b",
    trackBarBg: "#050507",
    hudBg: "rgba(10, 10, 13, 0.95)",
    hudBorder: "rgba(56, 189, 248, 0.45)",
  },

  // 2. Obsidian Dark / Zinc
  obsidian: {
    id: "obsidian",
    name: "Obsidian Dark / Zinc",
    tagline: "Cold zinc dark and clean zinc slate",
    darkHex: "rgb(14 165 233)", // #0ea5e9
    lightHex: "rgb(2 132 199)",
    surfaceBase: "#09090b",
    surfaceCard: "#121215",
    surfaceElevated: "#18181b",
    surfaceSunken: "#0c0c0f",
    surfaceHover: "#1e1e23",
    borderSubtle: "#27272a",
    borderStrong: "#3f3f46",
    borderAccent: "#0ea5e9",
    accentFg: "#f4f4f5",
    cyberAccent: "#0ea5e9",
    cyberAccentGlow: "rgba(14, 165, 233, 0.4)",
    cyberAccentBg: "rgba(14, 165, 233, 0.12)",
    textPrimary: "#f4f4f5",
    textSecondary: "#e4e4e7",
    textMuted: "#a1a1aa",
    textTertiary: "#87878f",
    windowBarBg: "#0e0e11",
    headerBg: "#121215",
    trackBarBg: "#0d0d10",
    hudBg: "rgba(18, 18, 21, 0.95)",
    hudBorder: "rgba(14, 165, 233, 0.4)",
  },

  // 3. Clean Monolith
  monolith: {
    id: "monolith",
    name: "Clean Monolith",
    tagline: "Architectural off-white and crisp graphite",
    darkHex: "rgb(56 189 248)", // #38bdf8
    lightHex: "rgb(2 132 199)",
    surfaceBase: "#18181b",
    surfaceCard: "#27272a",
    surfaceElevated: "#323238",
    surfaceSunken: "#09090b",
    surfaceHover: "#333338",
    borderSubtle: "#3f3f46",
    borderStrong: "#52525b",
    borderAccent: "#38bdf8",
    accentFg: "#09090b",
    cyberAccent: "#38bdf8",
    cyberAccentGlow: "rgba(56, 189, 248, 0.4)",
    cyberAccentBg: "rgba(56, 189, 248, 0.12)",
    textPrimary: "#f4f4f5",
    textSecondary: "#e4e4e7",
    textMuted: "#a1a1aa",
    textTertiary: "#9c9ca2",
    windowBarBg: "#141416",
    headerBg: "#1f1f23",
    trackBarBg: "#18181b",
    hudBg: "rgba(39, 39, 42, 0.95)",
    hudBorder: "rgba(56, 189, 248, 0.4)",
  },

  // 4. Hack The Box
  htb: {
    id: "htb",
    name: "Hack The Box",
    tagline: "OLED black and official HTB lime",
    darkHex: "rgb(159 239 0)", // #9fef00
    lightHex: "rgb(21 128 61)",
    surfaceBase: "#000000",
    surfaceCard: "#0b1015",
    surfaceElevated: "#121820",
    surfaceSunken: "#05070a",
    surfaceHover: "#16202c",
    borderSubtle: "#1c2633",
    borderStrong: "#2a3a4e",
    borderAccent: "#9fef00",
    accentFg: "#09090b",
    cyberAccent: "#9fef00",
    cyberAccentGlow: "rgba(159, 239, 0, 0.45)",
    cyberAccentBg: "rgba(159, 239, 0, 0.14)",
    textPrimary: "#ffffff",
    textSecondary: "#e4e4e7",
    textMuted: "#94a3b8",
    textTertiary: "#7b899c",
    windowBarBg: "#070b0f",
    headerBg: "#0b1015",
    trackBarBg: "#080d12",
    hudBg: "rgba(11, 16, 21, 0.95)",
    hudBorder: "rgba(159, 239, 0, 0.4)",
  },
};

export const theme = {
  colors: {
    bgDark: "#000000",
    bgCard: "#0A0A0D",
    bgCardHover: "#181820",
    bgVoid: "#000000",
    bgOverlay: "rgba(0, 0, 0, 0.88)",
    bgSurface: "#0E1524",

    borderSubtle: "rgba(255, 255, 255, 0.08)",
    borderHighlight: "rgba(56, 189, 248, 0.35)",
    borderCyan: "rgba(56, 189, 248, 0.45)",

    // Tactical Palettes - Blue as primary
    electricBlue: "#38BDF8",   // Primary App Blue
    electricBlueBright: "#7DD3FC",
    electricBlueDark: "#0284C7",

    cyan: "#06B6D4",
    cyanBright: "#22D3EE",
    cyanDark: "#0E7490",

    emerald: "#10B981",       // Reserved for CTF Solved states
    emeraldBright: "#34D399",
    emeraldDark: "#065F46",

    crimson: "#EF4444",       // Critical Severity
    crimsonBright: "#F87171",
    crimsonDark: "#991B1B",

    purple: "#8B5CF6",        // Active Directory / Pivoting
    purpleBright: "#A78BFA",
    purpleDark: "#5B21B6",

    amber: "#F59E0B",         // Medium / Foothold
    amberBright: "#FBBF24",
    amberDark: "#B45309",

    // Typography
    textWhite: "#FFFFFF",
    textMuted: "#94A3B8",
    textDim: "#64748B",
    textDark: "#334155",
  },
  fonts: {
    mono: `${monoFont}, 'Courier New', monospace`,
    cyber: `${cyberFont}, sans-serif`,
    sans: `${sansFont}, -apple-system, sans-serif`,
  },
  shadows: {
    glowBlue: "0 0 25px rgba(56, 189, 248, 0.5), 0 0 60px rgba(56, 189, 248, 0.2)",
    glowCyan: "0 0 25px rgba(6, 182, 212, 0.5), 0 0 60px rgba(6, 182, 212, 0.2)",
    glowEmerald: "0 0 25px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.2)",
    glowCrimson: "0 0 25px rgba(239, 68, 68, 0.5), 0 0 60px rgba(239, 68, 68, 0.2)",
    glowAmber: "0 0 25px rgba(245, 158, 11, 0.5), 0 0 60px rgba(245, 158, 11, 0.2)",
    glowPurple: "0 0 25px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.2)",
    card: "0 20px 40px -15px rgba(0, 0, 0, 0.9)",
  },
};
