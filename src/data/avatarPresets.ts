export interface CyberAvatarPreset {
  id: string;
  name: string;
  callsign: string;
  accentColor: string;
  badgeBorder: string;
  dataUri: string;
  svgDataUri?: string;
  description?: string;
}

export const CYBER_AVATAR_PRESETS: CyberAvatarPreset[] = [
  {
    id: 'glitch-skull',
    name: 'Glitch Skull',
    callsign: 'CYBER-SKULL',
    accentColor: '#10b981',
    badgeBorder: 'border-emerald-500/50',
    description: 'Glitch skull combat insignia',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-opacity="0.4"/><path d="M18 20 C18 12 46 12 46 20 C46 28 42 34 42 42 L22 42 C22 34 18 28 18 20 Z" fill="%230f1b29" stroke="%2310b981" stroke-width="2"/><circle cx="26" cy="26" r="4.5" fill="%2310b981"/><circle cx="38" cy="26" r="4.5" fill="%2310b981"/><path d="M30 32 L34 32 L32 37 Z" fill="%2310b981"/><rect x="25" y="42" width="14" height="10" fill="%230f1b29" stroke="%2310b981" stroke-width="1.5"/><line x1="28" y1="42" x2="28" y2="52" stroke="%2310b981" stroke-width="1.5"/><line x1="32" y1="42" x2="32" y2="52" stroke="%2310b981" stroke-width="1.5"/><line x1="36" y1="42" x2="36" y2="52" stroke="%2310b981" stroke-width="1.5"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-opacity="0.4"/><path d="M18 20 C18 12 46 12 46 20 C46 28 42 34 42 42 L22 42 C22 34 18 28 18 20 Z" fill="%230f1b29" stroke="%2310b981" stroke-width="2"/><circle cx="26" cy="26" r="4.5" fill="%2310b981"/><circle cx="38" cy="26" r="4.5" fill="%2310b981"/><path d="M30 32 L34 32 L32 37 Z" fill="%2310b981"/><rect x="25" y="42" width="14" height="10" fill="%230f1b29" stroke="%2310b981" stroke-width="1.5"/><line x1="28" y1="42" x2="28" y2="52" stroke="%2310b981" stroke-width="1.5"/><line x1="32" y1="42" x2="32" y2="52" stroke="%2310b981" stroke-width="1.5"/><line x1="36" y1="42" x2="36" y2="52" stroke="%2310b981" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'cyber-viper',
    name: 'Cyber Viper',
    callsign: 'VIPER-01',
    accentColor: '#06b6d4',
    badgeBorder: 'border-cyan-500/50',
    description: 'Cyber viper reconnaissance operative',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2306b6d4" stroke-width="1.5" stroke-opacity="0.4"/><path d="M32 12 L48 24 L42 44 L32 54 L22 44 L16 24 Z" fill="%230c1e2e" stroke="%2306b6d4" stroke-width="2"/><circle cx="27" cy="26" r="3" fill="%2306b6d4"/><circle cx="37" cy="26" r="3" fill="%2306b6d4"/><path d="M32 34 L32 46 M28 42 L32 46 L36 42" stroke="%2306b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="24" x2="48" y2="24" stroke="%2306b6d4" stroke-width="1" stroke-opacity="0.6"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2306b6d4" stroke-width="1.5" stroke-opacity="0.4"/><path d="M32 12 L48 24 L42 44 L32 54 L22 44 L16 24 Z" fill="%230c1e2e" stroke="%2306b6d4" stroke-width="2"/><circle cx="27" cy="26" r="3" fill="%2306b6d4"/><circle cx="37" cy="26" r="3" fill="%2306b6d4"/><path d="M32 34 L32 46 M28 42 L32 46 L36 42" stroke="%2306b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="24" x2="48" y2="24" stroke="%2306b6d4" stroke-width="1" stroke-opacity="0.6"/></svg>`,
  },
  {
    id: 'cyber-hawk',
    name: 'Cyber Hawk',
    callsign: 'HAWK-EYE',
    accentColor: '#f59e0b',
    badgeBorder: 'border-amber-500/50',
    description: 'Tactical hawk aerial sensor network',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%23f59e0b" stroke-width="1.5" stroke-opacity="0.4"/><polygon points="32,10 46,26 38,40 32,56 26,40 18,26" fill="%2322190d" stroke="%23f59e0b" stroke-width="2"/><line x1="22" y1="24" x2="42" y2="24" stroke="%23f59e0b" stroke-width="3"/><circle cx="26" cy="28" r="2.5" fill="%23f59e0b"/><circle cx="38" cy="28" r="2.5" fill="%23f59e0b"/><polygon points="32,32 36,44 28,44" fill="%23f59e0b"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%23f59e0b" stroke-width="1.5" stroke-opacity="0.4"/><polygon points="32,10 46,26 38,40 32,56 26,40 18,26" fill="%2322190d" stroke="%23f59e0b" stroke-width="2"/><line x1="22" y1="24" x2="42" y2="24" stroke="%23f59e0b" stroke-width="3"/><circle cx="26" cy="28" r="2.5" fill="%23f59e0b"/><circle cx="38" cy="28" r="2.5" fill="%23f59e0b"/><polygon points="32,32 36,44 28,44" fill="%23f59e0b"/></svg>`,
  },
  {
    id: 'terminal-sentinel',
    name: 'Terminal Sentinel',
    callsign: 'SENTINEL',
    accentColor: '#10b981',
    badgeBorder: 'border-emerald-500/50',
    description: 'Terminal sentinel defensive shield',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-opacity="0.4"/><circle cx="32" cy="32" r="18" fill="%230a1c18" stroke="%2310b981" stroke-width="2"/><line x1="32" y1="10" x2="32" y2="54" stroke="%2310b981" stroke-width="1.5" stroke-dasharray="2 2"/><line x1="10" y1="32" x2="54" y2="32" stroke="%2310b981" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="32" cy="32" r="8" fill="none" stroke="%2310b981" stroke-width="2"/><circle cx="32" cy="32" r="3" fill="%2310b981"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-opacity="0.4"/><circle cx="32" cy="32" r="18" fill="%230a1c18" stroke="%2310b981" stroke-width="2"/><line x1="32" y1="10" x2="32" y2="54" stroke="%2310b981" stroke-width="1.5" stroke-dasharray="2 2"/><line x1="10" y1="32" x2="54" y2="32" stroke="%2310b981" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="32" cy="32" r="8" fill="none" stroke="%2310b981" stroke-width="2"/><circle cx="32" cy="32" r="3" fill="%2310b981"/></svg>`,
  },
  {
    id: 'neon-nomad',
    name: 'Neon Nomad',
    callsign: 'NOMAD-NET',
    accentColor: '#8b5cf6',
    badgeBorder: 'border-purple-500/50',
    description: 'Neon nomad roaming infiltrator',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%238b5cf6" stroke-width="1.5" stroke-opacity="0.4"/><path d="M16 48 L16 30 C16 16 48 16 48 30 L48 48 Z" fill="%23190e2e" stroke="%238b5cf6" stroke-width="2"/><rect x="22" y="28" width="20" height="8" rx="2" fill="%238b5cf6"/><line x1="24" y1="32" x2="40" y2="32" stroke="%23ffffff" stroke-width="1.5"/><circle cx="28" cy="32" r="1.5" fill="%23ffffff"/><circle cx="36" cy="32" r="1.5" fill="%23ffffff"/><path d="M26 42 L38 42" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%238b5cf6" stroke-width="1.5" stroke-opacity="0.4"/><path d="M16 48 L16 30 C16 16 48 16 48 30 L48 48 Z" fill="%23190e2e" stroke="%238b5cf6" stroke-width="2"/><rect x="22" y="28" width="20" height="8" rx="2" fill="%238b5cf6"/><line x1="24" y1="32" x2="40" y2="32" stroke="%23ffffff" stroke-width="1.5"/><circle cx="28" cy="32" r="1.5" fill="%23ffffff"/><circle cx="36" cy="32" r="1.5" fill="%23ffffff"/><path d="M26 42 L38 42" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'binary-ghost',
    name: 'Binary Ghost',
    callsign: 'PHANTOM',
    accentColor: '#38bdf8',
    badgeBorder: 'border-sky-500/50',
    description: 'Binary ghost stealth bypass',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-opacity="0.4"/><path d="M18 36 C18 18 46 18 46 36 L46 50 L40 44 L32 50 L24 44 L18 50 Z" fill="%230c1f2e" stroke="%2338bdf8" stroke-width="2"/><circle cx="27" cy="30" r="3.5" fill="%2338bdf8"/><circle cx="37" cy="30" r="3.5" fill="%2338bdf8"/><line x1="24" y1="24" x2="40" y2="24" stroke="%2338bdf8" stroke-width="1" stroke-dasharray="1 2"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-opacity="0.4"/><path d="M18 36 C18 18 46 18 46 36 L46 50 L40 44 L32 50 L24 44 L18 50 Z" fill="%230c1f2e" stroke="%2338bdf8" stroke-width="2"/><circle cx="27" cy="30" r="3.5" fill="%2338bdf8"/><circle cx="37" cy="30" r="3.5" fill="%2338bdf8"/><line x1="24" y1="24" x2="40" y2="24" stroke="%2338bdf8" stroke-width="1" stroke-dasharray="1 2"/></svg>`,
  },
  {
    id: 'grid-warden',
    name: 'Grid Warden',
    callsign: 'WARDEN-SEC',
    accentColor: '#10b981',
    badgeBorder: 'border-emerald-500/50',
    description: 'Grid warden infrastructure defender',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-opacity="0.4"/><path d="M32 12 L48 20 L48 36 C48 46 32 54 32 54 C32 54 16 46 16 36 L16 20 Z" fill="%230e2118" stroke="%2310b981" stroke-width="2"/><path d="M32 22 L40 28 L40 36 C40 42 32 47 32 47 C32 47 24 42 24 36 L24 28 Z" fill="%2310b981" fill-opacity="0.3" stroke="%2310b981" stroke-width="1.5"/><circle cx="32" cy="34" r="3" fill="%2310b981"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-opacity="0.4"/><path d="M32 12 L48 20 L48 36 C48 46 32 54 32 54 C32 54 16 46 16 36 L16 20 Z" fill="%230e2118" stroke="%2310b981" stroke-width="2"/><path d="M32 22 L40 28 L40 36 C40 42 32 47 32 47 C32 47 24 42 24 36 L24 28 Z" fill="%2310b981" fill-opacity="0.3" stroke="%2310b981" stroke-width="1.5"/><circle cx="32" cy="34" r="3" fill="%2310b981"/></svg>`,
  },
  {
    id: 'root-daemon',
    name: 'Root Daemon',
    callsign: 'DAEMON-00',
    accentColor: '#f43f5e',
    badgeBorder: 'border-rose-500/50',
    description: 'Root daemon privileged persistence',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%23f43f5e" stroke-width="1.5" stroke-opacity="0.4"/><path d="M16 16 L24 24 L22 36 L32 50 L42 36 L40 24 L48 16 L44 30 L40 44 L32 54 L24 44 L20 30 Z" fill="%23260c14" stroke="%23f43f5e" stroke-width="2"/><circle cx="26" cy="32" r="3" fill="%23f43f5e"/><circle cx="38" cy="32" r="3" fill="%23f43f5e"/><line x1="28" y1="42" x2="36" y2="42" stroke="%23f43f5e" stroke-width="2"/></svg>`,
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="%23090d16"/><rect x="4" y="4" width="56" height="56" rx="8" fill="none" stroke="%23f43f5e" stroke-width="1.5" stroke-opacity="0.4"/><path d="M16 16 L24 24 L22 36 L32 50 L42 36 L40 24 L48 16 L44 30 L40 44 L32 54 L24 44 L20 30 Z" fill="%23260c14" stroke="%23f43f5e" stroke-width="2"/><circle cx="26" cy="32" r="3" fill="%23f43f5e"/><circle cx="38" cy="32" r="3" fill="%23f43f5e"/><line x1="28" y1="42" x2="36" y2="42" stroke="%23f43f5e" stroke-width="2"/></svg>`,
  },
];

export function getAvatarPresetById(id?: string): CyberAvatarPreset {
  if (!id) return CYBER_AVATAR_PRESETS[0];
  const found = CYBER_AVATAR_PRESETS.find((a) => a.id === id);
  return found || CYBER_AVATAR_PRESETS[0];
}

export function getAvatarSvgDataUri(id?: string): string {
  return getAvatarPresetById(id).dataUri;
}
