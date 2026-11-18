import { Machine, Difficulty } from '../../../types';

// ---------------------------------------------------------------------------
// Telemetry Extraction & Badge Helpers
// ---------------------------------------------------------------------------
export function extractMachinePorts(machine: Machine): number[] {
  if (Array.isArray(machine.openPorts) && machine.openPorts.length > 0) {
    return machine.openPorts;
  }
  if (Array.isArray(machine.services) && machine.services.length > 0) {
    return machine.services
      .map((s) => s.port)
      .filter((p) => typeof p === 'number' && p > 0);
  }
  return [];
}

export function getDifficultyColors(
  diff: Difficulty | string,
  isDark?: boolean
): { fill: string; stroke: string; text: string } {
  const dark = isDark !== undefined 
    ? isDark 
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true);

  if (!dark) {
    switch (diff) {
      case 'Very Easy':
        return { fill: 'rgba(14, 116, 144, 0.15)', stroke: 'rgba(14, 116, 144, 0.6)', text: '#0E7490' };
      case 'Easy':
        return { fill: 'rgba(4, 120, 87, 0.15)', stroke: 'rgba(4, 120, 87, 0.6)', text: '#047857' };
      case 'Medium':
        return { fill: 'rgba(180, 83, 9, 0.15)', stroke: 'rgba(180, 83, 9, 0.6)', text: '#B45309' };
      case 'Hard':
        return { fill: 'rgba(190, 18, 60, 0.15)', stroke: 'rgba(190, 18, 60, 0.6)', text: '#BE123C' };
      case 'Insane':
        return { fill: 'rgba(126, 34, 206, 0.15)', stroke: 'rgba(126, 34, 206, 0.6)', text: '#7E22CE' };
      default:
        return { fill: 'rgba(71, 85, 105, 0.15)', stroke: 'rgba(71, 85, 105, 0.6)', text: '#475569' };
    }
  }

  switch (diff) {
    case 'Very Easy':
      return { fill: 'rgba(6, 182, 212, 0.15)', stroke: 'rgba(6, 182, 212, 0.6)', text: '#06B6D4' };
    case 'Easy':
      return { fill: 'rgba(16, 185, 129, 0.15)', stroke: 'rgba(16, 185, 129, 0.6)', text: '#10B981' };
    case 'Medium':
      return { fill: 'rgba(245, 158, 11, 0.15)', stroke: 'rgba(245, 158, 11, 0.6)', text: '#F59E0B' };
    case 'Hard':
      return { fill: 'rgba(244, 63, 94, 0.15)', stroke: 'rgba(244, 63, 94, 0.6)', text: '#F43F5E' };
    case 'Insane':
      return { fill: 'rgba(168, 85, 247, 0.15)', stroke: 'rgba(168, 85, 247, 0.6)', text: '#A855F7' };
    default:
      return { fill: 'rgba(148, 163, 184, 0.15)', stroke: 'rgba(148, 163, 184, 0.6)', text: '#94A3B8' };
  }
}

export function getPortColor(port: number, isDark?: boolean): { text: string; stroke: string; bg: string } {
  const dark = isDark !== undefined 
    ? isDark 
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true);

  if (!dark) {
    if (port === 22 || port === 2222) {
      return { text: '#047857', stroke: 'rgba(4, 120, 87, 0.5)', bg: 'rgba(4, 120, 87, 0.12)' };
    }
    if (port === 80 || port === 443 || port === 8080 || port === 8443) {
      return { text: '#0E7490', stroke: 'rgba(14, 116, 144, 0.5)', bg: 'rgba(14, 116, 144, 0.12)' };
    }
    if (port === 445 || port === 139 || port === 135) {
      return { text: '#B45309', stroke: 'rgba(180, 83, 9, 0.5)', bg: 'rgba(180, 83, 9, 0.12)' };
    }
    if (port === 88 || port === 389 || port === 636) {
      return { text: '#BE123C', stroke: 'rgba(190, 18, 60, 0.5)', bg: 'rgba(190, 18, 60, 0.12)' };
    }
    if (port === 3389 || port === 5900) {
      return { text: '#0369A1', stroke: 'rgba(3, 105, 161, 0.5)', bg: 'rgba(3, 105, 161, 0.12)' };
    }
    return { text: '#475569', stroke: 'rgba(71, 85, 105, 0.4)', bg: 'rgba(71, 85, 105, 0.08)' };
  }

  if (port === 22 || port === 2222) {
    return { text: '#10B981', stroke: 'rgba(16, 185, 129, 0.5)', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  if (port === 80 || port === 443 || port === 8080 || port === 8443) {
    return { text: '#06B6D4', stroke: 'rgba(6, 182, 212, 0.5)', bg: 'rgba(6, 182, 212, 0.12)' };
  }
  if (port === 445 || port === 139 || port === 135) {
    return { text: '#F59E0B', stroke: 'rgba(245, 158, 11, 0.5)', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  if (port === 88 || port === 389 || port === 636) {
    return { text: '#EC4899', stroke: 'rgba(236, 72, 153, 0.5)', bg: 'rgba(236, 72, 153, 0.12)' };
  }
  if (port === 3389 || port === 5900) {
    return { text: '#38BDF8', stroke: 'rgba(56, 189, 248, 0.5)', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  return { text: '#94A3B8', stroke: 'rgba(148, 163, 184, 0.4)', bg: 'rgba(148, 163, 184, 0.08)' };
}

// OS Vector Paths
export const WINDOWS_PATH = "M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.801";
export const MACOS_PATH = "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.96c.64-.78 1.08-1.86.96-2.96-1 .04-2.12.67-2.78 1.45-.58.67-1.1 1.77-.96 2.84 1.12.09 2.19-.58 2.78-1.33z";
export const ANDROID_PATH = "M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.082 12 8.082s-3.5902.3296-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396";
export const BSD_PATH = "M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10s10-4.476 10-10c0-5.523-4.477-10-10-10zm-2.2 4.5c.5 0 .9.2 1.2.5.3.3.4.7.4 1.1 0 .6-.3 1.2-.7 1.6-.4.4-1 .6-1.6.6-.7 0-1.3-.2-1.7-.7-.4-.5-.6-1.1-.6-1.8 0-.4.1-.7.4-.9.3-.2.7-.4 1-.4zm6.4 0c.4 0 .8.2 1.1.4.3.2.4.5.4.9 0 .7-.2 1.3-.6 1.8-.4.5-1 .7-1.7.7-.6 0-1.2-.2-1.6-.6-.4-.4-.7-1-.7-1.6 0-.4.1-.8.4-1.1.3-.3.7-.5 1.3-.5zM12 18.2c-3.1 0-5.5-2-5.7-4.7h11.4c-.2 2.7-2.6 4.7-5.7 4.7z";
