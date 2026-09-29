import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  playCyberAlert,
  setAudioMuted,
  isAudioMuted,
  audioAlertEngine,
  _resetAudioContextForTesting,
} from './audioAlerts';

describe('audioAlerts Web Audio API Synthesizer', () => {
  beforeEach(() => {
    _resetAudioContextForTesting();
    setAudioMuted(false);
  });

  afterEach(() => {
    _resetAudioContextForTesting();
  });

  it('manages mute state correctly', () => {
    expect(isAudioMuted()).toBe(false);
    expect(audioAlertEngine.isMuted()).toBe(false);

    setAudioMuted(true);
    expect(isAudioMuted()).toBe(true);
    expect(audioAlertEngine.isMuted()).toBe(true);

    audioAlertEngine.setMuted(false);
    expect(isAudioMuted()).toBe(false);
  });

  it('safely handles non-browser / JSDOM environment without throwing', () => {
    expect(() => playCyberAlert('alarm')).not.toThrow();
    expect(() => playCyberAlert('tick')).not.toThrow();
    expect(() => playCyberAlert('flag_captured')).not.toThrow();
    expect(() => playCyberAlert('victory_fanfare')).not.toThrow();
  });

  it('does not attempt audio playback when muted', () => {
    setAudioMuted(true);
    const mockContext = vi.fn();
    (window as any).AudioContext = mockContext;

    playCyberAlert('alarm');
    expect(mockContext).not.toHaveBeenCalled();
  });

  it('reuses lazy singleton AudioContext without instantiating new contexts on every play', () => {
    let contextCreationCount = 0;

    const mockOscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null as any,
    };

    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    class MockAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return { ...mockOscillator };
      }
      createGain() {
        return { ...mockGain };
      }
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);

      constructor() {
        contextCreationCount++;
      }
    }

    const originalAudioContext = window.AudioContext;
    (window as any).AudioContext = MockAudioContext;

    try {
      playCyberAlert('alarm');
      playCyberAlert('tick');
      playCyberAlert('flag_captured');
      playCyberAlert('victory_fanfare');

      expect(contextCreationCount).toBe(1); // Singleton verified!
    } finally {
      (window as any).AudioContext = originalAudioContext;
    }
  });

  it('exposes audioAlertEngine adhering to the spec contract', () => {
    expect(typeof audioAlertEngine.playAlert).toBe('function');
    expect(typeof audioAlertEngine.setMuted).toBe('function');
    expect(typeof audioAlertEngine.isMuted).toBe('function');

    audioAlertEngine.setMuted(true);
    expect(audioAlertEngine.isMuted()).toBe(true);
  });
});
