import { test, expect, type Page } from '@playwright/test';

/**
 * Search / filter / sort toolbar on the static machine list pages (public/table-filter.js).
 * Runs against the built site served by `vite preview` (localhost only). Run after a full `npm run build`:
 *   npm run test:a11y:static -- table-filter
 */

const PAGES = [
  '/machines/',
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

const rows = (page: Page) => page.locator('table.list tbody tr');
const visibleRows = (page: Page) => page.locator('table.list tbody tr:not([hidden])');
const countLine = (page: Page) => page.locator('.tf-count');
const names = (page: Page) => page.locator('table.list tbody tr:not([hidden]) td:first-child').allInnerTexts();

async function open(page: Page, url: string) {
  const problems: string[] = [];
  // Only localhost is reached: the pages' own analytics beacon is aborted, and its failure is not a finding about the toolbar.
  const external = (u: string) => !/^http:\/\/localhost[:/]/.test(u);
  await page.route('**/*', (route) => (external(route.request().url()) ? route.abort() : route.continue()));
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !/cloudflareinsights|Failed to load resource: net::ERR_FAILED/.test(m.text())) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('requestfailed', (r) => {
    if (external(r.url())) return;
    problems.push(`requestfailed: ${r.url()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI));
  });
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(url, { waitUntil: 'load' });
  await expect(page.locator('.tf')).toHaveCount(1);
  return { problems, requests };
}

for (const url of PAGES) {
  test(`toolbar on ${url}: Y equals the row count, controls are labelled, nothing is logged`, async ({ page }) => {
    const { problems } = await open(page, url);
    const total = await rows(page).count();
    await expect(countLine(page)).toHaveText(`Showing ${total} of ${total} machines`);
    for (const label of ['Search', 'OS', 'Sort']) await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    expect(problems).toEqual([]);
  });
}

test('/machines/: search, filters, sort, empty state and reset', async ({ page }) => {
  const { problems, requests } = await open(page, '/machines/');
  const url0 = page.url();
  const loaded = requests.length;
  const total = await rows(page).count();
  expect(total).toBeGreaterThan(1000);

  await page.getByLabel('Search', { exact: true }).fill('LAME');
  await expect(countLine(page)).not.toHaveText(`Showing ${total} of ${total} machines`);
  await expect(countLine(page)).toHaveText(new RegExp(`^Showing [1-9]\\d* of ${total} machines$`));
  const n = await visibleRows(page).count();
  expect(n).toBeLessThan(total);
  expect((await names(page)).some((t) => /^lame$/i.test(t.trim()))).toBe(true);

  await page.getByLabel('Search', { exact: true }).fill('');
  await expect(countLine(page)).toHaveText(`Showing ${total} of ${total} machines`);
  const first = (await names(page))[0];

  await page.getByLabel('Platform').selectOption('THM');
  const thm = await visibleRows(page).count();
  expect(thm).toBeGreaterThan(0);
  expect(thm).toBeLessThan(total);
  await expect(page.locator('#htb')).toBeHidden();
  await expect(page.locator('a[href="#htb"]')).toBeHidden();
  await expect(page.locator('a[href="#thm"]')).toBeVisible();

  await page.getByLabel('OS', { exact: true }).selectOption('Windows');
  const win = await visibleRows(page).count();
  expect(win).toBeLessThan(thm);

  const firstWin = (await names(page))[0];
  await page.getByLabel('Sort').selectOption('name-desc');
  expect((await names(page))[0]).not.toBe(firstWin);
  expect(await rows(page).count()).toBe(total);

  await page.getByLabel('Search', { exact: true }).fill('zzzzzz-no-such-machine');
  await expect(countLine(page)).toHaveText(`Showing 0 of ${total} machines`);
  await expect(page.getByText('No machines match')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(countLine(page)).toHaveText(`Showing ${total} of ${total} machines`);
  await expect(page.getByLabel('Search', { exact: true })).toBeFocused();

  await page.getByLabel('Platform').selectOption('THM');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(countLine(page)).toHaveText(`Showing ${total} of ${total} machines`);
  expect(await page.locator('main [hidden]:not(.tf-empty)').count()).toBe(0);
  expect((await names(page))[0]).toBe(first);

  expect(page.url()).toBe(url0);
  expect(problems).toEqual([]);
  expect(requests.slice(loaded).filter((r) => !/cloudflareinsights/.test(r)), 'no requests after load').toEqual([]);
});

test('/oscp-like-machines/: tag filter, empty state and sort inside the difficulty tables', async ({ page }) => {
  const { problems } = await open(page, '/oscp-like-machines/');
  const total = await rows(page).count();
  const sections = await page.locator('table.list').count();
  expect(sections).toBeGreaterThan(1);
  await expect(page.getByLabel('Sort').locator('option')).toHaveText(['Default order', 'Name A-Z', 'Name Z-A']);

  await page.getByLabel('Tag').selectOption({ index: 1 });
  const byTag = await visibleRows(page).count();
  expect(byTag).toBeGreaterThan(0);
  expect(byTag).toBeLessThan(total);
  await page.getByRole('button', { name: 'Reset' }).click();

  await page.getByLabel('Search', { exact: true }).fill('windows-no-such');
  await expect(page.getByText('No machines match')).toBeVisible();
  await expect(page.locator('table.list:not([hidden])')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('table.list:not([hidden])')).toHaveCount(sections);

  const sourceOrder = await names(page);
  await page.getByLabel('Sort').selectOption('name-asc');
  const sorted = await names(page);
  expect(sorted).not.toEqual(sourceOrder);
  expect([...sorted].sort()).toEqual([...sourceOrder].sort());
  await page.getByLabel('Sort').selectOption('');
  expect(await names(page)).toEqual(sourceOrder);
  expect(problems).toEqual([]);
});

test('at 375px the pages do not scroll sideways and the toolbar fits', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of ['/machines/', '/oscp-like-machines/']) {
    await open(page, url);
    const w = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(w.scroll, url).toBeLessThanOrEqual(w.client);
    const box = await page.locator('.tf').boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const url of ['/machines/', '/oscp-like-machines/']) {
    test(`${url} shows the full table and no toolbar`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'load' });
      await expect(page.locator('.tf')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);
      expect(await rows(page).count()).toBeGreaterThan(20);
      expect(await page.locator('table.list [hidden]').count()).toBe(0);
    });
  }
});

test('other pages do not load the script', async ({ request }) => {
  for (const url of ['/', '/techniques/', '/techniques/active-directory/', '/machines/htb-archetype/', '/tj-null-list/']) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(await res.text(), url).not.toContain('table-filter.js');
  }
});
