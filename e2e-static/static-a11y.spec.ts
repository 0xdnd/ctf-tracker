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
