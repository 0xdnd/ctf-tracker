import { test, expect } from '@playwright/test';

/**
 * Paged machines list: /machines/ is page 1, /machines/page/<n>/ the rest, /machines/all/ holds every row with the filters.
 * Runs against the built site served by `vite preview`. Run after a full `npm run build`:
 *   npm run test:a11y:static -- machines-pages
 */

const PER_PAGE = 100;
const rowsIn = (html: string) => (html.match(/<tr data-name=/g) || []).length;

test('the pages split every row of /machines/all/ into pages of 100, with a pager', async ({ request }) => {
  const all = await request.get('/machines/all/');
  expect(all.status()).toBe(200);
  const allHtml = await all.text();
  const total = rowsIn(allHtml);
  expect(total).toBeGreaterThan(1000);
  expect(allHtml).toContain('<meta name="robots" content="noindex,follow" />');

  const pageCount = Math.ceil(total / PER_PAGE);
  let seen = 0;
  for (let n = 1; n <= pageCount; n++) {
    const url = n === 1 ? '/machines/' : `/machines/page/${n}/`;
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    const html = await res.text();
    const rows = rowsIn(html);
    expect(rows, url).toBe(n < pageCount ? PER_PAGE : total - PER_PAGE * (pageCount - 1));
    seen += rows;
    expect(html, url).toContain('aria-label="Machine list pages"');
    expect(html, url).toContain(`<span aria-current="page">${n}</span>`);
    expect(html, url).toContain(`<link rel="canonical" href="https://ctftracker.com${url}" />`);
    expect(html, url).not.toContain('noindex');
    expect(html, url).not.toContain('table-filter.js');
    expect(html, url).toContain('action="/machines/all/"');
  }
  expect(seen).toBe(total);
  expect((await request.get(`/machines/page/${pageCount + 1}/`)).status()).not.toBe(200);
});

test('page 1 links every owner page and carries the ItemList', async ({ request }) => {
  const html = await (await request.get('/machines/')).text();
  expect(html).toContain('id="solved"');
  expect(html).toContain('"@type":"ItemList"');
  expect(html).toContain('href="/machines/htb-blue/"');
});

test('old /machines/?tag= and ?q= links land on the filtered full list, carrying only tag and q', async ({ page }) => {
  await page.route('**/*', (route) => (/^http:\/\/localhost[:/]/.test(route.request().url()) ? route.continue() : route.abort()));
  await page.goto('/machines/?tag=SMB&evil=1#x', { waitUntil: 'load' });
  await expect(page).toHaveURL(/\/machines\/all\/\?tag=SMB$/);
  await expect(page.locator('.tf-count')).toHaveText(/^Showing [1-9]\d* of \d+ machines$/);
  await page.goto('/machines/?q=lame', { waitUntil: 'load' });
  await expect(page).toHaveURL(/\/machines\/all\/\?q=lame$/);
  await expect(page.getByLabel('Search', { exact: true })).toHaveValue('lame');
});

test('the search form on a paged page searches the full list', async ({ page }) => {
  await page.route('**/*', (route) => (/^http:\/\/localhost[:/]/.test(route.request().url()) ? route.continue() : route.abort()));
  await page.goto('/machines/page/3/', { waitUntil: 'load' });
  await page.getByLabel(/^Search all [\d,]+ machines$/).fill('blue');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/machines\/all\/\?q=blue$/);
  await expect(page.locator('.tf-count')).toHaveText(/^Showing [1-9]\d* of \d+ machines$/);
});

test('at 375px the paged pages do not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const url of ['/machines/', '/machines/page/7/', '/machines/page/14/']) {
    await page.goto(url, { waitUntil: 'load' });
    const w = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(w.scroll, url).toBeLessThanOrEqual(w.client);
  }
});
