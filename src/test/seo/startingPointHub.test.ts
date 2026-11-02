// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const req = createRequire(import.meta.url);
const { isStartingPointHub, getModel } = req('../../../scripts/lib/content-model.cjs');

describe('Starting Point rows', () => {
  it('counts the rows that share the generic hub URL', () => {
    const rows = (getModel().machines as { roomUrl?: string }[]).filter((m) => isStartingPointHub(m.roomUrl));
    expect(rows.length).toBe(20);
  });
});

describe('Starting Point hub url', () => {
  it('matches only the exact generic hub url', () => {
    expect(isStartingPointHub('https://app.hackthebox.com/starting-point')).toBe(true);
    expect(isStartingPointHub('https://app.hackthebox.com/machines/Meow')).toBe(false);
    expect(isStartingPointHub('https://app.hackthebox.com/starting-point/')).toBe(false);
    expect(isStartingPointHub(undefined)).toBe(false);
  });
});
