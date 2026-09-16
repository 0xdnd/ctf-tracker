import confetti from 'canvas-confetti';
import { GlobalVariables } from '../types';

export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationHuman(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function interpolateCommand(template: string, vars: GlobalVariables): string {
  if (!template) return '';
  let result = template;
  const target = vars.targetIp || '10.10.10.X';
  const lhost = vars.lhost || '10.10.14.X';
  const lport = vars.lport || '4444';
  const iface = vars.interface || 'tun0';

  // Standard curly tokens
  result = result.replace(/\{(?:TARGET_IP|TARGET|IP)\}/gi, target);
  result = result.replace(/\{LHOST\}/gi, lhost);
  result = result.replace(/\{LPORT\}/gi, lport);
  result = result.replace(/\{INTERFACE\}/gi, iface);

  // Obsidian Field Manual angle tokens (<IP>, <TARGET>, <TARGET_IP>, <LHOST>, <LPORT>)
  result = result.replace(/<(?:TARGET_IP|TARGET|IP|Target-IP)>/gi, target);
  result = result.replace(/<LHOST>/gi, lhost);
  result = result.replace(/<LPORT>/gi, lport);
  result = result.replace(/<INTERFACE>/gi, iface);

  if (vars.customVars) {
    Object.entries(vars.customVars).forEach(([key, val]) => {
      if (!key) return;
      const safeKey = escapeRegex(key);
      const reg = new RegExp(`\\{${safeKey}\\}`, 'g');
      result = result.replace(reg, val);
      const regAngle = new RegExp(`<${safeKey}>`, 'gi');
      result = result.replace(regAngle, val);
    });
  }
  return result;
}

export function playCyberSound(type: 'click' | 'root' | 'toggle' | 'timer' | 'copy' | 'flag' | 'export' | 'shuffle' | 'engage') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'copy') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'toggle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'flag') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'engage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'export' || type === 'shuffle') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'root') {
      // Fanfare sequence
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'timer') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // Audio contexts might be blocked before first interaction
  }
}

export function triggerRootCelebration() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#06B6D4', '#EF4444', '#8B5CF6', '#F59E0B']
  });
}

export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard.writeText failed, using fallback', err);
  }

  try {
    if (typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      return success;
    }
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  return false;
}

/**
 * Strict protocol sanitizer for external target URLs (preventing javascript: XSS)
 */
export function sanitizeExternalUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Automatically prepend https:// for bare domains (e.g. tryhackme.com/room/...)
  if (/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return undefined;
}

/**
 * Official verified profile and support links for Daniel Dayan (@0xdnd)
 */
export const CREATOR_PROFILE_LINKS = {
  portfolio: 'https://0xdnd.github.io/',
  linkedin: 'https://www.linkedin.com/in/daniel-dayan-a66322352/',
  github: 'https://github.com/0xdnd',
  writeups: 'https://0xdnd.gitbook.io/thm-writeups/',
  coffee: 'https://buymeacoffee.com/0xdnd'
} as const;
