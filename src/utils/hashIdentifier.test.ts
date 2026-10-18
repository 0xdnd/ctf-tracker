import { describe, it, expect } from 'vitest';
import {
  identifyHash,
  isNtlmHash,
  extractNtlmFromSamDump,
  generateHashcatCommand,
  generateJohnCommand,
  decodeJwt,
} from './hashIdentifier';

describe('hashIdentifier Engine', () => {
  describe('isNtlmHash & extractNtlmFromSamDump', () => {
    it('accurately validates 32-char hex NTLM hashes', () => {
      expect(isNtlmHash('31d6cfe0d16ae931b73c59d7e0c089c0')).toBe(true);
      expect(isNtlmHash('8846F7EAEE8FB117AD06BDD830B7586C')).toBe(true);
      expect(isNtlmHash('not-a-hash')).toBe(false);
      expect(isNtlmHash('31d6cfe0d16ae931b73c59d7e0c089c')).toBe(false); // 31 chars
      expect(isNtlmHash('31d6cfe0d16ae931b73c59d7e0c089c00')).toBe(false); // 33 chars
    });

    it('extracts NT hash from SAM / NTDS dump lines', () => {
      const samLine = 'Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::';
      expect(extractNtlmFromSamDump(samLine)).toBe('31d6cfe0d16ae931b73c59d7e0c089c0');

      const invalidLine = 'admin:500:invalid:::';
      expect(extractNtlmFromSamDump(invalidLine)).toBeNull();
    });
  });

  describe('Windows & Active Directory Hashes', () => {
    it('identifies SAM dump and extracts NTLM with mode 1000', () => {
      const samLine = 'Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::';
      const result = identifyHash(samLine);
      expect(result.primaryMatch).not.toBeNull();
      expect(result.primaryMatch?.hashcatMode).toBe(1000);
      expect(result.primaryMatch?.johnFormat).toBe('nt');
      expect(result.primaryMatch?.name).toContain('SAM / NTDS.dit');
    });

    it('identifies Kerberos 5 TGS-REP (Kerberoasting) with mode 13100', () => {
      const tgs = '$krb5tgs$23$*user$realm$test/spn*$1234567890abcdef1234567890abcdef$1234567890abcdef';
      const result = identifyHash(tgs);
      expect(result.primaryMatch?.hashcatMode).toBe(13100);
      expect(result.primaryMatch?.johnFormat).toBe('krb5tgs');
    });

    it('identifies Kerberos 5 AS-REP Roasting with mode 18200', () => {
      const asrep = '$krb5asrep$23$user@DOMAIN:1234567890abcdef1234567890abcdef$1234567890abcdef';
      const result = identifyHash(asrep);
      expect(result.primaryMatch?.hashcatMode).toBe(18200);
      expect(result.primaryMatch?.johnFormat).toBe('krb5asrep');
    });

    it('identifies NetNTLMv2 with mode 5600', () => {
      const netntlmv2 = 'admin::CORP:1122334455667788:6C66567890ABCDEF1234567890ABCDEF:0101000000000000';
      const result = identifyHash(netntlmv2);
      expect(result.primaryMatch?.hashcatMode).toBe(5600);
      expect(result.primaryMatch?.johnFormat).toBe('netntlmv2');
    });

    it('identifies DCC2 / MSCache v2 with mode 2100', () => {
      const dcc2 = '$DCC2$10240#administrator#1234567890abcdef1234567890abcdef';
      const result = identifyHash(dcc2);
      expect(result.primaryMatch?.hashcatMode).toBe(2100);
      expect(result.primaryMatch?.johnFormat).toBe('mscache2');
    });
  });

  describe('Linux & Web Hashes', () => {
    it('identifies bcrypt with mode 3200', () => {
      const bcrypt = '$2a$12$R9h/cIPz0gi.URNNXRkh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
      const result = identifyHash(bcrypt);
      expect(result.primaryMatch?.hashcatMode).toBe(3200);
      expect(result.primaryMatch?.johnFormat).toBe('bcrypt');
    });

    it('identifies sha512crypt with mode 1800', () => {
      const sha512 = '$6$rounds=5000$saltsalt$12345678901234567890123456789012345678901234567890123456789012345678901234567890123456';
      const result = identifyHash(sha512);
      expect(result.primaryMatch?.hashcatMode).toBe(1800);
      expect(result.primaryMatch?.johnFormat).toBe('sha512crypt');
    });

    it('identifies WordPress phpass with mode 400', () => {
      const wp = '$P$B123456789012345678901234567890';
      const result = identifyHash(wp);
      expect(result.primaryMatch?.hashcatMode).toBe(400);
      expect(result.primaryMatch?.johnFormat).toBe('phpass');
    });

    it('identifies Apache apr1 with mode 1600', () => {
      const apr1 = '$apr1$saltsalt$1234567890123456789012';
      const result = identifyHash(apr1);
      expect(result.primaryMatch?.hashcatMode).toBe(1600);
      expect(result.primaryMatch?.johnFormat).toBe('md5apr1');
    });
  });

  describe('Database Hashes', () => {
    it('identifies MySQL 4.1+ double SHA1 with mode 300', () => {
      const mysql = '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19';
      const result = identifyHash(mysql);
      expect(result.primaryMatch?.hashcatMode).toBe(300);
      expect(result.primaryMatch?.johnFormat).toBe('mysql-sha1');
    });

    it('identifies PostgreSQL md5 with mode 10', () => {
      const pg = 'md531d6cfe0d16ae931b73c59d7e0c089c0';
      const result = identifyHash(pg);
      expect(result.primaryMatch?.hashcatMode).toBe(10);
      expect(result.primaryMatch?.johnFormat).toBe('dynamic_0');
    });
  });

  describe('Encrypted Containers & Archives', () => {
    it('identifies KeePass hashes with mode 13400', () => {
      const keepass = '$keepass$*2*60000*0*1234567890abcdef*1234567890abcdef*...';
      const result = identifyHash(keepass);
      expect(result.primaryMatch?.hashcatMode).toBe(13400);
      expect(result.primaryMatch?.johnFormat).toBe('KeePass');
    });

    it('identifies ZIP hashes with mode 17200', () => {
      const zip = '$pkzip$1*1*2*0*12345678*...';
      const result = identifyHash(zip);
      expect(result.primaryMatch?.hashcatMode).toBe(17200);
      expect(result.primaryMatch?.johnFormat).toBe('pkzip');
    });

    it('identifies Office hashes with mode 9600', () => {
      const office = '$office$*2013*100000*256*16*...';
      const result = identifyHash(office);
      expect(result.primaryMatch?.hashcatMode).toBe(9600);
      expect(result.primaryMatch?.johnFormat).toBe('office');
    });
  });

  describe('Raw Hashes & 32-char Hex Ambiguity', () => {
    it('ranks NTLM as #1 and raw MD5 as #2 for 32-char hex string', () => {
      const hex32 = '31d6cfe0d16ae931b73c59d7e0c089c0';
      const result = identifyHash(hex32);
      expect(result.allMatches.length).toBeGreaterThanOrEqual(2);
      expect(result.allMatches[0].hashcatMode).toBe(1000); // NTLM
      expect(result.allMatches[1].hashcatMode).toBe(0); // MD5
      expect(result.isLikelyNtlmForPth).toBe(true);
    });

    it('identifies SHA-1 (40 hex) with mode 100', () => {
      const sha1 = '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed';
      const result = identifyHash(sha1);
      expect(result.primaryMatch?.hashcatMode).toBe(100);
    });

    it('identifies SHA-256 (64 hex) with mode 1400', () => {
      const sha256 = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';
      const result = identifyHash(sha256);
      expect(result.primaryMatch?.hashcatMode).toBe(1400);
    });
  });

  describe('JWT Decoding & Recognition', () => {
    it('safely decodes JWT header and payload and assigns mode 16500', () => {
      // {"alg":"HS256","typ":"JWT"}.{"user":"admin","role":"root","exp":1893456000}.signature
      const headerB64 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const payloadB64 = 'eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoicm9vdCIsImV4cCI6MTg5MzQ1NjAwMH0';
      const sampleJwt = `${headerB64}.${payloadB64}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;

      const result = identifyHash(sampleJwt);
      expect(result.primaryMatch?.hashcatMode).toBe(16500);
      expect(result.jwtDetails).toBeDefined();
      expect(result.jwtDetails?.header).toEqual({ alg: 'HS256', typ: 'JWT' });
      expect(result.jwtDetails?.payload?.user).toBe('admin');
      expect(result.jwtDetails?.isExpired).toBe(false);
    });
  });

  describe('Command Generators', () => {
    it('generates accurate Hashcat command with options', () => {
      const cmd = generateHashcatCommand(1000, 'hashes.txt', 'rockyou.txt', 'best64.rule', {
        enableRules: true,
        workload: 3,
      });
      expect(cmd).toContain('hashcat -m 1000 -a 0 -O -w 3 hashes.txt rockyou.txt -r best64.rule');
    });

    it('generates accurate John command with format and rules', () => {
      const cmd = generateJohnCommand('nt', 'hashes.txt', 'rockyou.txt', { rules: 'best64' });
      expect(cmd).toContain('john --format=nt --wordlist=rockyou.txt --rules=best64 hashes.txt');
    });
  });
});
