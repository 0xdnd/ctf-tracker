import { test, expect, type Page } from '@playwright/test';

/**
 * First-run tour: the short list (welcome, sidebar, machine, import, final) with the paste importer as a
 * hands-on step. Only the backup reminder is seeded away; the onboarding keys are left unset so the tour
 * starts as it does for a real first visit.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox_backup_v1', JSON.stringify({ lastBackupAt: new Date().toISOString() }));
  });
});

const IMPORT_TITLE = "Import what you've solved";
const card = (page: Page) => page.getByTestId('tour-card');

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** From the welcome card to the import step, pressing Next on each step in between. */
async function walkToImport(page: Page): Promise<void> {
  await expect(page.getByRole('dialog', { name: 'Welcome to ZeroBox' })).toBeVisible({ timeout: 30_000 });
  await card(page).getByRole('button', { name: 'Start tour' }).click();
  for (let i = 0; i < 4; i += 1) {
    const heading = card(page).getByRole('heading', { name: IMPORT_TITLE });
    if (await heading.isVisible()) return;
    await card(page).getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(card(page).getByRole('heading', { name: IMPORT_TITLE })).toBeVisible();
}

/** Waits until the import step is hands-on: the card is a region and the panel's text box has focus. */
async function expectImportHandsOn(page: Page) {
  const panel = page.getByTestId('paste-import-panel');
  await expect(panel).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('region', { name: IMPORT_TITLE })).toBeVisible();
  const textbox = panel.getByLabel(/Box names/);
  await expect(textbox).toBeFocused();
  return { panel, textbox };
}

test('desktop: import on the hands-on step, then the last card, and the tour stays done', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/tracker');
  await walkToImport(page);
  const { panel } = await expectImportHandsOn(page);
  await expect(card(page).getByRole('button', { name: 'Open the importer' })).toHaveCount(0);

  await page.keyboard.type('Lame, Forest');
  await panel.getByRole('button', { name: /^Apply: 2 new/ }).click();

  const toast = page.getByText(/boxes? marked solved/).first();
  await expect(toast).toBeVisible();
  // The toast sits above the tour's dim, so it is what a point at its centre hits.
  const onTop = await toast.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
  });
  expect(onTop).toBe(true);

  const last = page.getByRole('dialog', { name: "You're set" });
  await expect(last).toBeVisible();
  await expect(last.getByRole('button', { name: 'Done' })).toBeFocused();
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(1);
  await expect(panel).toHaveCount(0);

  await last.getByRole('button', { name: 'Done' }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('view-kanban').first()).toBeVisible({ timeout: 30_000 });
  await expect(card(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Skip on the welcome card is remembered after a reload', async ({ page }) => {
  await page.goto('/#/tracker');
  const welcome = page.getByRole('dialog', { name: 'Welcome to ZeroBox' });
  await expect(welcome).toBeVisible({ timeout: 30_000 });
  await welcome.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('view-kanban').first()).toBeVisible({ timeout: 30_000 });
  await expect(card(page)).toHaveCount(0);
});

test('phone: the import step is a plain card, and Open the importer shows the panel uncovered', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/tracker');
  await walkToImport(page);
  const dialog = page.getByRole('dialog', { name: IMPORT_TITLE });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('region', { name: IMPORT_TITLE })).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Open the importer' }).click();
  await expect(card(page)).toHaveCount(0);
  await expect(page).toHaveURL(/import=1/);
  const panel = page.getByTestId('paste-import-panel');
  await expect(panel).toBeVisible();
  const textbox = panel.getByLabel(/Box names/);
  await textbox.scrollIntoViewIfNeeded();
  const uncovered = await textbox.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && !!el.closest('[data-testid="paste-import-panel"]')?.contains(hit);
  });
  expect(uncovered).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the example preview on the import step writes nothing', async ({ page }) => {
  await page.goto('/#/tracker');
  await walkToImport(page);
  const { panel, textbox } = await expectImportHandsOn(page);

  await panel.getByRole('button', { name: 'Preview with an example' }).click();
  await expect(panel.getByText('This is an example. Paste your own list to import.')).toBeVisible();
  await expect(textbox).toHaveAttribute('readonly', '');
  const apply = panel.getByRole('button', { name: /Preview only/ });
  await expect(apply).toBeDisabled();
  await expect(page.getByText(/boxes? marked solved/)).toHaveCount(0);

  await panel.getByRole('button', { name: 'Back to my list' }).click();
  await expect(textbox).toHaveValue('');
  await expect(textbox).toBeFocused();
  // Still on the import step: the preview did not count as an import.
  await expect(page.getByRole('region', { name: IMPORT_TITLE })).toBeVisible();
  await expect(page.getByText(/boxes? marked solved/)).toHaveCount(0);
});

test('replaying from the command palette runs the full tour', async ({ page }) => {
  await page.goto('/#/tracker');
  const welcome = page.getByRole('dialog', { name: 'Welcome to ZeroBox' });
  await expect(welcome).toBeVisible({ timeout: 30_000 });
  await welcome.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(card(page)).toHaveCount(0);

  await page.keyboard.press('Control+k');
  const search = page.getByLabel('Command palette search input');
  await expect(search).toBeVisible();
  await search.fill('replay');
  await page.keyboard.press('Enter');

  const replay = page.getByRole('dialog', { name: 'Welcome to ZeroBox' });
  await expect(replay).toBeVisible();
  await replay.getByRole('button', { name: 'Start tour' }).click();
  await expect(card(page)).toContainText('2/8');
});

test('1280x720: with a long list typed, the text box and Apply can both be clicked', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#/tracker');
  await walkToImport(page);
  const { panel, textbox } = await expectImportHandsOn(page);

  await page.keyboard.type('Lame, Forest, Sauna, Shocker, Blue, Jerry, Legacy, Devel');
  await expect(panel.getByRole('list', { name: 'Matched boxes' }).getByRole('listitem')).toHaveCount(8);
  // Let the spotlight follow the panel as it grew.
  await page.waitForTimeout(800);

  // No force: Playwright's hit test fails if the card or a shield covers either control.
  await textbox.click();
  await panel.getByRole('button', { name: /^Apply: \d+ new/ }).click();
  await expect(page.getByRole('dialog', { name: "You're set" })).toBeVisible();
});
