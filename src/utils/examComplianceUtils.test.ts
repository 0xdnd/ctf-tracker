import { describe, it, expect } from 'vitest';
import {
  calculateExamScore,
  validateFlagFormat,
  generateExamTargetsForTrack,
  getPassingStatus,
  generateExamReportMarkdown,
  createDefaultProof,
  isDomainControllerBox,
  isActiveDirectoryBox,
  ExamSessionState,
  EXAM_TRACK_CONFIGS,
} from './examComplianceUtils';
import { calculateOscpPoints, emptyOscpInput, OSCP_MAX_POINTS, OSCP_PASS_MARK } from './oscpPointsCalculator';

describe('examComplianceUtils', () => {
  describe('Flag Format Validator', () => {
    it('validates 32-character hexadecimal OffSec MD5 flag hash', () => {
      const res = validateFlagFormat('a3f789e02c1145b209d84e1bfa892104');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('offsec-md5');
      expect(res.label).toBe('OFFSEC (MD5)');
    });

    it('validates Hack The Box HTB{...} flag format', () => {
      const res = validateFlagFormat('HTB{m4st3r_0f_p1v0t1ng_2026}');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('htb');
      expect(res.label).toBe('HTB FLAG');
    });

    it('validates Zero-Point Security CRTO{...} flag format', () => {
      const res = validateFlagFormat('CRTO{c2_b34c0n_d0m41n_d0m1n4nc3}');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('crto');
      expect(res.label).toBe('CRTO FLAG');
    });

    it('validates TryHackMe THM{...} flag format', () => {
      const res = validateFlagFormat('THM{th1s_1s_4_v4l1d_thm_fl4g}');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('thm');
    });

    it('accepts generic custom strings of length >= 6', () => {
      const res = validateFlagFormat('custom_flag_123');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('custom');
    });

    it('rejects empty or whitespace-only strings', () => {
      const emptyRes = validateFlagFormat('');
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.format).toBe('invalid');

      const wsRes = validateFlagFormat('    ');
      expect(wsRes.valid).toBe(false);
      expect(wsRes.format).toBe('invalid');
    });

    it('rejects too short strings (< 6 chars)', () => {
      const shortRes = validateFlagFormat('abc');
      expect(shortRes.valid).toBe(false);
      expect(shortRes.format).toBe('invalid');
    });
  });

  describe('OSCP Scoring Matrix & Ruleset', () => {
    it('scores the Active Directory set per machine (10 / 10 / 20), not all-or-nothing', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      const adTargets = targets.filter((t) => t.type.startsWith('ad-'));
      expect(adTargets.length).toBe(3);

      // Partial AD compromise: only the foothold (machine 1) earns its 10 points
      const adFoothold = adTargets.find((t) => t.type === 'ad-foothold')!;
      adFoothold.userPwned = true;

      const partialScore = calculateExamScore('OSCP', targets);
      expect(partialScore.totalScore).toBe(10);
      expect(partialScore.adPoints).toBe(10);
      expect(partialScore.adSetCompromised).toBe(false);
      expect(partialScore.isPassing).toBe(false);

      // Lateral machine (machine 2) adds 10 more
      const adLateral = adTargets.find((t) => t.type === 'ad-lateral')!;
      adLateral.userPwned = true;
      const partialScore2 = calculateExamScore('OSCP', targets);
      expect(partialScore2.totalScore).toBe(20);
      expect(partialScore2.adSetCompromised).toBe(false);

      // Domain controller (machine 3) adds 20: full chain
      const adDc = adTargets.find((t) => t.type === 'ad-dc')!;
      adDc.rootPwned = true;

      const fullAdScore = calculateExamScore('OSCP', targets);
      expect(fullAdScore.totalScore).toBe(40);
      expect(fullAdScore.adPoints).toBe(40);
      expect(fullAdScore.adSetCompromised).toBe(true);
      expect(fullAdScore.isPassing).toBe(false); // 40 < 70
    });

    it('calculates standalone box points independently (10 user, 10 root)', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      const standalones = targets.filter((t) => !t.type.startsWith('ad-'));
      expect(standalones.length).toBe(3);

      // Pwn standalone 1 user (10 pts)
      standalones[0].userPwned = true;
      expect(calculateExamScore('OSCP', targets).totalScore).toBe(10);

      // Pwn standalone 1 root (+10 pts = 20 pts)
      standalones[0].rootPwned = true;
      expect(calculateExamScore('OSCP', targets).totalScore).toBe(20);

      // Pwn standalone 2 root only (+10 pts = 30 pts)
      standalones[1].rootPwned = true;
      expect(calculateExamScore('OSCP', targets).totalScore).toBe(30);
    });

    it('evaluates passing threshold of 70 points with valid combinations', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      // Full AD Set (40 pts)
      targets.filter((t) => t.type.startsWith('ad-')).forEach((b) => {
        if (b.userPoints > 0) b.userPwned = true;
        if (b.rootPoints > 0) b.rootPwned = true;
      });

      // Plus Standalone 1 full (20 pts) + Standalone 2 user (10 pts) = 70 pts
      const standalones = targets.filter((t) => !t.type.startsWith('ad-'));
      standalones[0].userPwned = true;
      standalones[0].rootPwned = true;
      standalones[1].userPwned = true;

      const score = calculateExamScore('OSCP', targets);
      expect(score.totalScore).toBe(70);
      expect(score.isPassing).toBe(true);
      expect(score.pointsNeeded).toBe(0);
    });

    it('passes with 10 AD points plus three full standalones (70)', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      targets.filter((t) => !t.type.startsWith('ad-')).forEach((b) => {
        b.userPwned = true;
        b.rootPwned = true;
      });
      expect(calculateExamScore('OSCP', targets).totalScore).toBe(60);
      expect(calculateExamScore('OSCP', targets).isPassing).toBe(false);

      targets.find((t) => t.type === 'ad-foothold')!.userPwned = true;
      const score = calculateExamScore('OSCP', targets);
      expect(score.totalScore).toBe(70);
      expect(score.adPoints).toBe(10);
      expect(score.isPassing).toBe(true);
      expect(score.pointsNeeded).toBe(0);
    });

    it('passes with the full AD set plus one and a half standalones (70)', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      targets.filter((t) => t.type.startsWith('ad-')).forEach((b) => {
        if (b.userPoints > 0) b.userPwned = true;
        if (b.rootPoints > 0) b.rootPwned = true;
      });
      const standalones = targets.filter((t) => !t.type.startsWith('ad-'));
      standalones[0].userPwned = true;
      standalones[0].rootPwned = true;
      standalones[1].userPwned = true;

      const score = calculateExamScore('OSCP', targets);
      expect(score.totalScore).toBe(70);
      expect(score.adPoints).toBe(40);
      expect(score.isPassing).toBe(true);
    });

    it('matches the OSCP points calculator for every AD and standalone combination', () => {
      // 3 AD machines x 3 standalones with 4 states each (none, local, proof, both)
      for (let adMask = 0; adMask < 8; adMask++) {
        for (let saMask = 0; saMask < 64; saMask++) {
          const targets = generateExamTargetsForTrack('OSCP', [], { seed: 'PARITY' });
          const ad = ['ad-foothold', 'ad-lateral', 'ad-dc'].map((type) => targets.find((t) => t.type === type)!);
          const standalones = targets.filter((t) => !t.type.startsWith('ad-'));
          const input = emptyOscpInput();
          ad.forEach((b, i) => {
            const on = Boolean(adMask & (1 << i));
            input.ad[i] = on;
            if (b.userPoints > 0) b.userPwned = on;
            if (b.rootPoints > 0) b.rootPwned = on;
          });
          standalones.forEach((b, i) => {
            b.userPwned = Boolean(saMask & (1 << (i * 2)));
            b.rootPwned = Boolean(saMask & (1 << (i * 2 + 1)));
            input.standalones[i] = { local: b.userPwned, proof: b.rootPwned };
          });
          const sim = calculateExamScore('OSCP', targets);
          const calc = calculateOscpPoints(input, 'fixed');
          expect(sim.totalScore).toBe(calc.total);
          expect(sim.adPoints).toBe(calc.adPoints);
          expect(sim.isPassing).toBe(calc.passed);
        }
      }
    });

    it('takes the OSCP pass mark, maximum and 23h45m duration from the calculator constants', () => {
      expect(EXAM_TRACK_CONFIGS.OSCP.passThreshold).toBe(OSCP_PASS_MARK);
      expect(EXAM_TRACK_CONFIGS.OSCP.maxScore).toBe(OSCP_MAX_POINTS);
      expect(EXAM_TRACK_CONFIGS.OSCP.durationSeconds).toBe(23 * 3600 + 45 * 60);
    });
  });

  describe('CPTS Scoring Matrix & Ruleset', () => {
    it('generates 14 flag objectives across enterprise network totaling 100 points', () => {
      const targets = generateExamTargetsForTrack('CPTS');
      expect(targets.length).toBe(7);

      let totalFlagPoints = 0;
      let totalFlagsCount = 0;
      targets.forEach((t) => {
        if (t.userPoints > 0) {
          totalFlagPoints += t.userPoints;
          totalFlagsCount++;
        }
        if (t.rootPoints > 0) {
          totalFlagPoints += t.rootPoints;
          totalFlagsCount++;
        }
      });

      expect(totalFlagsCount).toBe(14);
      expect(totalFlagPoints).toBe(100);
    });

    it('enforces 85-point passing threshold for CPTS', () => {
      const targets = generateExamTargetsForTrack('CPTS');
      const configScore = calculateExamScore('CPTS', targets);
      expect(configScore.passThreshold).toBe(85);
      expect(configScore.maxScore).toBe(100);
      expect(configScore.isPassing).toBe(false);

      // Pwn 12 of 14 flags (6 boxes fully = 12 * 7 = 84 pts)
      for (let i = 0; i < 6; i++) {
        targets[i].userPwned = true;
        targets[i].rootPwned = true;
      }
      expect(calculateExamScore('CPTS', targets).totalScore).toBe(84);
      expect(calculateExamScore('CPTS', targets).isPassing).toBe(false);

      // Pwn user flag on DC01 (+8 pts = 92 pts)
      targets[6].userPwned = true;
      const passedScore = calculateExamScore('CPTS', targets);
      expect(passedScore.totalScore).toBe(92);
      expect(passedScore.isPassing).toBe(true);
    });
  });

  describe('CRTO Scoring Matrix & Ruleset', () => {
    it('generates 8 Red Team C2 objectives @ 12.5 pts each (100 pts total)', () => {
      const targets = generateExamTargetsForTrack('CRTO');
      expect(targets.length).toBe(8);

      let totalPoints = 0;
      targets.forEach((t) => {
        expect(t.rootPoints).toBe(12.5);
        totalPoints += t.rootPoints;
      });
      expect(totalPoints).toBe(100);
    });

    it('enforces 75-point passing threshold (6 of 8 objectives)', () => {
      const targets = generateExamTargetsForTrack('CRTO');

      // Pwn 5 objectives = 62.5 pts -> Fail
      for (let i = 0; i < 5; i++) {
        targets[i].rootPwned = true;
      }
      const score5 = calculateExamScore('CRTO', targets);
      expect(score5.totalScore).toBe(62.5);
      expect(score5.isPassing).toBe(false);

      // Pwn 6th objective = 75 pts -> Pass
      targets[5].rootPwned = true;
      const score6 = calculateExamScore('CRTO', targets);
      expect(score6.totalScore).toBe(75);
      expect(score6.isPassing).toBe(true);
    });
  });

  describe('Compliance Verification Audit', () => {
    it('identifies missing whoami, ipconfig, flag text, and screenshot on claimed points', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      const box = targets[3]; // Standalone
      box.userPwned = true;
      box.userProof = createDefaultProof(); // empty

      const audit = calculateExamScore('OSCP', targets);
      expect(audit.isCompliant).toBe(false);
      expect(audit.complianceIssues.length).toBeGreaterThan(0);
      expect(audit.complianceIssues.some((i) => i.includes('whoami'))).toBe(true);
      expect(audit.complianceIssues.some((i) => i.includes('ipconfig'))).toBe(true);
      expect(audit.complianceIssues.some((i) => i.includes('flag text'))).toBe(true);
      expect(audit.complianceIssues.some((i) => i.includes('screenshot'))).toBe(true);
    });

    it('marks target compliant when screenshot array is populated with valid evidence', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      const box = targets[3];
      box.userPwned = true;
      box.userProof = {
        flagText: 'a3f789e02c1145b209d84e1bfa892104',
        whoamiOutput: 'www-data',
        ipconfigOutput: 'eth0: 192.168.1.101',
        screenshotTaken: false,
        screenshots: [
          {
            id: 'sc-1',
            dataUrl: 'data:image/png;base64,mock',
            caption: 'Initial access shell',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const audit = calculateExamScore('OSCP', targets);
      expect(audit.complianceIssues.length).toBe(0);
      expect(audit.isCompliant).toBe(true);
    });
  });

  describe('Passing Status Indicator', () => {
    it('returns "Passing" when score >= passThreshold and no missing AD chain', () => {
      expect(getPassingStatus(70, 70, 36000, false, false)).toBe('Passing');
      expect(getPassingStatus(85, 70, 100, false, false)).toBe('Passing');
    });

    it('returns "Critical" when score < passThreshold and remaining time <= 2 hours (7200s)', () => {
      expect(getPassingStatus(50, 70, 7200, false)).toBe('Critical');
      expect(getPassingStatus(60, 70, 1800, false)).toBe('Critical');
      expect(getPassingStatus(40, 70, 0, true)).toBe('Critical');
    });

    it('returns "In Progress" when score < passThreshold but time remaining > 2 hours', () => {
      expect(getPassingStatus(40, 70, 50000, false)).toBe('In Progress');
      expect(getPassingStatus(0, 70, 86400, false)).toBe('In Progress');
    });
  });

  describe('Report Markdown Generator', () => {
    it('generates a submission-ready Markdown report with scoring matrix and target breakdowns', () => {
      const targets = generateExamTargetsForTrack('OSCP');
      const session: ExamSessionState = {
        track: 'OSCP',
        candidateName: 'Daniel Dayan',
        candidateCallsign: '0xdnd',
        osid: 'OS-94821',
        examStartedAt: Date.now() - 3600000,
        examDurationSeconds: 86400,
        examExpiresAt: Date.now() + 82800000,
        isTimerRunning: true,
        timerPausedRemainingSeconds: null,
        boxes: targets,
        scratchNotes: 'Sample candidate notes.',
      };

      const markdown = generateExamReportMarkdown(session);
      expect(markdown).toContain('OFFSEC OSCP (PEN-200)');
      expect(markdown).toContain('Daniel Dayan');
      expect(markdown).toContain('OS-94821');
      expect(markdown).toContain('Executive Summary & Scoring Matrix');
      expect(markdown).toContain('Candidate Operational Scratchpad & Notes');
      expect(markdown).toContain('Sample candidate notes.');
    });
  });

  describe('Active Directory Box Identification Helpers', () => {
    it('correctly classifies domain controllers with explicit adRole: "dc"', () => {
      expect(isDomainControllerBox({ adRole: 'dc', name: 'corp-dc01', type: 'standalone' })).toBe(true);
      expect(isDomainControllerBox({ adRole: 'foothold', name: 'corp-dc01' })).toBe(false);
      expect(isDomainControllerBox({ adRole: 'lateral', name: 'corp-dc01' })).toBe(false);
    });

    it('falls back to type "ad-dc" or name matching when adRole is undefined', () => {
      expect(isDomainControllerBox({ type: 'ad-dc', name: 'EnterpriseDC' })).toBe(true);
      expect(isDomainControllerBox({ type: 'ad-target', name: 'ad-dc' })).toBe(true);
      // Words with "dc" embedded in standalone targets must NOT be falsely identified as DC
      expect(isDomainControllerBox({ type: 'standalone', name: 'broadcast' })).toBe(false);
      expect(isDomainControllerBox({ type: 'standalone', name: 'production' })).toBe(false);
    });

    it('identifies Active Directory boxes via adRole or ad- prefixed type', () => {
      expect(isActiveDirectoryBox({ adRole: 'foothold' })).toBe(true);
      expect(isActiveDirectoryBox({ adRole: 'lateral' })).toBe(true);
      expect(isActiveDirectoryBox({ adRole: 'dc' })).toBe(true);
      expect(isActiveDirectoryBox({ type: 'ad-foothold' })).toBe(true);
      expect(isActiveDirectoryBox({ type: 'ad-lateral' })).toBe(true);
      expect(isActiveDirectoryBox({ type: 'ad-dc' })).toBe(true);
      expect(isActiveDirectoryBox({ type: 'standalone', name: 'Standalone-1' })).toBe(false);
    });
  });
});

