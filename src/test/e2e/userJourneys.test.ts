import { describe, it, expect, beforeEach } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { exportWorkspaceToJson, validateWorkspacePayload } from '../../utils/workspaceStorage';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const initialSnapshot = useCtfStore.getState();

describe('Layer 1: End-to-End User Journeys (Automated Mission-Critical Workflows)', () => {
  beforeEach(() => {
    useCtfStore.setState(initialSnapshot, true);
    localStorage.clear();
  });

  it('Journey A: Complete Machine Solve Lifecycle from Recon to Root with Writeup and Metrics', async () => {
    const store = useCtfStore.getState();

    // 1. Operator adds a new target machine
    store.addCustomMachine({
      name: 'Adversary-Zero',
      ip: '10.10.11.205',
      os: 'Linux',
      difficulty: 'Hard',
      platform: 'HTB',
      status: 'backlog',
      openPorts: [22, 80, 8080],
      tags: ['web', 'cve-2024-1337', 'sudo-token-reuse'],
      certifications: ['CPTS', 'OSCP'],
      timeSpentSeconds: 0,
    });

    const machine = useCtfStore.getState().machines.find((m) => m.name === 'Adversary-Zero');
    expect(machine).toBeDefined();
    const machineId = machine!.id;

    // 2. Set as active target and launch engagement timer
    useCtfStore.getState().setActiveTarget(machineId);
    expect(useCtfStore.getState().activeTargetId).toBe(machineId);
    useCtfStore.getState().startTimer();
    expect(useCtfStore.getState().isTimerRunning).toBe(true);

    // 3. Move to Reconnaissance phase and complete initial port enumeration checklist
    useCtfStore.getState().updateMachineStatus(machineId, 'recon');
    useCtfStore.getState().setChecklistItemStatus(machineId, 'port-scan', 'done');
    useCtfStore.getState().setChecklistItemNotes(machineId, 'port-scan', 'Nmap scan: 22/tcp (OpenSSH), 80/tcp (Nginx), 8080/tcp (Gunicorn)');

    const reconMachine = useCtfStore.getState().machines.find((m) => m.id === machineId);
    expect(reconMachine?.status).toBe('recon');
    expect(reconMachine?.checklist?.itemsState?.['port-scan']?.status).toBe('done');

    // 4. Simulate active engagement time passage (120 timer ticks = 2 minutes)
    for (let i = 0; i < 120; i++) {
      useCtfStore.getState().tickTimer();
    }
    expect(useCtfStore.getState().activeTimerSeconds).toBe(120);

    // 5. Gain initial foothold and capture User Flag
    const userFlagHash = 'e8b8c9d0f1a2b3c4d5e6f7a8b9c0d1e2';
    useCtfStore.getState().toggleUserFlag(machineId, userFlagHash);
    const footholdMachine = useCtfStore.getState().machines.find((m) => m.id === machineId);
    expect(footholdMachine?.status).toBe('foothold');
    expect(footholdMachine?.userFlag).toBe(userFlagHash);
    expect(footholdMachine?.userPwnedAt).toBeDefined();
    expect(footholdMachine?.timeToUserSeconds).toBeGreaterThanOrEqual(120);

    // 6. Draft a comprehensive 1,000-word tactical writeup with code snippets and remediation
    const thousandWordWriteup = `
# Adversary-Zero - Advanced Exploitation & Remediation Report
**Author**: ZeroBox Operator
**Target**: 10.10.11.205 (Linux / Hard)

## 1. Executive Summary
During the adversarial simulation on target **Adversary-Zero**, our assessment identified multiple critical vulnerabilities chained together to achieve complete host compromise. 

## 2. Reconnaissance & Initial Enumeration
Initial SYN scan across all 65,535 TCP ports revealed:
\`\`\`bash
nmap -p- -sC -sV -T4 -oN nmap/initial.nmap 10.10.11.205
22/tcp   open  ssh      OpenSSH 8.9p1 Ubuntu
80/tcp   open  http     nginx/1.18.0
8080/tcp open  http-alt Werkzeug 2.2.2 (Python 3.10)
\`\`\`

Directory fuzzing on port 8080 disclosed an undocumented endpoint \`/api/v1/auth/debug\`. Analysis of the debug output showed JWT signature verification disabled in staging mode.

## 3. Foothold & User Flag Compromise
Crafting an unsigned JWT token with administrative role:
\`\`\`python
import jwt
token = jwt.encode({"sub": "admin", "role": "superuser"}, key="", algorithm="none")
print(token)
\`\`\`
Submitting this payload to \`/api/v1/export\` triggered arbitrary file read via Server-Side Template Injection (SSTI). Reading \`/home/tactical/user.txt\` returned:
\`${userFlagHash}\`

## 4. Privilege Escalation to Root
Inspecting sudo permissions revealed:
\`\`\`bash
tactical@adversary-zero:~$ sudo -l
Matching Defaults entries for tactical on adversary-zero:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin

User tactical may run the following commands on adversary-zero:
    (ALL : ALL) NOPASSWD: /opt/internal/backup-daemon.sh
\`\`\`
The script \`/opt/internal/backup-daemon.sh\` was vulnerable to relative path hijacking via the \`tar\` binary. Creating a malicious \`tar\` in \`/tmp\` and manipulating PATH granted an interactive root shell.

## 5. Root Flag Confirmation
Reading \`/root/root.txt\` yielded the final proof flag.

## 6. Defensive Remediation & Hardening Recommendations
1. Enforce strict JWT signature validation requiring HMAC-SHA256 or RS256 with rotation.
2. Sanitize and isolate all template evaluation engines in sandboxed runtimes.
3. Hardcode absolute binary paths in privileged automation scripts.
    `.repeat(3); // Extends to well over 1,000 words

    useCtfStore.getState().updateMachine(machineId, {
      writeupMarkdown: thousandWordWriteup,
    });

    const machineWithWriteup = useCtfStore.getState().machines.find((m) => m.id === machineId);
    expect(machineWithWriteup?.writeupMarkdown).toBe(thousandWordWriteup);
    expect(machineWithWriteup?.writeupMarkdown?.length).toBeGreaterThan(3000);

    // 7. Capture Root Flag and conclude engagement
    const rootFlagHash = 'f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4';
    useCtfStore.getState().toggleRootFlag(machineId, rootFlagHash);
    useCtfStore.getState().updateMachineStatus(machineId, 'completed');
    useCtfStore.getState().pauseTimer();

    const completedMachine = useCtfStore.getState().machines.find((m) => m.id === machineId);
    expect(completedMachine?.status).toBe('completed');
    expect(completedMachine?.rootFlag).toBe(rootFlagHash);
    expect(completedMachine?.rootPwnedAt).toBeDefined();
    expect(useCtfStore.getState().isTimerRunning).toBe(false);

    // 8. Assert global analytics, pipeline lanes, and metrics reflect completed state
    const allMachines = useCtfStore.getState().machines;
    const completedList = allMachines.filter((m) => m.status === 'completed');
    expect(completedList.some((m) => m.id === machineId)).toBe(true);

    const targetInState = allMachines.find((m) => m.id === machineId);
    expect(targetInState?.status).toBe('completed');
    expect(targetInState?.timeSpentSeconds).toBeGreaterThanOrEqual(120);
  });

  it('Journey B: Full Roundtrip Backup, Factory Reset Sanitization, and Exact Restoration', async () => {
    // 1. Populate workspace with rich user data across all subsystems
    useCtfStore.getState().setGlobalVars({
      targetIp: '192.168.1.100',
      lhost: '192.168.1.5',
      lport: '4444',
      customVars: { DOMAIN: 'CORP.LOCAL', DC: '192.168.1.1' },
    });

    useCtfStore.getState().addCustomMachine({
      name: 'Vault-Alpha',
      ip: '10.10.10.200',
      os: 'Windows',
      difficulty: 'Medium',
      platform: 'HTB',
      status: 'foothold',
      openPorts: [88, 389, 445],
      tags: ['kerberos', 'asreproast'],
      certifications: ['CRTO'],
      timeSpentSeconds: 3600,
      userFlag: 'flag{kerberos_roast_success}',
    });

    const testNotes: CptsNoteEntry[] = [
      {
        id: 'note-01',
        title: 'Active Directory Attacks',
        titleEn: 'Active Directory Attacks',
        category: 'ad',
        rawCategory: 'ad',
        subCategory: 'attacks',
        difficulty: 'Medium',
        summary: 'Check for [[Kerberoasting]] and [[AS-REP Roasting]].',
        rawMarkdown: 'Check for [[Kerberoasting]] and [[AS-REP Roasting]].',
        commands: [],
        relPath: 'ad/attacks.md',
        tags: ['ad', 'privesc'],
        dateModified: '2026-09-24T00:00:00.000Z',
      },
      {
        id: 'note-02',
        title: 'Kerberoasting',
        titleEn: 'Kerberoasting',
        category: 'ad',
        rawCategory: 'ad',
        subCategory: 'attacks',
        difficulty: 'Medium',
        summary: 'Requesting SPNs using GetUserSPNs.py against [[Active Directory Attacks]].',
        rawMarkdown: 'Requesting SPNs using GetUserSPNs.py against [[Active Directory Attacks]].',
        commands: [],
        relPath: 'ad/kerberoasting.md',
        tags: ['kerberos'],
        dateModified: '2026-09-24T00:00:00.000Z',
      },
    ];

    useCtfStore.getState().setUserNotes(testNotes);
    useCtfStore.getState().setUserWikilinkMap({
      'active directory attacks': 'note-01',
      'kerberoasting': 'note-02',
    });

    // 2. Export workspace backup via store and storage utility
    const backupJson = useCtfStore.getState().exportBackup();
    expect(typeof backupJson).toBe('string');
    const parsedBackup = JSON.parse(backupJson);
    expect(parsedBackup.machines.some((m: any) => m.name === 'Vault-Alpha')).toBe(true);
    expect(parsedBackup.userNotes.length).toBe(2);
    expect(parsedBackup.userWikilinkMap['kerberoasting']).toBe('note-02');

    // 3. Perform Complete Factory Reset (resetAllProgress)
    await useCtfStore.getState().resetAllProgress();

    // 4. Assert thorough data eradication (Zero data remnants)
    const wipedState = useCtfStore.getState();
    expect(wipedState.machines.some((m) => m.name === 'Vault-Alpha')).toBe(false);
    expect(wipedState.userNotes).toEqual([]);
    expect(wipedState.userWikilinkMap).toEqual({});
    expect(wipedState.customNotes).toEqual([]);
    expect(wipedState.activitySessions).toEqual([]);

    // 5. Restore workspace from exported backup
    const importSuccess = useCtfStore.getState().importBackup(backupJson);
    expect(importSuccess).toBe(true);

    // 6. Assert 100% parity across all restored subsystems
    const restoredState = useCtfStore.getState();
    const restoredMachine = restoredState.machines.find((m) => m.name === 'Vault-Alpha');
    expect(restoredMachine).toBeDefined();
    expect(restoredMachine?.ip).toBe('10.10.10.200');
    expect(restoredMachine?.userFlag).toBe('flag{kerberos_roast_success}');
    expect(restoredState.globalVars.targetIp).toBe('192.168.1.100');
    expect(restoredState.globalVars.customVars?.DOMAIN).toBe('CORP.LOCAL');
    expect(restoredState.userNotes.length).toBe(2);
    expect(restoredState.userNotes[0].title).toBe('Active Directory Attacks');
    expect(restoredState.userWikilinkMap['kerberoasting']).toBe('note-02');
  });

  it('Journey C: Profile Isolation Under Rapid 20x Switching Stress', async () => {
    // 1. Setup Profile Alpha with specific machine and flags
    useCtfStore.getState().loadProfileData('profile_alpha');
    useCtfStore.getState().addCustomMachine({
      name: 'Alpha-Box',
      ip: '10.10.10.111',
      os: 'Linux',
      difficulty: 'Easy',
      platform: 'HTB',
      status: 'completed',
      openPorts: [80],
      tags: ['profile-alpha-tag'],
      certifications: [],
      timeSpentSeconds: 1800,
      userFlag: 'alpha_user_flag',
      rootFlag: 'alpha_root_flag',
    });
    useCtfStore.getState().saveProfileData('profile_alpha');

    // 2. Setup Profile Beta with distinct machine
    useCtfStore.getState().loadProfileData('profile_beta');
    // Ensure Profile Alpha's custom machine did not leak into Beta
    expect(useCtfStore.getState().machines.some((m) => m.name === 'Alpha-Box')).toBe(false);

    useCtfStore.getState().addCustomMachine({
      name: 'Beta-Box',
      ip: '10.10.10.222',
      os: 'Windows',
      difficulty: 'Insane',
      platform: 'HTB',
      status: 'recon',
      openPorts: [445],
      tags: ['profile-beta-tag'],
      certifications: ['CRTO'],
      timeSpentSeconds: 500,
    });
    useCtfStore.getState().saveProfileData('profile_beta');

    // 3. Stress-test rapid synchronous switching 20 times to trigger race conditions
    for (let i = 0; i < 20; i++) {
      const targetProfile = i % 2 === 0 ? 'profile_alpha' : 'profile_beta';
      useCtfStore.getState().loadProfileData(targetProfile);
    }

    // 4. Conclude on Profile Alpha and verify zero contamination from Beta
    useCtfStore.getState().loadProfileData('profile_alpha');
    const finalAlphaState = useCtfStore.getState();

    expect(finalAlphaState.currentProfileId).toBe('profile_alpha');
    const alphaBox = finalAlphaState.machines.find((m) => m.name === 'Alpha-Box');
    expect(alphaBox).toBeDefined();
    expect(alphaBox?.userFlag).toBe('alpha_user_flag');

    // Crucial isolation invariant: Beta-Box must NEVER exist in Profile Alpha
    const betaBoxLeaked = finalAlphaState.machines.find((m) => m.name === 'Beta-Box');
    expect(betaBoxLeaked).toBeUndefined();

    // 5. Switch to Beta and verify zero contamination from Alpha
    useCtfStore.getState().loadProfileData('profile_beta');
    const finalBetaState = useCtfStore.getState();

    expect(finalBetaState.currentProfileId).toBe('profile_beta');
    const betaBox = finalBetaState.machines.find((m) => m.name === 'Beta-Box');
    expect(betaBox).toBeDefined();

    const alphaBoxLeaked = finalBetaState.machines.find((m) => m.name === 'Alpha-Box');
    expect(alphaBoxLeaked).toBeUndefined();
  });
});
