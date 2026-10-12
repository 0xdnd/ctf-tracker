import { GlobalVariables } from '../types';
import { contextFromGlobalVars, resolveTemplate, SubstitutionContext } from './variableSubstitution';

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

/**
 * Legacy callers (cheatsheet, checklist, writeup, machine modal) share the
 * engine in `variableSubstitution.ts` but keep the historical alias table:
 * `{ip}` is the TARGET (case-insensitive) and `{port}`/`{shell}` are not
 * variables. Hence `legacyAliases: true`. Placeholder values stored in the
 * vars (`10.10.14.X`, `10.10.10.X`) count as "not set".
 */
function legacyContext(vars: GlobalVariables): SubstitutionContext {
  return { ...contextFromGlobalVars(vars) };
}

export function interpolateCommand(template: string, vars: GlobalVariables): string {
  if (!template) return '';
  return resolveTemplate(template, legacyContext(vars), { legacyAliases: true }).text;
}

export function getUnresolvedTokens(template: string, vars: GlobalVariables): string[] {
  if (!template) return [];
  const ctx = legacyContext(vars);
  if (ctx.lhost === '10.10.14.X') ctx.lhost = '';
  if (ctx.rhost === '10.10.10.X') ctx.rhost = '';
  const { unresolved } = resolveTemplate(template, ctx, { legacyAliases: true });
  // Historical report order: LHOST, TARGET_IP, LPORT first, then anything else
  // in order of appearance. INTERFACE was never reported (it falls back to tun0).
  const priority = ['LHOST', 'TARGET_IP', 'LPORT'];
  return [
    ...priority.filter((p) => unresolved.includes(p)),
    ...unresolved.filter((u) => !priority.includes(u) && u !== 'INTERFACE'),
  ];
}

let sharedCyberAudioCtx: AudioContext | null = null;

export function playCyberSound(type: 'click' | 'root' | 'toggle' | 'timer' | 'copy' | 'flag' | 'export' | 'shuffle' | 'engage' | 'alert') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedCyberAudioCtx || sharedCyberAudioCtx.state === 'closed') {
      sharedCyberAudioCtx = new AudioContextClass();
    }
    if (sharedCyberAudioCtx.state === 'suspended') {
      sharedCyberAudioCtx.resume().catch(() => {});
    }
    const ctx = sharedCyberAudioCtx;
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
    } else if (type === 'alert') {
      // Descending two-tone error cue
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
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
  // Loaded on demand so canvas-confetti stays out of the entry preload graph.
  import('canvas-confetti')
    .then(({ default: confetti }) => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#06B6D4', '#EF4444', '#8B5CF6', '#F59E0B']
      });
    })
    .catch(() => {});
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
      const success = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
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
