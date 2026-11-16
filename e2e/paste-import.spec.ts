import { test, expect } from '@playwright/test';

/**
 * Paste-import from the empty tracker: a visitor with nothing solved pastes a list, reviews it,
 * applies, and stays on the tracker with a populated board. Seeds follow smoke.spec.ts so the
 * first-run tour and backup reminder stay out of the way.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
    localStorage.setItem('zerobox_onboarding_v1', JSON.stringify({ tipsOff: true }));
    localStorage.setItem('zerobox_backup_v1', JSON.stringify({ lastBackupAt: new Date().toISOString() }));
  });
});

test('paste a list on the empty tracker, apply, and see the board populated', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/#/tracker');
  const banner = page.getByTestId('import-banner');
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await banner.getByRole('button', { name: 'Import', exact: true }).click();
  const panel = page.getByTestId('paste-import-panel');
  await expect(panel).toBeVisible();

  await panel.getByLabel(/Box names/).fill('Lame, Forest, Sauna');
  await expect(panel.getByRole('list', { name: 'Matched boxes' }).getByRole('listitem').first()).toBeVisible();
  // Nothing changed yet: the panel is still offering the import.
  const apply = panel.getByRole('button', { name: /^Apply: \d+ new, \d+ already solved, \d+ unmatched$/ });
  await expect(apply).toBeEnabled();
  await apply.click();

  await expect(page.getByText(/boxes? marked solved/).first()).toBeVisible();
  await expect(page.getByText(/Progress: \d+ of \d+ solved\./).first()).toBeVisible();
  await expect(page).toHaveURL(/\/tracker/);
  await expect(panel).toHaveCount(0);

  // The board now holds the imported boxes: filter to the solved ones and find Lame there.
  await page.getByTestId('view-table').click();
  await page.getByRole('button', { name: 'Pwned', exact: true }).click();
  await expect(page.getByRole('table').first()).toContainText('Lame');
  expect(errors).toEqual([]);
});

test('the example preview marks nothing solved', async ({ page }) => {
  await page.goto('/#/tracker');
  const banner = page.getByTestId('import-banner');
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await banner.getByRole('button', { name: 'Import', exact: true }).click();
  const panel = page.getByTestId('paste-import-panel');
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: 'Preview with an example' }).click();
  await expect(panel.getByRole('list', { name: 'Matched boxes' }).getByRole('listitem').first()).toBeVisible();
  const apply = panel.getByRole('button', { name: /Preview only/ });
  await expect(apply).toBeDisabled();
  await expect(page.getByText(/boxes? marked solved/)).toHaveCount(0);

  // The board has no solved boxes: the Pwned filter shows none of the example names.
  await page.getByTestId('view-table').click();
  await page.getByRole('button', { name: 'Pwned', exact: true }).click();
  await expect(page.locator('table', { hasText: 'Lame' })).toHaveCount(0);
  await expect(panel).toBeVisible();
});

test('the importer fits a 375px phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/tracker');
  const banner = page.getByTestId('import-banner');
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await banner.getByRole('button', { name: 'Import', exact: true }).click();
  const panel = page.getByTestId('paste-import-panel');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Preview with an example' }).click();
  await expect(panel.getByRole('button', { name: /Preview only/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a cold phone load shows the one-row banner with a full machine card above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/tracker');
  const banner = page.getByTestId('import-banner');
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('paste-import-panel')).toHaveCount(0);
  const card = page.locator('.cyber-card-contain').first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  // The phone's fixed bottom nav covers the last pixels of the screen: the card must end above it.
  const navTop = await page.getByTestId('app-mobile-nav').evaluate((el) => el.getBoundingClientRect().top);
  expect(box!.y + box!.height).toBeLessThanOrEqual(navTop);
});

test('Skip folds the importer away, and a ?import=1 link does not bring it back', async ({ page }) => {
  await page.goto('/#/tracker?import=1');
  const panel = page.getByTestId('paste-import-panel');
  await expect(panel).toBeVisible({ timeout: 30_000 });

  // A ?import=1 link opens the form straight away, with the banner step skipped.
  await expect(page.getByTestId('import-banner')).toHaveCount(0);
  await expect(panel.getByLabel(/Box names/)).toBeVisible();
  await panel.getByRole('button', { name: /Skip, I'm starting fresh/ }).click();
  await expect(panel).toHaveCount(0);
  await expect(page).not.toHaveURL(/import=1/);
  await expect(page.getByTestId('view-table')).toBeVisible();
});
