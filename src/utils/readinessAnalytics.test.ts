import { describe, it, expect } from 'vitest';
import {
  classifyMachineCompetencies,
  calculateSpacedRepetition,
  computeReadinessReport,
  UserMachineEngagement,
} from './readinessAnalytics';
import { Machine } from '../types';

describe('readinessAnalytics Engine', () => {
  const dummyMachineAD: Machine = {
    id: 'htb-forest',
    name: 'Forest',
    ip: '10.10.10.161',
    os: 'Windows',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'completed',
    tags: ['Active-Directory', 'Kerberos', 'BloodHound', 'DCSync'],
    certifications: ['OSCP', 'CPTS'],
    timeSpentSeconds: 3600,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const dummyMachineWeb: Machine = {
    id: 'htb-sau',
    name: 'Sau',
    ip: '10.10.11.224',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'completed',
    tags: ['SSRF', 'Maltrail', 'CVE-2023-27163', 'Linux-PrivEsc', 'Sudo'],
    certifications: ['OSCP'],
    timeSpentSeconds: 3000,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  describe('Competency Classification', () => {
    it('classifies Active Directory boxes into Active Directory vector', () => {
      const axes = classifyMachineCompetencies(dummyMachineAD);
      expect(axes).toContain('Active Directory');
    });

    it('classifies SSRF / Web boxes with Sudo tags into Web Exploitation and Linux PrivEsc vectors', () => {
      const axes = classifyMachineCompetencies(dummyMachineWeb);
      expect(axes).toContain('Web Exploitation');
      expect(axes).toContain('Linux PrivEsc');
    });
  });

  describe('SM-2 Spaced Repetition Decay Calculation', () => {
    it('retains higher retention score for solo solve compared to walkthrough solve over 14 days', () => {
      const now = new Date('2026-10-15T00:00:00Z');
      const solvedAt = '2026-10-01T00:00:00Z'; // 14 days ago

      const soloEng: UserMachineEngagement = {
        machineId: 'htb-forest',
        solvedAt,
        independence: 'solo',
      };

      const walkthroughEng: UserMachineEngagement = {
        machineId: 'htb-forest',
        solvedAt,
        independence: 'walkthrough',
      };

      const soloRep = calculateSpacedRepetition(soloEng, now);
      const walkthroughRep = calculateSpacedRepetition(walkthroughEng, now);

      expect(soloRep.daysSinceSolve).toBe(14);
      expect(walkthroughRep.daysSinceSolve).toBe(14);
      expect(soloRep.retentionScore).toBeGreaterThan(walkthroughRep.retentionScore);
      expect(walkthroughRep.isDueForReview).toBe(true);
    });
  });

  describe('Master Readiness Overview & Weakness Recommender', () => {
    it('identifies weakest axis and recommends matching catalog targets', () => {
      const catalog = [
        dummyMachineWeb,
        {
          id: 'htb-sauna',
          name: 'Sauna',
          ip: '10.10.10.175',
          os: 'Windows' as const,
          platform: 'HTB' as const,
          difficulty: 'Easy' as const,
          status: 'backlog' as const,
          tags: ['Active-Directory', 'BloodHound', 'AS-REP'],
          certifications: ['OSCP' as const],
          timeSpentSeconds: 0,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      // Engagement with ONLY Web solves, zero AD solves
      const engagements: UserMachineEngagement[] = [
        {
          machineId: 'htb-sau',
          solvedAt: '2026-10-10T00:00:00Z',
          independence: 'solo',
        },
      ];

      const report = computeReadinessReport(catalog, engagements, new Date('2026-10-12T00:00:00Z'));

      expect(report.competencies['Web Exploitation'].solvedCount).toBe(1);
      expect(report.competencies['Active Directory'].solvedCount).toBe(0);
      expect(report.weakestAxis).toBe('Active Directory');

      // The recommender should suggest the unsolved AD machine 'htb-sauna'
      expect(report.recommendedCatalogTargets.length).toBeGreaterThan(0);
      expect(report.recommendedCatalogTargets[0].id).toBe('htb-sauna');
    });
  });
});
