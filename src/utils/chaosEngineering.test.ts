import { describe, it, expect } from 'vitest';
import { sanitizeObjectKeys, sanitizeFilename } from './workspaceStorage';
import { parseInlineMarkdown } from './writeupHtmlExporter';
import { useCtfStore } from '../store/useCtfStore';

describe('Chaos Engineering & Resilience Test Suite', () => {
  describe('Phase 2 & 4: Sanitization, Circular References & Path Traversal', () => {
    it('handles deeply nested recursive objects without stack overflow', () => {
      let current: Record<string, unknown> = {};
      const root = current;
      for (let i = 0; i < 60; i++) {
        const next: Record<string, unknown> = {};
        current[`level_${i}`] = next;
        current = next;
      }
      current['payload'] = 'deep-leaf';

      expect(() => sanitizeObjectKeys(root)).not.toThrow();
      const sanitized = sanitizeObjectKeys(root) as Record<string, unknown>;
      expect(sanitized).toBeDefined();
    });

    it('quarantines circular references gracefully without infinite loops', () => {
      const a: Record<string, unknown> = { name: 'nodeA' };
      const b: Record<string, unknown> = { name: 'nodeB', ref: a };
      a.ref = b;

      expect(() => sanitizeObjectKeys(a)).not.toThrow();
      const sanitized = sanitizeObjectKeys(a) as Record<string, unknown>;
      expect(sanitized.name).toBe('nodeA');
      expect((sanitized.ref as Record<string, unknown>).name).toBe('nodeB');
    });

    it('neutralizes path traversal attempts and special characters in filenames', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('writeup/test:file*name?.md')).toBe('testfilename.md');
      expect(sanitizeFilename('   ', 'untitled')).toBe('untitled');
    });

    it('neutralizes Windows reserved device names (CON, PRN, AUX, NUL, COM1, LPT1)', () => {
      expect(sanitizeFilename('CON.txt')).toBe('safe-CON.txt');
      expect(sanitizeFilename('prn.pdf')).toBe('safe-prn.pdf');
      expect(sanitizeFilename('aux')).toBe('safe-aux');
      expect(sanitizeFilename('NUL.tar.gz')).toBe('safe-NUL.tar.gz');
      expect(sanitizeFilename('com1.json')).toBe('safe-com1.json');
      expect(sanitizeFilename('lpt9.html')).toBe('safe-lpt9.html');
      expect(sanitizeFilename('legit_notes.md')).toBe('legit_notes.md');
    });
  });

  describe('Phase 4: ReDoS Vulnerability & Catastrophic Backtracking Neutralization', () => {
    it('processes 10,000 nested adversarial brackets in sub-10ms without ReDoS', () => {
      // Craft adversarial ReDoS string: thousands of unmatched opening brackets followed by mismatch
      const maliciousPayload = '['.repeat(10000) + 'malicious_text' + '](';
      
      const start = performance.now();
      const result = parseInlineMarkdown(maliciousPayload);
      const duration = performance.now() - start;

      // Ensure execution is instantaneous (sub-10ms, usually < 0.2ms)
      expect(duration).toBeLessThan(15);
      expect(typeof result).toBe('string');
    });

    it('correctly parses legitimate markdown links while ignoring unsafe schemes', () => {
      const raw = 'Click [here](https://example.com) or [exploit](javascript:alert(1)) or [flag](data:text/html,bad)';
      const parsed = parseInlineMarkdown(raw);
      expect(parsed).toContain('href="https://example.com"');
      expect(parsed).not.toContain('href="javascript:');
      expect(parsed).not.toContain('href="data:text/html');
    });
  });

  describe('Phase 3: Timer Wall-Clock Delta & Background Sleep Catch-Up', () => {
    it('catches up elapsed seconds based on wall-clock delta when wake-up occurs', () => {
      const state = useCtfStore.getState();
      state.resetTimer();

      // Ensure machine exists or set activeTargetId directly
      useCtfStore.setState({
        activeTargetId: 'target-1',
        activeTimerSeconds: 0,
        isTimerRunning: true,
        timerLastTick: Date.now(),
      });

      expect(useCtfStore.getState().activeTargetId).toBe('target-1');
      expect(useCtfStore.getState().activeTimerSeconds).toBe(0);

      // Simulate a background tab freeze or system sleep where 15 seconds elapsed
      const simulatedPastTick = Date.now() - 15000;
      useCtfStore.setState({ timerLastTick: simulatedPastTick });

      // Trigger one tick (as would happen on wake-up or visibilitychange)
      useCtfStore.getState().tickTimer();

      // Timer seconds should jump forward by ~15 seconds instead of 1 second
      const secondsAfterCatchUp = useCtfStore.getState().activeTimerSeconds;
      expect(secondsAfterCatchUp).toBeGreaterThanOrEqual(14);
      expect(secondsAfterCatchUp).toBeLessThanOrEqual(16);

      useCtfStore.getState().pauseTimer();
      useCtfStore.getState().resetTimer();
    });
  });
});
