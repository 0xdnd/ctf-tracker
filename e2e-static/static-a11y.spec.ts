import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Accessibility scan (axe-core) of a representative sample of the generated static pages in dist/.
 * Fails on serious/critical violations only. Run after a full `npm run build`:
 *   npm run test:a11y:static
 */

const PAGES = [
  '/',
  '/machines/htb-archetype/',
  '/techniques/active-directory/',
  '/tj-null-list/',
  '/oscp-exam-scoring-and-time-budget/',
  '/oscp-points-calculator/',
  '/oscp-exam-simulator/',
  // Machine list pages with the search/filter/sort toolbar (public/table-filter.js).
  '/machines/',
  '/machines/page/2/',
  '/machines/all/',
  '/oscp-like-machines/',
  '/active-directory-machines/',
  '/cwee-like-machines/',
  '/cpts-like-machines/',
  '/ippsec-cpts-machines/',
  '/osep-like-machines/',
  '/oswe-like-machines/',
  '/htb-starting-point-machines/',
  '/crto-like-machines/',
];

const axeSource = fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'), 'utf8');

type AxeViolation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: unknown[] }[];
};

for (const url of PAGES) {
  test(`axe: no serious/critical violations on ${url}`, async ({ page }) => {
    const response = await page.goto(url, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    // Let entrance fades finish (time-based animations only; scroll-driven ones never finish), or axe measures half-faded text.
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline instanceof DocumentTimeline).map((a) => a.finished.catch(() => undefined))));

    // page.evaluate bypasses the page CSP, unlike addScriptTag.
    await page.evaluate(axeSource);
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: AxeViolation[] }> } }).axe;
      const result = await axe.run(document, { resultTypes: ['violations'] });
      return result.violations;
    });

    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const summary = blocking.map(
      (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
    );
    expect(summary, `serious/critical axe violations on ${url}`).toEqual([]);
  });
}

test('axe (light mode + dynamic bridges): no serious/critical violations on /, /techniques/active-directory/, and /oscp-like-machines/', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox-theme-mode', 'light');
    localStorage.setItem('zb-site-theme', 'light');
    localStorage.setItem(
      'zerobox-tactical-store',
      JSON.stringify({
        state: {
          currentProfileId: 'guest',
          globalVars: { targetIp: '10.10.11.24', lhost: '10.10.14.5', lport: '4444', domain: 'corp.local' },
        },
      }),
    );
    localStorage.setItem(
      'zerobox_operator_profile_guest',
      JSON.stringify({
        machines: [
          { id: 'htb-archetype', name: 'Archetype', platform: 'HTB', status: 'completed' },
          { id: 'htb-active', name: 'Active', platform: 'HTB', status: 'root' },
        ],
      }),
    );
  });

  for (const url of ['/', '/techniques/active-directory/', '/oscp-like-machines/']) {
    const response = await page.goto(url, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    if (url === '/techniques/active-directory/') {
      await expect(page.locator('#zb-vars-bar')).toBeVisible();
    }
    if (url === '/oscp-like-machines/') {
      await expect(page.locator('.lp-summary')).toBeVisible();
      expect(await page.locator('tr[data-local-solved="true"]').count()).toBeGreaterThan(0);
    }

    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.timeline instanceof DocumentTimeline)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    await page.evaluate(axeSource);
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: AxeViolation[] }> } }).axe;
      const result = await axe.run(document, { resultTypes: ['violations'] });
      return result.violations;
    });
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const summary = blocking.map(
      (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
    );
    expect(summary, `light-mode serious/critical axe violations on ${url}`).toEqual([]);
  }
});
