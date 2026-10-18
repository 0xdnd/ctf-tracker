/**
 * audioAlerts.ts
 * ZeroBox Tactical Certification Exam Simulator - Audio Alert Engine
 * 
 * Strict Zero-Egress Offline Web Audio API Synthesizer:
 * - Lazy singleton AudioContext to prevent hardware context leaks
 * - Master gain and mute control
 * - Node lifecycle auto-cleanup on sound completion
 * - Graceful fallback / safe no-op in headless/JSDOM test environments
 */

export type AudioAlertType = 'alarm' | 'tick' | 'flag_captured' | 'victory_fanfare';

export interface AudioAlertEngine {
  playAlert(type: AudioAlertType): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

let audioContextInstance: AudioContext | null = null;
let isMutedState = false;

/**
 * Returns or initializes the lazy singleton AudioContext.
 * Automatically handles browser user gesture suspension.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioContextClass();
    }
    if (audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {});
    }
    return audioContextInstance;
  } catch {
    return null;
  }
}

/**
 * Sets whether synthesized audio alerts are muted.
 */
export function setAudioMuted(muted: boolean): void {
  isMutedState = muted;
}

/**
 * Checks whether audio alerts are currently muted.
 */
export function isAudioMuted(): boolean {
  return isMutedState;
}

/**
 * Plays a zero-egress synthesized sound alert.
 */
export function playCyberAlert(type: AudioAlertType): void {
  if (isMutedState) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (type) {
    case 'alarm': {
      // Piercing military/cyber alarm for bio-break expiry and critical warnings
      // Alternating pulse across 3 cycles (total ~540ms)
      const pulses = [
        { start: 0, freq: 880 },
        { start: 0.09, freq: 440 },
        { start: 0.18, freq: 880 },
        { start: 0.27, freq: 440 },
        { start: 0.36, freq: 880 },
        { start: 0.45, freq: 440 },
      ];

      pulses.forEach(({ start, freq }) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + start);

          gain.gain.setValueAtTime(0.18, now + start);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + start);
          osc.stop(now + start + 0.085);

          osc.onended = () => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch {}
          };
        } catch {}
      });
      break;
    }

    case 'tick': {
      // Subtle tactical sonar/relay tick for countdowns
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };
      } catch {}
      break;
    }

    case 'flag_captured': {
      // Ascending crisp confirmation chime: D5 (587.33Hz) -> G5 (783.99Hz) -> C6 (1046.5Hz)
      const notes = [
        { freq: 587.33, offset: 0.0, dur: 0.09 },
        { freq: 783.99, offset: 0.08, dur: 0.09 },
        { freq: 1046.5, offset: 0.16, dur: 0.22 },
      ];

      notes.forEach(({ freq, offset, dur }) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + offset);

          gain.gain.setValueAtTime(0.14, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + offset);
          osc.stop(now + offset + dur);

          osc.onended = () => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch {}
          };
        } catch {}
      });
      break;
    }

    case 'victory_fanfare': {
      // Heroic certification passing fanfare:
      // Sub punch + triumphant arpeggio sequence (C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6)
      const fanfareNotes = [
        { freq: 261.63, offset: 0.0, dur: 0.18, type: 'triangle' as OscillatorType, vol: 0.18 }, // C4
        { freq: 329.63, offset: 0.12, dur: 0.18, type: 'triangle' as OscillatorType, vol: 0.18 }, // E4
        { freq: 392.00, offset: 0.24, dur: 0.22, type: 'triangle' as OscillatorType, vol: 0.20 }, // G4
        { freq: 523.25, offset: 0.38, dur: 0.28, type: 'sine' as OscillatorType, vol: 0.22 },     // C5
        { freq: 659.25, offset: 0.52, dur: 0.32, type: 'sine' as OscillatorType, vol: 0.22 },     // E5
        { freq: 783.99, offset: 0.66, dur: 0.36, type: 'sine' as OscillatorType, vol: 0.24 },     // G5
        { freq: 1046.5, offset: 0.82, dur: 0.70, type: 'sine' as OscillatorType, vol: 0.26 },     // C6
      ];

      fanfareNotes.forEach(({ freq, offset, dur, type: oscType, vol }) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = oscType;
          osc.frequency.setValueAtTime(freq, now + offset);

          gain.gain.setValueAtTime(vol, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + offset);
          osc.stop(now + offset + dur);

          osc.onended = () => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch {}
          };
        } catch {}
      });
      break;
    }
  }
}

/**
 * Audio Alert Engine implementation adhering to the AudioAlertEngine contract.
 */
export const audioAlertEngine: AudioAlertEngine = {
  playAlert: playCyberAlert,
  setMuted: setAudioMuted,
  isMuted: isAudioMuted,
};

/**
 * Testing helper: resets the AudioContext singleton.
 */
export function _resetAudioContextForTesting(): void {
  if (audioContextInstance) {
    try {
      audioContextInstance.close().catch(() => {});
    } catch {}
    audioContextInstance = null;
  }
  isMutedState = false;
}
