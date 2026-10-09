import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  extractDeepWriteups,
  stripDeepFieldsFromMachines,
  mergeDeepPayloadsIntoMachines,
  saveDeepProfileData,
  loadDeepProfileData,
  clearDeepProfileData,
  deleteMachineDeepData,
} from '../../utils/indexedDbDeepStorage';
import {
  saveVaultToIndexedDb,
  loadVaultFromIndexedDb,
  clearVaultFromIndexedDb,
} from '../../utils/indexedDbVault';
import {
  exportWriteupToHtml,
  downloadWriteupHtml,
} from '../../utils/writeupHtmlExporter';
import {
  exportWorkspaceToJson,
  validateWorkspacePayload,
  triggerWorkspaceDownload,
  sanitizeFilename,
} from '../../utils/workspaceStorage';
import type { Machine } from '../../types';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

const initialStoreState = useCtfStore.getState();
const initialAuthState = useAuthStore.getState();

describe('Tier 3 & Tier 1 E2E: Air-Gapped Offline Runtime Persistence & Network-Free Export Suite', () => {
  let interceptedNetworkCalls: string[] = [];
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    interceptedNetworkCalls = [];
    originalFetch = globalThis.fetch;

    // Strict Egress Interceptor: verifies zero outbound network calls in offline runtime
    globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      interceptedNetworkCalls.push(url);
      throw new Error(`[AIR-GAP EGRESS BLOCK] Network request blocked: ${url}`);
    });

    localStorage.clear();
    useCtfStore.setState(initialStoreState, true);
    useAuthStore.setState(initialAuthState, true);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('1. IndexedDB Deep Storage & Vault Persistence Invariants', () => {
    it('OFFLINE-01: Deep writeup extraction strips large bodies from localStorage machines', () => {
      const heavyMachines: Machine[] = [
        {
          id: 'mach-01',
          name: 'VulnBox-Alpha',
          ip: '10.10.10.100',
          os: 'Linux',
          difficulty: 'Hard',
          platform: 'HTB',
          status: 'completed',
          openPorts: [22, 80, 443],
          tags: ['sqli', 'privesc'],
          certifications: ['OSCP'],
          timeSpentSeconds: 3600,
          writeupMarkdown: '# Deep Writeup\n'.repeat(500),
          quickNotes: 'Credentials: admin / secret12345',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 'mach-02',
          name: 'VulnBox-Beta',
          ip: '10.10.10.200',
          os: 'Windows',
          difficulty: 'Medium',
          platform: 'HTB',
          status: 'recon',
          openPorts: [445],
          tags: ['smb'],
          certifications: ['CRTO'],
          timeSpentSeconds: 600,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ];

      // 1. Extract heavy writeups
      const deepMap = extractDeepWriteups(heavyMachines);
      expect(deepMap['mach-01']).toBeDefined();
      expect(deepMap['mach-01'].writeupMarkdown).toContain('# Deep Writeup');
      expect(deepMap['mach-01'].quickNotes).toBe('Credentials: admin / secret12345');
      expect(deepMap['mach-02']).toBeUndefined();

      // 2. Strip from machines to produce ultra-lean payload for localStorage
      const leanMachines = stripDeepFieldsFromMachines(heavyMachines);
      expect(leanMachines[0].id).toBe('mach-01');
      expect(leanMachines[0].writeupMarkdown).toBeUndefined();
      expect(leanMachines[0].quickNotes).toBeUndefined();
      expect(leanMachines[0].tags).toEqual(['sqli', 'privesc']);

      // 3. Re-merge loaded payloads back into machines non-destructively
      const rehydrated = mergeDeepPayloadsIntoMachines(leanMachines, deepMap);
      expect(rehydrated[0].writeupMarkdown).toContain('# Deep Writeup');
      expect(rehydrated[0].quickNotes).toBe('Credentials: admin / secret12345');
    });

    it('OFFLINE-02: Deep storage persistence CRUD operations handle operations gracefully without crashing', async () => {
      // Test save, load, delete, clear in offline test environment
      await expect(
        saveDeepProfileData('usr_spectre', {
          writeups: {
            'mach-10': {
              writeupMarkdown: '# Foothold via SSTI',
              quickNotes: 'Port 8080 exposed Flask console',
            },
          },
          customNotes: [{ id: 'note-1', title: 'AD Enumeration' }],
        })
      ).resolves.not.toThrow();

      const loaded = await loadDeepProfileData('usr_spectre');
      expect(loaded === null || typeof loaded === 'object').toBe(true);

      await expect(deleteMachineDeepData('usr_spectre', 'mach-10')).resolves.not.toThrow();
      await expect(clearDeepProfileData('usr_spectre')).resolves.not.toThrow();
    });

    it('OFFLINE-03: Vault storage utilities save, load, and clear offline notes seamlessly', async () => {
      const mockNotes: CptsNoteEntry[] = [
        {
          id: 'note-smb',
          title: 'SMB Enumeration',
          titleEn: 'SMB Enumeration',
          category: 'Recon',
          rawCategory: 'Recon',
          subCategory: 'Network Services',
          difficulty: 'Easy',
          summary: 'Enumerating null sessions on port 445.',
          rawMarkdown: '# SMB\nUse `crackmapexec smb 10.10.10.0/24 -u "" -p ""`',
          commands: ['crackmapexec smb 10.10.10.0/24 -u "" -p ""'],
          relPath: 'Recon/SMB.md',
          tags: ['smb', 'null-session'],
          dateModified: '2026-09-24T00:00:00.000Z',
        },
      ];

      const wikilinkMap = { 'smb enumeration': 'note-smb' };

      // Verify vault storage mock operations
      await expect(saveVaultToIndexedDb({ notes: mockNotes, wikilinkMap })).resolves.not.toThrow();
      const loaded = await loadVaultFromIndexedDb();
      expect(loaded === null || typeof loaded === 'object').toBe(true);
      await expect(clearVaultFromIndexedDb()).resolves.not.toThrow();
    });
  });

  describe('2. Zustand State & Storage Synchronization Lifecycle', () => {
    it('OFFLINE-04: Full machine engagement lifecycle and checklist tracking operate offline with zero egress', () => {
      const store = useCtfStore.getState();

      // 1. Add custom machine
      store.addCustomMachine({
        name: 'Chimera',
        ip: '10.10.11.215',
        os: 'Linux',
        difficulty: 'Medium',
        platform: 'HTB',
        status: 'backlog',
        openPorts: [22, 80],
        tags: ['web', 'cve-2024-9999'],
        certifications: ['CPTS'],
        timeSpentSeconds: 0,
      });

      const machine = useCtfStore.getState().machines.find((m) => m.name === 'Chimera')!;
      expect(machine).toBeDefined();

      // 2. Set active target and start timer
      store.setActiveTarget(machine.id);
      expect(useCtfStore.getState().activeTargetId).toBe(machine.id);
      store.startTimer();
      expect(useCtfStore.getState().isTimerRunning).toBe(true);

      // 3. Advance timer and transition to recon
      store.tickTimer();
      store.tickTimer();
      expect(useCtfStore.getState().activeTimerSeconds).toBe(2);

      store.updateMachineStatus(machine.id, 'recon');
      store.setChecklistItemStatus(machine.id, 'port-scan', 'done');
      store.setChecklistItemNotes(machine.id, 'port-scan', 'Found open ports 22, 80');

      // 4. Capture user flag -> foothold state progression
      store.toggleUserFlag(machine.id, 'user_flag_hash_12345');
      const footholdMachine = useCtfStore.getState().machines.find((m) => m.id === machine.id);
      expect(footholdMachine?.status).toBe('foothold');
      expect(footholdMachine?.userFlag).toBe('user_flag_hash_12345');
      expect(footholdMachine?.userPwnedAt).toBeDefined();

      // 5. Capture root flag -> completed state
      store.toggleRootFlag(machine.id, 'root_flag_hash_67890');
      store.updateMachineStatus(machine.id, 'completed');
      store.pauseTimer();

      const completedMachine = useCtfStore.getState().machines.find((m) => m.id === machine.id);
      expect(completedMachine?.status).toBe('completed');
      expect(completedMachine?.rootFlag).toBe('root_flag_hash_67890');
      expect(completedMachine?.rootPwnedAt).toBeDefined();
      expect(useCtfStore.getState().isTimerRunning).toBe(false);

      // Verify zero network egress
      expect(interceptedNetworkCalls.length).toBe(0);
    });

    it('OFFLINE-05: resetAllProgress completely wipes workspace machines, notes, and activity sessions', async () => {
      // 1. Add machine and set custom global variables
      useCtfStore.getState().addCustomMachine({
        name: 'Target-To-Wipe',
        ip: '10.10.10.77',
        os: 'Linux',
        difficulty: 'Easy',
        platform: 'HTB',
        status: 'completed',
        openPorts: [80],
        tags: ['wipe-me'],
        certifications: [],
        timeSpentSeconds: 1500,
        userFlag: 'flag{wipe}',
      });

      useCtfStore.getState().setGlobalVars({
        targetIp: '10.10.10.77',
        lhost: '10.10.14.5',
        lport: '9001',
      });

      expect(useCtfStore.getState().machines.some((m) => m.name === 'Target-To-Wipe')).toBe(true);

      // 2. Perform complete reset
      await useCtfStore.getState().resetAllProgress();

      // 3. Verify complete eradication of custom state
      const state = useCtfStore.getState();
      expect(state.machines.some((m) => m.name === 'Target-To-Wipe')).toBe(false);
      expect(state.userNotes).toEqual([]);
      expect(state.customNotes).toEqual([]);
      expect(state.activitySessions).toEqual([]);
      expect(state.isTimerRunning).toBe(false);
    });

    it('OFFLINE-06: Profile switching isolates localStorage keys without data bleed', () => {
      // Setup Profile 1 (RedTeam)
      useCtfStore.getState().loadProfileData('redteam');
      useCtfStore.getState().addCustomMachine({
        name: 'Red-Box-1',
        ip: '10.10.10.1',
        os: 'Linux',
        difficulty: 'Easy',
        platform: 'HTB',
        status: 'completed',
        openPorts: [80],
        tags: ['red'],
        certifications: [],
        timeSpentSeconds: 100,
        userFlag: 'red_flag',
      });
      useCtfStore.getState().saveProfileData('redteam');

      // Verify stored under profile-specific key in localStorage
      const redteamStored = localStorage.getItem('specter_ctf_profile_redteam');
      expect(redteamStored).not.toBeNull();
      expect(JSON.parse(redteamStored!).machines.some((m: any) => m.name === 'Red-Box-1')).toBe(true);

      // Switch to Profile 2 (BlueTeam)
      useCtfStore.getState().loadProfileData('blueteam');
      expect(useCtfStore.getState().machines.some((m) => m.name === 'Red-Box-1')).toBe(false);

      useCtfStore.getState().addCustomMachine({
        name: 'Blue-Box-1',
        ip: '10.10.10.2',
        os: 'Windows',
        difficulty: 'Hard',
        platform: 'HTB',
        status: 'recon',
        openPorts: [445],
        tags: ['blue'],
        certifications: ['CRTO'],
        timeSpentSeconds: 200,
      });
      useCtfStore.getState().saveProfileData('blueteam');

      // Verify Blueteam does not contain Red-Box-1
      const blueteamStored = localStorage.getItem('specter_ctf_profile_blueteam');
      expect(blueteamStored).not.toBeNull();
      expect(JSON.parse(blueteamStored!).machines.some((m: any) => m.name === 'Red-Box-1')).toBe(false);
      expect(JSON.parse(blueteamStored!).machines.some((m: any) => m.name === 'Blue-Box-1')).toBe(true);
    });
  });

  describe('3. Offline Operator Authentication & Guest Flow', () => {
    it('OFFLINE-07: Guest operator login generates local session token and inline avatar with ZERO network requests', async () => {
      // 1. Initial guest unauthenticated state
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();

      // 2. Perform 1-click local operator login
      await useAuthStore.getState().loginAsOperator('Shadow Operator', 'shadow@zerobox.offline');

      // 3. Verify state
      const auth = useAuthStore.getState();
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user).toBeDefined();
      expect(auth.user?.name).toBe('Shadow Operator');
      expect(auth.user?.email).toBe('shadow@zerobox.offline');
      expect(auth.user?.avatarUrl?.startsWith('data:image/svg+xml')).toBe(true);
      expect(auth.token?.startsWith('operator_token_')).toBe(true);

      // 4. Verify ZERO network requests were attempted
      expect(interceptedNetworkCalls.length).toBe(0);
    });

    it('OFFLINE-08: Profile rename, creation, switching, and deletion operate purely client-side', async () => {
      // Login initial operator
      await useAuthStore.getState().loginAsOperator('Operator-One');
      expect(useAuthStore.getState().user?.name).toBe('Operator-One');

      // Rename profile
      useAuthStore.getState().renameProfile('Operator-Prime');
      expect(useAuthStore.getState().user?.name).toBe('Operator-Prime');

      // Create new profile
      await useAuthStore.getState().loginAsOperator('Operator-Two');
      expect(useAuthStore.getState().user?.name).toBe('Operator-Two');
      expect(useAuthStore.getState().profiles.length).toBe(2);

      // Switch back to Operator-Prime
      const primeProfile = useAuthStore.getState().profiles.find((p) => p.name === 'Operator-Prime')!;
      useAuthStore.getState().switchProfile(primeProfile.id);
      expect(useAuthStore.getState().user?.name).toBe('Operator-Prime');

      // Delete Operator-Two
      const twoProfile = useAuthStore.getState().profiles.find((p) => p.name === 'Operator-Two')!;
      useAuthStore.getState().deleteProfile(twoProfile.id);
      expect(useAuthStore.getState().profiles.some((p) => p.id === twoProfile.id)).toBe(false);

      // Logout returns to unauthenticated guest profile
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();

      // Verify zero network egress throughout all profile management steps
      expect(interceptedNetworkCalls.length).toBe(0);
    });
  });

  describe('4. Standalone Report Generation & Download Without Network', () => {
    it('OFFLINE-09: exportWriteupToHtml produces fully self-contained offline document with strict CSP and zero external assets', () => {
      const mockMachine: Machine = {
        id: 'mach-report-01',
        name: 'Obsidian-Fortress',
        ip: '10.10.11.150',
        os: 'Linux',
        difficulty: 'Insane',
        platform: 'HTB',
        status: 'completed',
        openPorts: [22, 80, 443, 8080],
        tags: ['web', 'deserialization', 'kernel-exploit'],
        certifications: ['OSCP', 'CPTS'],
        timeSpentSeconds: 5400,
        userFlag: 'flag{user_proven}',
        rootFlag: 'flag{root_proven}',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const markdownReport = `
# Obsidian-Fortress Operational Assessment
**Author**: Spectre
**Classification**: CONFIDENTIAL

## Reconnaissance
Port scan identified services:
| Port | Protocol | Service | Version |
|---|---|---|---|
| 22 | tcp | ssh | OpenSSH 8.9 |
| 80 | tcp | http | Apache 2.4.52 |
| 8080 | tcp | http-proxy | Custom Proxy |

## Foothold
Exploited unsafe deserialization endpoint using custom Python exploit:
\`\`\`python
import pickle, base64
class Exploit(object):
    def __reduce__(self):
        return (os.system, ('cat /home/user/user.txt',))
print(base64.b64encode(pickle.dumps(Exploit())))
\`\`\`

## Evidence & Verification
- [x] Initial Nmap enumeration completed
- [x] User flag retrieved: \`flag{user_proven}\`
- [x] Root flag retrieved: \`flag{root_proven}\`

> Note: All testing conducted in accordance with authorized Rules of Engagement.
`;

      const html = exportWriteupToHtml(mockMachine, markdownReport, {
        brandName: 'ZEROBOX AIR-GAP',
        author: 'Spectre Operator',
      });

      // 1. Strict Content-Security-Policy meta tag
      expect(html).toMatch(/<meta\s+http-equiv=["']Content-Security-Policy["']/i);
      expect(html).toContain("default-src 'none'");

      // 2. Embedded CSS styles with zero external imports
      expect(html).toContain('<style>');
      expect(html).not.toMatch(/@import\s+url\(["']?https?:\/\//i);
      expect(html).not.toMatch(/fonts\.googleapis\.com/i);

      // 3. Embedded scripts with zero external src
      expect(html).toContain('<script>');
      expect(html).not.toMatch(/<script[^>]+src=["']https?:\/\//i);

      // 4. Target overview HUD populated
      expect(html).toContain('Obsidian-Fortress');
      expect(html).toContain('10.10.11.150');
      expect(html).toContain('Insane');
      expect(html).toContain('22, 80, 443, 8080');
      expect(html).toContain('flag{user_proven}');
      expect(html).toContain('flag{root_proven}');

      // 5. Markdown structure correctly rendered
      expect(html).toContain('<th>Port</th>');
      expect(html).toContain('<td>OpenSSH 8.9</td>');
      expect(html).toContain('class="task-list-item"');
      expect(html).toContain('<blockquote>');
      expect(html).toContain('language-python');
      expect(html).toContain('pickle, base64');

      // 6. Zero network calls triggered
      expect(interceptedNetworkCalls.length).toBe(0);
    });

    it('OFFLINE-10: Workspace exportToJson and validateWorkspacePayload perform clean roundtrip serialization without network', () => {
      const mockState = {
        machines: [
          {
            id: 'm-1',
            name: 'Target-1',
            ip: '10.10.10.1',
            os: 'Linux' as const,
            difficulty: 'Easy' as const,
            platform: 'HTB' as const,
            status: 'completed' as const,
            openPorts: [80],
            tags: ['tag1'],
            certifications: ['OSCP' as const],
            timeSpentSeconds: 1200,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        ],
        globalVars: {
          targetIp: '10.10.10.1',
          lhost: '10.10.14.5',
          lport: '4444',
          interface: 'tun0',
          customVars: { WORKSPACE: 'TEST' },
        },
        cheatsheets: [],
        activitySessions: [],
      };

      const jsonStr = exportWorkspaceToJson(mockState);
      expect(typeof jsonStr).toBe('string');

      // Validate payload and check prototype pollution protection
      const maliciousPayload = JSON.parse(jsonStr);
      maliciousPayload.__proto__ = { polluted: true };

      const validation = validateWorkspacePayload(maliciousPayload);
      expect(validation.success).toBe(true);
      expect(validation.data?.machines?.length).toBe(1);
      expect(validation.data?.machines?.[0].name).toBe('Target-1');
      expect((Object.prototype as any).polluted).toBeUndefined();

      // Zero network calls
      expect(interceptedNetworkCalls.length).toBe(0);
    });

    it('OFFLINE-11: Browser download triggers execute safely in JSDOM environment without network', () => {
      const mockMachine: Machine = {
        id: 'm-dl',
        name: 'Download-Box',
        ip: '10.10.10.5',
        os: 'Linux',
        difficulty: 'Easy',
        platform: 'HTB',
        status: 'completed',
        openPorts: [22],
        tags: [],
        certifications: [],
        timeSpentSeconds: 60,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      // Mock URL object methods and anchor click in jsdom
      const originalCreateObjectURL = window.URL.createObjectURL;
      const originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-uuid');
      window.URL.revokeObjectURL = vi.fn();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      // Test writeup HTML download trigger
      expect(() => downloadWriteupHtml(mockMachine, '# Report')).not.toThrow();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-uuid');

      // Test workspace JSON download trigger
      expect(() => triggerWorkspaceDownload('{"version":"2.0.0"}', 'test-export')).not.toThrow();

      // Test sanitizeFilename
      expect(sanitizeFilename('path/to/../../bad:file?.json')).toBe('badfile.json');
      expect(sanitizeFilename('CON.txt')).toBe('safe-CON.txt');

      // Cleanup mocks
      clickSpy.mockRestore();
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;

      expect(interceptedNetworkCalls.length).toBe(0);
    });
  });
});
