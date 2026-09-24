import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { useAuthStore, DEFAULT_DANIEL_PROFILE, DEFAULT_AVATAR_DATA_URI } from '../../store/useAuthStore';
import { useCtfStore } from '../../store/useCtfStore';
import { sanitizeExternalUrl } from '../../utils/helpers';
import { exportWriteupToHtml } from '../../utils/writeupHtmlExporter';
import type { Machine } from '../../types';

describe('Tier 4 E2E: Air-Gapped Zero-Egress Posture & Network Isolation Invariants', () => {
  const projectRoot = path.resolve(__dirname, '../../..');

  // --- Network Interceptor Setup ---
  let originalFetch: typeof globalThis.fetch;
  let interceptedCalls: string[] = [];

  beforeEach(() => {
    interceptedCalls = [];
    originalFetch = globalThis.fetch;

    // Strict Egress Trap: Any outbound attempt to http/https is logged and blocked
    globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      interceptedCalls.push(url);
      throw new Error(`[AIR-GAP VIOLATION] Unauthorized external egress attempt blocked: ${url}`);
    });

    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Static Code Audit & Asset Egress Elimination', () => {
    it('ZERO-EGRESS-01: index.html contains ZERO external scripts, external fonts, or telemetry tags', () => {
      const indexPath = path.join(projectRoot, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);
      const htmlContent = fs.readFileSync(indexPath, 'utf-8');

      // 1. Assert absence of Google Identity Services / GSI SDK
      expect(htmlContent).not.toMatch(/accounts\.google\.com\/gsi/i);
      expect(htmlContent).not.toMatch(/apis\.google\.com/i);

      // 2. Assert absence of remote Google Fonts / CDNs
      expect(htmlContent).not.toMatch(/fonts\.googleapis\.com/i);
      expect(htmlContent).not.toMatch(/fonts\.gstatic\.com/i);
      expect(htmlContent).not.toMatch(/cdnjs\.cloudflare\.com/i);
      expect(htmlContent).not.toMatch(/cdn\.jsdelivr\.net/i);
      expect(htmlContent).not.toMatch(/unpkg\.com/i);

      // 3. Assert presence of strict offline Content-Security-Policy (CSP) meta tag
      const cspMatch = htmlContent.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]+)"/i);
      expect(cspMatch).not.toBeNull();
      const csp = cspMatch![1];

      // CSP must forbid remote origins
      expect(csp).toMatch(/default-src\s+['"]none['"]/i);
      expect(csp).toMatch(/connect-src\s+['"]self['"]/i);
      expect(csp).not.toMatch(/https:\/\//i);
    });

    it('ZERO-EGRESS-02: src/index.css contains ZERO remote @import statements or remote font URLs', () => {
      const cssPath = path.join(projectRoot, 'src/index.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Assert absence of remote @import or remote font urls
      expect(cssContent).not.toMatch(/@import\s+url\(["']?https?:\/\//i);
      expect(cssContent).not.toMatch(/fonts\.googleapis\.com/i);
      expect(cssContent).not.toMatch(/fonts\.gstatic\.com/i);
    });

    it('ZERO-EGRESS-03: useAuthStore uses local inline SVG avatar URI with zero Unsplash or external image egress', () => {
      // 1. Verified in-memory constants
      expect(DEFAULT_AVATAR_DATA_URI).toBeDefined();
      expect(DEFAULT_AVATAR_DATA_URI.startsWith('data:image/svg+xml')).toBe(true);
      expect(DEFAULT_DANIEL_PROFILE.avatarUrl.startsWith('data:image/svg+xml')).toBe(true);

      // 2. Verified on disk source
      const authStorePath = path.join(projectRoot, 'src/store/useAuthStore.ts');
      const authStoreContent = fs.readFileSync(authStorePath, 'utf-8');
      expect(authStoreContent).not.toMatch(/images\.unsplash\.com/i);
      expect(authStoreContent).not.toMatch(/avatarUrl:\s*["']https?:\/\//i);
    });

    it('ZERO-EGRESS-04: UserMenu.tsx contains zero remote Google OAuth fetch or window.open calls', () => {
      const userMenuPath = path.join(projectRoot, 'src/components/auth/UserMenu.tsx');
      expect(fs.existsSync(userMenuPath)).toBe(true);
      const content = fs.readFileSync(userMenuPath, 'utf-8');

      // UserMenu must not fetch Google userinfo or open remote Google accounts auth window
      expect(content).not.toMatch(/fetch\(["']https:\/\/www\.googleapis\.com/i);
      expect(content).not.toMatch(/window\.open\(["']https:\/\/accounts\.google\.com/i);
    });

    it('ZERO-EGRESS-05: Desktop configuration (tauri.conf.json) has zero active remote updater endpoints', () => {
      const tauriConfPath = path.join(projectRoot, 'src-tauri/tauri.conf.json');
      if (fs.existsSync(tauriConfPath)) {
        const tauriContent = fs.readFileSync(tauriConfPath, 'utf-8');
        const parsed = JSON.parse(tauriContent);
        const endpoints = parsed.plugins?.updater?.endpoints || [];
        // Endpoints must either be empty or point to empty strings / disabled in air-gapped configuration
        const activeRemoteEndpoints = endpoints.filter((ep: string) => ep && ep.startsWith('http'));
        expect(activeRemoteEndpoints.length).toBe(0);
      }
    });
  });

  describe('Runtime Network Trapping & Safe Offline Execution', () => {
    it('ZERO-EGRESS-06: Operator local authentication generates ZERO network calls', async () => {
      const auth = useAuthStore.getState();
      await auth.loginAsOperator('Spectre Operator', 'spectre@zerobox.offline');

      expect(interceptedCalls.length).toBe(0);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.name).toBe('Spectre Operator');
      expect(useAuthStore.getState().user?.avatarUrl?.startsWith('data:image/svg+xml')).toBe(true);
    });

    it('ZERO-EGRESS-07: Full machine attack lifecycle triggers ZERO network calls', () => {
      const store = useCtfStore.getState();

      // Add target machine
      store.addCustomMachine({
        name: 'Ironclad-Target',
        ip: '10.10.11.199',
        os: 'Linux',
        difficulty: 'Insane',
        platform: 'HTB',
        status: 'backlog',
        openPorts: [22, 80, 443, 8443],
        tags: ['air-gap', 'zero-egress'],
        certifications: ['OSCP'],
        timeSpentSeconds: 0,
      });

      const machine = useCtfStore.getState().machines.find((m) => m.name === 'Ironclad-Target')!;
      expect(machine).toBeDefined();

      // Engage target, update checklist, progress through stages
      store.setActiveTarget(machine.id);
      store.updateMachineStatus(machine.id, 'recon');
      store.setChecklistItemStatus(machine.id, 'port-scan', 'done');
      store.toggleUserFlag(machine.id, 'flag{air_gapped_user_flag}');
      store.toggleRootFlag(machine.id, 'flag{air_gapped_root_flag}');
      store.updateMachineStatus(machine.id, 'completed');

      // Export workspace backup
      const backup = store.exportBackup();
      expect(backup).toBeDefined();

      // Ensure absolutely zero external fetch calls were triggered
      expect(interceptedCalls.length).toBe(0);
    });

    it('ZERO-EGRESS-08: sanitizeExternalUrl validates syntax safely without network lookup or scheme injection', () => {
      // Valid URLs return formatted https string
      expect(sanitizeExternalUrl('https://example.com/target')).toBe('https://example.com/target');
      expect(sanitizeExternalUrl('http://10.10.10.100:8080')).toBe('http://10.10.10.100:8080');
      expect(sanitizeExternalUrl('app.hackthebox.com/machines/Active')).toBe('https://app.hackthebox.com/machines/Active');

      // Malicious or scheme injection URLs return undefined (preventing browser egress / execution)
      expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined();
      expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
      expect(sanitizeExternalUrl('file:///etc/passwd')).toBeUndefined();
      expect(sanitizeExternalUrl('vbscript:msgbox(1)')).toBeUndefined();
      expect(sanitizeExternalUrl('')).toBeUndefined();
      expect(sanitizeExternalUrl(undefined)).toBeUndefined();

      // No network calls made during URL sanitization
      expect(interceptedCalls.length).toBe(0);
    });

    it('ZERO-EGRESS-09: Exported machine writeup HTML enforces offline CSP and forbids remote image tracking', () => {
      const mockMachine: Machine = {
        id: 'test-mach-01',
        name: 'Obsidian-Egress-Test',
        ip: '10.10.10.50',
        os: 'Linux',
        difficulty: 'Medium',
        platform: 'HTB',
        status: 'completed',
        openPorts: [80, 443],
        tags: ['web'],
        certifications: [],
        timeSpentSeconds: 1200,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        writeupMarkdown: `
# Egress Vector Test
Attempting image tracking pixel:
![Tracking Pixel](https://malicious-telemetry.corp/pixel.gif)
![Safe Local Image](./assets/screenshot.png)
![Safe Data URI](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)
        `,
      };

      const html = exportWriteupToHtml(mockMachine, mockMachine.writeupMarkdown || '');

      // 1. Exported HTML must contain offline CSP meta tag
      expect(html).toMatch(/<meta\s+http-equiv=["']Content-Security-Policy["']/i);

      // 2. Disallow remote http/https images in exported HTML
      // Images must be neutralized, or CSP must forbid connect/img egress to remote domains
      const containsRemoteImgTag = /<img[^>]+src=["']https?:\/\//i.test(html);
      if (containsRemoteImgTag) {
        // If rendered, the CSP must strictly block remote origins
        const cspMatch = html.match(/content=["']([^"']+)["']/i);
        expect(cspMatch).not.toBeNull();
        expect(cspMatch![1]).toMatch(/default-src\s+['"]none['"]/i);
      } else {
        // Successfully stripped remote image URL
        expect(html).not.toMatch(/src=["']https:\/\/malicious-telemetry\.corp/i);
      }

      expect(interceptedCalls.length).toBe(0);
    });
  });
});
