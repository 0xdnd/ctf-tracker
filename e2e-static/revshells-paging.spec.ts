import { test, expect, type Page } from '@playwright/test';

/**
 * /revshells/ paging (public/revshells-filter.js) on the built static site. Run after a full `npm run build`:
 *   npm run test:a11y:static -- revshells-paging
 */

const items = (page: Page) => page.locator('.rs-item:not([hidden])');
const label = (page: Page) => page.locator('.rs-pager-label').first();

test('pages the list 20 at a time on one URL, with the full list still in the HTML', async ({ page }) => {
  await page.goto('/revshells/');
  await expect(page.locator('.rs-pager')).toHaveCount(2);
  const all = await page.locator('.rs-item').count();
  expect(all).toBeGreaterThan(40);
  expect(await items(page).count()).toBeLessThanOrEqual(25); // 20 shells plus any "Unavailable" entries
  await expect(label(page)).toHaveText(/^Page 1 of \d+$/);
  await page.locator('.rs-pager button', { hasText: 'Next' }).first().click();
  await expect(label(page)).toHaveText(/^Page 2 of \d+$/);
  await expect(page).toHaveURL(/\/revshells\/\?page=2$/);
  await expect(page.locator('#rs-list-head')).toBeFocused();
});

test('a language chip and an outside #hash open the right page and scroll to it', async ({ page }) => {
  await page.goto('/revshells/');
  const last = page.locator('.chips a[href^="#"]').last();
  const target = (await last.getAttribute('href'))!;
  await last.click();
  await expect(page.locator(target)).toBeInViewport();
  await page.goto('/revshells/' + target);
  await expect(page.locator(target)).toBeInViewport();
  await expect(label(page)).not.toHaveText('Page 1 of 1');
});

test('search spans every page and LHOST fills shells on later pages', async ({ page }) => {
  await page.goto('/revshells/');
  await page.fill('#rs-lhost', '10.10.14.5');
  await page.fill('#rs-lport', '9001');
  await page.locator('.rs-pager button', { hasText: 'Next' }).first().click();
  await expect(page.locator('.rs-item:not([hidden]) code', { hasText: '10.10.14.5' }).first()).toBeVisible();
  await page.fill('#rsf-q', 'mkfifo');
  await expect(page).toHaveURL(/\/revshells\/$/);
  await expect(page.locator('.tf-count')).toContainText('of');
});

for (const url of ['/revshells/', '/cheatsheets/active-directory/', '/about/']) {
  test(`Buy me a coffee link on ${url}`, async ({ page }) => {
    await page.goto(url);
    const link = page.locator('footer a[href="https://buymeacoffee.com/0xdnd"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(page.locator('header a[href*="buymeacoffee"]')).toHaveCount(0);
  });
}

test('revshells ends with the thank-you line', async ({ page }) => {
  await page.goto('/revshells/');
  await expect(page.locator('main .coffee-note')).toHaveText('Found this useful? Buy me a coffee.');
});
