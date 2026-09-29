/**
 * examCompliance.test.ts
 * Opaque-box, requirement-driven Vitest test suite for Certification Exam Simulator compliance rulesets.
 * Verifies R2 (Rulesets & Scoring Matrix) & R3 (Evidence & Flag Validator) from ORIGINAL_REQUEST.md.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateExamScore,
  validateFlagFormat,
  generateExamTargetsForTrack,
  ExamTrack,
  ExamBox,
  ExamTargetProof,
} from '../../utils/examComplianceUtils';

// Helper to create an empty proof object
function createProof(overrides: Partial<ExamTargetProof> = {}): ExamTargetProof {
  return {
    flagText: 'c0ffee1234567890abcdef1234567890',
    whoamiOutput: 'root',
    ipconfigOutput: 'eth0: 192.168.1.100',
    screenshotTaken: true,
    toolsUsed: 'nmap, gobuster, linpeas',
    reproductionSteps: 'Exploited service on port 80, escalated via sudo',
    ...overrides,
  };
}

// Helper to create an ExamBox
function createBox(overrides: Partial<ExamBox> = {}): ExamBox {
  return {
    id: 'box-1',
    name: 'TEST-BOX',
    ip: '192.168.1.101',
    os: 'Linux',
    difficulty: 'Medium',
    type: 'standalone-1',
    label: 'Standalone 01 (Linux)',
    userPoints: 10,
    rootPoints: 10,
    userPwned: false,
    rootPwned: false,
    userProof: createProof({ flagText: '' }),
    rootProof: createProof({ flagText: '' }),
    ...overrides,
  };
}

describe('Certification Exam Compliance & Scoring Engine (R2 & R3)', () => {
  // =========================================================================
  // 1. OffSec OSCP Ruleset (24-Hour, 70 pts pass threshold, 3-box AD set 40 pts all-or-nothing)
  // =========================================================================
  describe('OSCP Ruleset & Scoring Matrix', () => {
    const buildOscpBoxes = (adPwnState: [boolean, boolean, boolean], standalonePwnState: [boolean, boolean][]): ExamBox[] => {
      // AD Set: Foothold (user 10, root 0), Lateral (user 10, root 0), DC (user 0, root 20) -> Total 40 pts
      const adFoothold = createBox({
        id: 'oscp-ad-1',
        name: 'CORP-WEB01',
        type: 'ad-foothold',
        userPoints: 10,
        rootPoints: 0,
        userPwned: adPwnState[0],
        userProof: createProof(),
      });
      const adLateral = createBox({
        id: 'oscp-ad-2',
        name: 'CORP-SRV01',
        type: 'ad-lateral',
        userPoints: 10,
        rootPoints: 0,
        userPwned: adPwnState[1],
        userProof: createProof(),
      });
      const adDc = createBox({
        id: 'oscp-ad-3',
        name: 'CORP-DC01',
        type: 'ad-dc',
        userPoints: 0,
        rootPoints: 20,
        rootPwned: adPwnState[2],
        rootProof: createProof(),
      });

      // 3 Standalones: 20 pts each (10 user, 10 root)
      const standalones = standalonePwnState.map((st, idx) =>
        createBox({
          id: `oscp-st-${idx + 1}`,
          name: `STANDALONE-0${idx + 1}`,
          type: `standalone-${idx + 1}`,
          userPoints: 10,
          rootPoints: 10,
          userPwned: st[0],
          rootPwned: st[1],
          userProof: createProof(),
          rootProof: createProof(),
        })
      );

      return [adFoothold, adLateral, adDc, ...standalones];
    };

    it('OSCP-01: Full AD compromise awards 40 points towards total', () => {
      const boxes = buildOscpBoxes([true, true, true], [[false, false], [false, false], [false, false]]);
      const result = calculateExamScore('OSCP', boxes);

      expect(result.totalScore).toBe(40);
      expect(result.passThreshold).toBe(70);
      expect(result.isPassing).toBe(false);
      expect(result.pointsNeeded).toBe(30);
    });

    it('OSCP-02: Partial AD compromise awards ZERO points for the AD set (All-Or-Nothing Invariant)', () => {
      // Foothold and Lateral pwned, but DC not rooted
      const boxesWithoutDc = buildOscpBoxes([true, true, false], [[false, false], [false, false], [false, false]]);
      const resultWithoutDc = calculateExamScore('OSCP', boxesWithoutDc);

      expect(resultWithoutDc.totalScore).toBe(0);
      expect(resultWithoutDc.isPassing).toBe(false);
      expect(resultWithoutDc.pointsNeeded).toBe(70);

      // DC rooted but foothold missing
      const boxesWithoutFoothold = buildOscpBoxes([false, true, true], [[false, false], [false, false], [false, false]]);
      const resultWithoutFoothold = calculateExamScore('OSCP', boxesWithoutFoothold);

      expect(resultWithoutFoothold.totalScore).toBe(0);

      // DC rooted but lateral missing
      const boxesWithoutLateral = buildOscpBoxes([true, false, true], [[false, false], [false, false], [false, false]]);
      const resultWithoutLateral = calculateExamScore('OSCP', boxesWithoutLateral);

      expect(resultWithoutLateral.totalScore).toBe(0);
    });

    it('OSCP-03: Standalone boxes score independently (10 user, 10 root)', () => {
      // 0 AD boxes, but Standalone 1 has user pwned (10 pts)
      const boxes1 = buildOscpBoxes([false, false, false], [[true, false], [false, false], [false, false]]);
      expect(calculateExamScore('OSCP', boxes1).totalScore).toBe(10);

      // Standalone 1 full pwn (20 pts) + Standalone 2 user pwn (10 pts) = 30 pts
      const boxes2 = buildOscpBoxes([false, false, false], [[true, true], [true, false], [false, false]]);
      expect(calculateExamScore('OSCP', boxes2).totalScore).toBe(30);

      // All 3 standalones fully rooted (60 pts) without AD set
      const boxesAllStandalones = buildOscpBoxes([false, false, false], [[true, true], [true, true], [true, true]]);
      const resultAllStandalones = calculateExamScore('OSCP', boxesAllStandalones);
      expect(resultAllStandalones.totalScore).toBe(60);
      expect(resultAllStandalones.isPassing).toBe(false); // 60 < 70 threshold
      expect(resultAllStandalones.pointsNeeded).toBe(10);
    });

    it('OSCP-04: Reaches passing threshold (70 pts) with AD set + 1 standalone root + 1 standalone user', () => {
      // AD Set (40) + Standalone 1 (20) + Standalone 2 user (10) = 70 PTS
      const boxes = buildOscpBoxes([true, true, true], [[true, true], [true, false], [false, false]]);
      const result = calculateExamScore('OSCP', boxes);

      expect(result.totalScore).toBe(70);
      expect(result.passThreshold).toBe(70);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });

    it('OSCP-05: Reaches passing threshold (70 pts) with AD set + 3 standalone user flags', () => {
      // AD Set (40) + Standalone 1 user (10) + Standalone 2 user (10) + Standalone 3 user (10) = 70 PTS
      const boxes = buildOscpBoxes([true, true, true], [[true, false], [true, false], [true, false]]);
      const result = calculateExamScore('OSCP', boxes);

      expect(result.totalScore).toBe(70);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });

    it('OSCP-06: Partial AD + all standalones gives 60 pts and FAILS (AD contributes 0)', () => {
      // AD Foothold + Lateral (20 nominal pts) + 3 Standalones fully pwned (60 pts)
      // Since DC is NOT rooted, AD set awards 0, total must be exactly 60!
      const boxes = buildOscpBoxes([true, true, false], [[true, true], [true, true], [true, true]]);
      const result = calculateExamScore('OSCP', boxes);

      expect(result.totalScore).toBe(60);
      expect(result.isPassing).toBe(false);
      expect(result.pointsNeeded).toBe(10);
    });

    it('OSCP-07: Flawless 100-point compromise marks isPassing: true with 0 pointsNeeded', () => {
      const boxes = buildOscpBoxes([true, true, true], [[true, true], [true, true], [true, true]]);
      const result = calculateExamScore('OSCP', boxes);

      expect(result.totalScore).toBe(100);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });
  });

  // =========================================================================
  // 2. Hack The Box CPTS Ruleset (240-Hour / 10-Day, 85 pts pass threshold, 14 flag objectives)
  // =========================================================================
  describe('HTB CPTS Ruleset & Scoring Matrix', () => {
    // Generate 14 flag objectives across DMZ, Internal, AD, and Vault
    const buildCptsObjectives = (pwnedCount: number): ExamBox[] => {
      const objectives: ExamBox[] = [];
      const totalObjectives = 14;

      // Point values summing to 100: e.g. 10 objectives @ 7 pts, 4 objectives @ 7.5 pts, or custom breakdown
      // For simplicity in testing: 12 objectives @ 7 pts (84) + 2 objectives @ 8 pts (16) = 100 pts
      for (let i = 0; i < totalObjectives; i++) {
        const pts = i < 12 ? 7 : 8;
        objectives.push(
          createBox({
            id: `cpts-obj-${i + 1}`,
            name: `CPTS-TARGET-0${i + 1}`,
            type: 'cpts-objective',
            label: `Objective ${i + 1}: Flag Capture`,
            userPoints: pts,
            rootPoints: 0,
            userPwned: i < pwnedCount,
            userProof: createProof(),
          })
        );
      }
      return objectives;
    };

    it('CPTS-01: Passing threshold is strictly 85 points', () => {
      const boxes = buildCptsObjectives(0);
      const result = calculateExamScore('CPTS', boxes);

      expect(result.passThreshold).toBe(85);
      expect(result.maxScore).toBe(100);
      expect(result.isPassing).toBe(false);
    });

    it('CPTS-02: 84 points does NOT pass, pointsNeeded is 1', () => {
      // 12 objectives @ 7 pts = 84 points
      const boxes = buildCptsObjectives(12);
      const result = calculateExamScore('CPTS', boxes);

      expect(result.totalScore).toBe(84);
      expect(result.isPassing).toBe(false);
      expect(result.pointsNeeded).toBe(1);
    });

    it('CPTS-03: 92 points (13 objectives) passes with pointsNeeded = 0', () => {
      // 12 objectives @ 7 pts + 1 objective @ 8 pts = 92 points
      const boxes = buildCptsObjectives(13);
      const result = calculateExamScore('CPTS', boxes);

      expect(result.totalScore).toBe(92);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });

    it('CPTS-04: Full 14-objective compromise achieves 100 points', () => {
      const boxes = buildCptsObjectives(14);
      const result = calculateExamScore('CPTS', boxes);

      expect(result.totalScore).toBe(100);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });
  });

  // =========================================================================
  // 3. Zero-Point Security CRTO Ruleset (48-Hour, 75 pts pass threshold, 8 objectives @ 12.5 pts)
  // =========================================================================
  describe('CRTO Ruleset & Scoring Matrix', () => {
    const buildCrtoObjectives = (pwnedCount: number): ExamBox[] => {
      const objectives: ExamBox[] = [];
      for (let i = 0; i < 8; i++) {
        objectives.push(
          createBox({
            id: `crto-obj-${i + 1}`,
            name: `CRTO-OBJ-0${i + 1}`,
            type: 'crto-objective',
            label: `Red Team Objective ${i + 1}: C2 OpSec Checkpoint`,
            userPoints: 12.5,
            rootPoints: 0,
            userPwned: i < pwnedCount,
            userProof: createProof({ toolsUsed: 'Cobalt Strike, Chisel, Rubeus' }),
          })
        );
      }
      return objectives;
    };

    it('CRTO-01: Passing threshold must be 75 points (6 of 8 objectives @ 12.5 pts)', () => {
      const boxes = buildCrtoObjectives(6); // 6 * 12.5 = 75 pts
      // Note: Passing 'CRTO' track to calculateExamScore
      const result = calculateExamScore('CRTO' as any, boxes);

      expect(result.totalScore).toBe(75);
      // In accordance with R2 / ORIGINAL_REQUEST.md, CRTO threshold is 75 pts
      expect(result.passThreshold).toBe(75);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });

    it('CRTO-02: 5 objectives (62.5 pts) fails passing threshold with 12.5 points needed', () => {
      const boxes = buildCrtoObjectives(5); // 5 * 12.5 = 62.5 pts
      const result = calculateExamScore('CRTO' as any, boxes);

      expect(result.totalScore).toBe(62.5);
      expect(result.passThreshold).toBe(75);
      expect(result.isPassing).toBe(false);
      expect(result.pointsNeeded).toBe(12.5);
    });

    it('CRTO-03: Full 8 objectives achieves 100 points', () => {
      const boxes = buildCrtoObjectives(8);
      const result = calculateExamScore('CRTO' as any, boxes);

      expect(result.totalScore).toBe(100);
      expect(result.isPassing).toBe(true);
      expect(result.pointsNeeded).toBe(0);
    });
  });

  // =========================================================================
  // 4. Regex Flag Validation & Adversarial Inputs (R3)
  // =========================================================================
  describe('Flag Format Validator (validateFlagFormat)', () => {
    it('FLAG-01: Accepts valid 32-character lowercase hexadecimal OffSec MD5 hash', () => {
      const res = validateFlagFormat('7a8f9c102b3345d6e7f80123456789ab');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('offsec-md5');
      expect(res.label).toContain('OFFSEC');
    });

    it('FLAG-02: Accepts valid 32-character uppercase hexadecimal OffSec MD5 hash', () => {
      const res = validateFlagFormat('C0FFEE1234567890ABCDEF1234567890');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('offsec-md5');
    });

    it('FLAG-03: Automatically trims leading and trailing whitespace from flag strings', () => {
      const resLeading = validateFlagFormat('   c0ffee1234567890abcdef1234567890');
      expect(resLeading.valid).toBe(true);
      expect(resLeading.format).toBe('offsec-md5');

      const resTrailing = validateFlagFormat('c0ffee1234567890abcdef1234567890   \n\t');
      expect(resTrailing.valid).toBe(true);
      expect(resTrailing.format).toBe('offsec-md5');
    });

    it('FLAG-04: Rejects 31 or 33 character strings as OffSec MD5 format', () => {
      // 31 characters
      const res31 = validateFlagFormat('c0ffee1234567890abcdef123456789');
      expect(res31.format).not.toBe('offsec-md5');

      // 33 characters
      const res33 = validateFlagFormat('c0ffee1234567890abcdef12345678901');
      expect(res33.format).not.toBe('offsec-md5');
    });

    it('FLAG-05: Rejects non-hex characters in 32-character hash from OffSec MD5 format', () => {
      const nonHex = validateFlagFormat('z0ffee1234567890abcdef1234567890');
      expect(nonHex.format).not.toBe('offsec-md5');
    });

    it('FLAG-06: Accepts valid Hack The Box flag format HTB{...}', () => {
      const res = validateFlagFormat('HTB{m4st3r_0f_p1v0t1ng_2026}');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('htb');
      expect(res.label).toContain('HTB');

      // Case insensitivity
      const resLower = validateFlagFormat('htb{cpts_3nt3rpr1s3_fl4g!}');
      expect(resLower.valid).toBe(true);
      expect(resLower.format).toBe('htb');
    });

    it('FLAG-07: Accepts valid TryHackMe flag format THM{...}', () => {
      const res = validateFlagFormat('THM{3nt3r_th3_m4tr1x_fl4g}');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('thm');
    });

    it('FLAG-08: Rejects empty strings, pure whitespace, and short strings', () => {
      expect(validateFlagFormat('').valid).toBe(false);
      expect(validateFlagFormat('   ').valid).toBe(false);
      expect(validateFlagFormat('\t\n\r').valid).toBe(false);
      expect(validateFlagFormat('abc').valid).toBe(false);
      expect(validateFlagFormat('12345').valid).toBe(false);
    });

    it('FLAG-09: Accepts custom strings with length >= 6', () => {
      const res = validateFlagFormat('CUSTOM_SECRET_FLAG_VALUE');
      expect(res.valid).toBe(true);
      expect(res.format).toBe('custom');
    });
  });

  // =========================================================================
  // 5. Duplicate Flag Submission Prevention Invariant
  // =========================================================================
  describe('Duplicate Flag Submission Prevention', () => {
    function checkDuplicateFlag(newFlag: string, capturedBoxes: ExamBox[]): boolean {
      const normalizedNew = (newFlag || '').trim().toLowerCase();
      if (!normalizedNew) return false;

      for (const box of capturedBoxes) {
        if (box.userPwned && box.userProof?.flagText) {
          if (box.userProof.flagText.trim().toLowerCase() === normalizedNew) {
            return true;
          }
        }
        if (box.rootPwned && box.rootProof?.flagText) {
          if (box.rootProof.flagText.trim().toLowerCase() === normalizedNew) {
            return true;
          }
        }
      }
      return false;
    }

    it('DUP-01: Detects duplicate flag when same flag text was already submitted', () => {
      const existingFlag = '7a8f9c102b3345d6e7f80123456789ab';
      const boxes: ExamBox[] = [
        createBox({
          id: 'box-1',
          userPwned: true,
          userProof: createProof({ flagText: existingFlag }),
        }),
      ];

      // Exact match duplicate
      expect(checkDuplicateFlag(existingFlag, boxes)).toBe(true);

      // Duplicate with leading/trailing whitespace
      expect(checkDuplicateFlag(`   ${existingFlag}   `, boxes)).toBe(true);

      // Duplicate with uppercase casing
      expect(checkDuplicateFlag(existingFlag.toUpperCase(), boxes)).toBe(true);

      // Distinct flag
      expect(checkDuplicateFlag('c0ffee1234567890abcdef1234567890', boxes)).toBe(false);
    });
  });

  // =========================================================================
  // 6. Evidence Checklist Audit (whoami, ipconfig, screenshot)
  // =========================================================================
  describe('Evidence Checklist Compliance Audit', () => {
    it('AUDIT-01: Reports compliance issue when whoami output is missing for pwned box', () => {
      const boxes = [
        createBox({
          userPwned: true,
          userPoints: 10,
          userProof: createProof({ whoamiOutput: '' }), // Missing whoami
        }),
      ];

      const result = calculateExamScore('OSCP', boxes);
      expect(result.isCompliant).toBe(false);
      expect(result.complianceIssues.some((issue) => issue.includes('whoami'))).toBe(true);
    });

    it('AUDIT-02: Reports compliance issue when ipconfig/ifconfig output is missing', () => {
      const boxes = [
        createBox({
          rootPwned: true,
          rootPoints: 10,
          rootProof: createProof({ ipconfigOutput: '   ' }), // Empty whitespace
        }),
      ];

      const result = calculateExamScore('OSCP', boxes);
      expect(result.isCompliant).toBe(false);
      expect(result.complianceIssues.some((issue) => issue.includes('ipconfig'))).toBe(true);
    });

    it('AUDIT-03: Reports compliance issue when screenshot is not confirmed', () => {
      const boxes = [
        createBox({
          userPwned: true,
          userPoints: 10,
          userProof: createProof({ screenshotTaken: false }),
        }),
      ];

      const result = calculateExamScore('OSCP', boxes);
      expect(result.isCompliant).toBe(false);
      expect(result.complianceIssues.some((issue) => issue.includes('screenshot'))).toBe(true);
    });

    it('AUDIT-04: Returns isCompliant: true when all proofs are present and verified', () => {
      const boxes = [
        createBox({
          userPwned: true,
          userPoints: 10,
          userProof: createProof({
            flagText: 'c0ffee1234567890abcdef1234567890',
            whoamiOutput: 'www-data',
            ipconfigOutput: '192.168.1.101',
            screenshotTaken: true,
          }),
          rootPwned: true,
          rootPoints: 10,
          rootProof: createProof({
            flagText: 'beef1234567890abcdef123456789012',
            whoamiOutput: 'root',
            ipconfigOutput: '192.168.1.101',
            screenshotTaken: true,
          }),
        }),
      ];

      const result = calculateExamScore('OSCP', boxes);
      expect(result.isCompliant).toBe(true);
      expect(result.complianceIssues.length).toBe(0);
    });
  });
});
