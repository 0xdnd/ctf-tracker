import { describe, it, expect } from 'vitest';
import { 
  evaluateOperatorGamification, 
  syncOperatorTrophies} from './gamificationEngine';
import { Machine } from '../types';

describe('gamificationEngine', () => {
  it('initializes a fresh operator at Rank 1 (NOVICE PROBE) with 0 XP', () => {
    const result = evaluateOperatorGamification({
      machines: [],
      unlockedTrophies: {},
    });

    expect(result.totalXp).toBe(0);
    expect(result.currentRank.tier).toBe(1);
    expect(result.currentRank.title).toBe('NOVICE PROBE');
    expect(result.nextRank?.title).toBe('SCRIPT INFILTRATOR');
    expect(result.rankProgressPct).toBe(0);
    expect(result.unlockedCount).toBe(0);
  });

  it('correctly calculates XP across footholds, roots, flags, and scans', () => {
    const mockMachines: Machine[] = [
      {
        id: 'box-easy',
        name: 'EasyBox',
        ip: '10.10.10.1',
        difficulty: 'Easy',
        status: 'root',
        userFlag: 'flag1',
        rootFlag: 'flag2',
        openPorts: [80, 22],
        platform: 'HTB',
        os: 'Linux',
        tags: [],
        certifications: [],
        timeSpentSeconds: 1000,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'box-med',
        name: 'MediumBox',
        ip: '10.10.10.2',
        difficulty: 'Medium',
        status: 'foothold',
        userFlag: 'flag3',
        platform: 'HTB',
        os: 'Linux',
        tags: [],
        certifications: [],
        timeSpentSeconds: 500,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    // Easy root: 20 XP
    // Foothold: 10 XP
    // 3 flags: 3 * 5 = 15 XP
    // 1 Nmap scan: 5 XP
    // Total XP = 20 + 10 + 15 + 5 = 50 XP
    const result = evaluateOperatorGamification({
      machines: mockMachines,
    });

    expect(result.totalXp).toBe(50);
    expect(result.currentRank.title).toBe('NOVICE PROBE');
    expect(result.stats.rootedMachines).toBe(1);
    expect(result.stats.footholdMachines).toBe(1);
    expect(result.stats.totalFlags).toBe(3);
    expect(result.stats.nmapScansCount).toBe(1);
  });

  it('promotes operator to higher ranks as XP thresholds are breached', () => {
    // Breaching 100 XP -> SCRIPT INFILTRATOR
    const result100 = evaluateOperatorGamification({
      machines: Array.from({ length: 5 }, (_, i) => ({
        id: `box-${i}`,
        name: `Box ${i}`,
        ip: `10.10.10.${i + 1}`,
        difficulty: 'Easy',
        status: 'root',
        platform: 'HTB',
        os: 'Linux',
        tags: [],
        certifications: [],
        timeSpentSeconds: 100,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      })), // 5 * 20 XP = 100 XP
    });
    expect(result100.currentRank.tier).toBe(2);
    expect(result100.currentRank.title).toBe('SCRIPT INFILTRATOR');

    // Breaching 3000 XP -> APEX CYBER OPERATOR
    const result3000 = evaluateOperatorGamification({
      machines: Array.from({ length: 30 }, (_, i) => ({
        id: `box-${i}`,
        name: `Box ${i}`,
        ip: `10.10.10.${i + 1}`,
        difficulty: 'Insane',
        status: 'root',
        platform: 'HTB',
        os: 'Linux',
        tags: [],
        certifications: [],
        timeSpentSeconds: 100,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      })), // 30 * 100 XP = 3000 XP
    });
    expect(result3000.currentRank.tier).toBe(6);
    expect(result3000.currentRank.title).toBe('APEX CYBER OPERATOR');
    expect(result3000.nextRank).toBeNull();
    expect(result3000.rankProgressPct).toBe(100);
  });

  it('evaluates trophy conditions accurately (First Blood, Port Scout, AD Initiate)', () => {
    const mockMachines: Machine[] = [
      {
        id: 'ad-box',
        name: 'EnterpriseDC',
        ip: '10.10.10.200',
        difficulty: 'Hard',
        status: 'root',
        tags: ['Active Directory', 'Kerberos'],
        openPorts: [88, 389],
        platform: 'HTB',
        os: 'Windows',
        certifications: [],
        timeSpentSeconds: 1000,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const result = evaluateOperatorGamification({
      machines: mockMachines,
    });

    const firstBlood = result.trophies.find((t) => t.definition.id === 'first_blood');
    const adInitiate = result.trophies.find((t) => t.definition.id === 'ad_initiate');
    const rootFrenzy = result.trophies.find((t) => t.definition.id === 'root_frenzy');

    expect(firstBlood?.unlocked).toBe(true);
    expect(adInitiate?.unlocked).toBe(true);
    expect(rootFrenzy?.unlocked).toBe(false);
    expect(rootFrenzy?.currentCount).toBe(1);
    expect(rootFrenzy?.targetCount).toBe(10);
  });

  it('synchronizes and persists trophy unlock timestamps non-destructively', () => {
    const historicalTime = '2026-01-01T00:00:00.000Z';
    const existingUnlocked: Record<string, string> = {
      first_blood: historicalTime,
    };

    const mockMachines: Machine[] = Array.from({ length: 10 }, (_, i) => ({
      id: `box-${i}`,
      name: `Box ${i}`,
      ip: `10.10.10.${i + 1}`,
      difficulty: 'Easy',
      status: 'root',
      platform: 'HTB',
      os: 'Linux',
      tags: [],
      certifications: [],
      timeSpentSeconds: 100,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }));

    const evaluated = evaluateOperatorGamification({
      machines: mockMachines,
      unlockedTrophies: existingUnlocked,
    });

    const { updatedTrophies, newlyUnlocked } = syncOperatorTrophies(existingUnlocked, evaluated.trophies);

    // Existing timestamp must remain unmodified
    expect(updatedTrophies.first_blood).toBe(historicalTime);

    // Newly unlocked 'root_frenzy' must receive an ISO timestamp and be reported in newlyUnlocked
    expect(updatedTrophies.root_frenzy).toBeDefined();
    expect(newlyUnlocked.some((t) => t.id === 'root_frenzy')).toBe(true);
    expect(newlyUnlocked.some((t) => t.id === 'first_blood')).toBe(false);
  });
});
