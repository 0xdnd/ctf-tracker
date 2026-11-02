// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const req = createRequire(import.meta.url);
const { isRealSummary } = req('../../../scripts/lib/content-model.cjs');

describe('summary rule', () => {
  it('accepts a full sentence', () => {
    expect(isRealSummary('Connect to open Telnet port 23 and log in with user root without password.')).toBe(true);
    expect(isRealSummary('Is the login filter bypassable?')).toBe(true);
  });
  it('rejects empty, stub and cut-off hints', () => {
    expect(isRealSummary('')).toBe(false);
    expect(isRealSummary(undefined)).toBe(false);
    expect(isRealSummary('Hack The Box Linux machine. Rated Easy difficulty.')).toBe(false);
    expect(isRealSummary('TryHackMe Windows machine. Rated Medium difficulty.')).toBe(false);
    expect(isRealSummary('Optimum is a beginner-level machine which mainly focuses on')).toBe(false);
    expect(isRealSummary('Bashed is a fairly easy machine which focuses mainly on fuzzing and locating important files. As basic access to the crontab is restricted,')).toBe(false);
    expect(isRealSummary('The text trails off...')).toBe(false);
  });
});
