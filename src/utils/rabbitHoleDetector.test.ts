import { describe, it, expect } from 'vitest';
import { evaluateRabbitHoleStatus } from './rabbitHoleDetector';
import { Machine } from '../types';

describe('rabbitHoleDetector utility', () => {
  const baseMachine: Machine = {
    id: 'test-box-1',
    name: 'TestBox',
    ip: '10.10.10.200',
    os: 'Linux',
    difficulty: 'Medium',
    platform: 'HTB',
    status: 'recon',
    tags: ['web'],
    certifications: [],
    timeSpentSeconds: 1200,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    openPorts: [80, 22],
    checklist: {
      openPorts: [80, 22],
      activeItemId: null,
      itemsState: {},
    },
  };

  it('returns isRabbitHole: false when no item is active', () => {
    const warning = evaluateRabbitHoleStatus(baseMachine, 30);

    expect(warning.isRabbitHole).toBe(false);
    expect(warning.elapsedMinutes).toBe(0);
    expect(warning.activeItem).toBeUndefined();
    expect(warning.message).toBe('');
  });

  it('returns isRabbitHole: false when active item is within time threshold', () => {
    const machineWithActive: Machine = {
      ...baseMachine,
      checklist: {
        openPorts: [80, 22],
        activeItemId: 'p01-fast-syn',
        itemsState: {
          'p01-fast-syn': {
            status: 'in_progress',
            timeSpentSeconds: 600, // 10 minutes
          },
        },
      },
    };

    const warning = evaluateRabbitHoleStatus(machineWithActive, 30);

    expect(warning.isRabbitHole).toBe(false);
    expect(warning.elapsedMinutes).toBe(10);
    expect(warning.activeItem?.id).toBe('p01-fast-syn');
    expect(warning.message).toBe('');
  });

  it('detects a rabbit hole when time exceeds the threshold and provides fallback item', () => {
    const machineStuck: Machine = {
      ...baseMachine,
      checklist: {
        openPorts: [80, 22],
        activeItemId: 'p01-fast-syn',
        itemsState: {
          'p01-fast-syn': {
            status: 'in_progress',
            timeSpentSeconds: 2400, // 40 minutes
          },
        },
      },
    };

    const warning = evaluateRabbitHoleStatus(machineStuck, 30);

    expect(warning.isRabbitHole).toBe(true);
    expect(warning.elapsedMinutes).toBe(40);
    expect(warning.activeItem?.id).toBe('p01-fast-syn');
    expect(warning.message).toContain('Potential Rabbit Hole detected!');
    expect(warning.message).toContain('40m');
    expect(warning.recommendedFallback).toBeDefined();
    expect(warning.recommendedFallback?.id).toBe('p01-full-tcp');
    expect(warning.fallbackPhaseTitle).toBeDefined();
  });
});
