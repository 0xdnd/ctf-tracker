import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * ZeroBox smoke suite. Fast, deterministic checks of the four flows that must
 * never break. Every test gets a fresh browser context (clean storage); the
 * onboarding flag is seeded so the first-run modal does not intercept clicks.
 */

const DB_NAMES = ['zerobox_vault_db', 'zerobox_deep_storage_db', 'zerobox_resilient_store_v1'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
  });
});

/** Collects console errors and uncaught exceptions for the page lifetime. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
      errors.push(`[console] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

/**
 * Clears localStorage and every ZeroBox IndexedDB. The app flushes its state on
 * beforeunload, so we first navigate to a static same-origin document (no app
 * running) and wipe from there; otherwise the flush would rewrite the data.
 */
async function wipeStorage(page: Page): Promise<void> {
  await page.goto('/favicon-b64.txt');
  await page.evaluate(async (names) => {
    localStorage.clear();
    sessionStorage.clear();
    await Promise.all(
      names.map(
        (name) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          }),
      ),
    );
  }, DB_NAMES);
}

test('tracker board renders cards and the view switcher works', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/tracker');

  await page.getByTestId('view-kanban').click();
  await expect(page.getByTestId('view-kanban')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('kanban-card').first()).toBeVisible();

  await page.getByTestId('view-table').click();
  await expect(page.getByTestId('view-table')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('table').first()).toBeVisible();

  await page.getByTestId('view-graph').click();
  await expect(page.getByTestId('view-graph')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('canvas-nav-toolbar')).toBeVisible();
  await expect(page.locator('canvas, [data-testid="graph-viewport-svg"]').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('exam simulator starts and the timer ticks', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/exam');

  await page.getByTestId('exam-start-btn').click();
  const timer = page.getByTestId('exam-countdown-timer');
  await expect(timer).toBeVisible();

  const first = (await timer.textContent())?.trim();
  await expect.poll(async () => (await timer.textContent())?.trim(), { timeout: 8000 }).not.toBe(first);

  expect(errors).toEqual([]);
});

test('vault loads and a logged entry survives a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/vault');
  await expect(page.getByTestId('evidence-vault-page')).toBeVisible();

  await page.getByTestId('page-header').getByRole('button', { name: 'Log evidence' }).click();
  const dialog = page.getByRole('dialog', { name: 'Log new evidence' });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('e.g. Administrator, root').fill('smoke-admin');
  await dialog.getByPlaceholder('Paste password, hash string, or SSH private key...').fill('Sm0ke-P@ss-12345');
  await dialog.getByRole('button', { name: 'Save to Vault' }).click();
  await expect(dialog).toBeHidden();

  const entry = page.getByText('smoke-admin').first();
  await expect(entry).toBeVisible();

  // Give async persistence (IndexedDB) a moment to flush, then reload.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByText('smoke-admin').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('backup export then import restores a machine note', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  const note = `smoke-note-${Date.now()}`;
  const notes = () => page.getByLabel('Tactical field notes');

  await page.goto('/#/target/thm-rootme');
  await page.getByTestId('tab-flags').click();
  await notes().fill(note);
  await expect(notes()).toHaveValue(note);

  // Export through the Backup modal and capture the download.
  await page.getByRole('button', { name: 'Settings and options' }).click();
  await page.getByRole('button', { name: /Backup & Vault Manager/ }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath('backup.json');
  await download.saveAs(backupPath);
  expect(fs.readFileSync(backupPath, 'utf8')).toContain(note);

  // Wipe everything and prove the note is gone.
  await wipeStorage(page);
  await page.goto('/#/target/thm-rootme');
  await page.getByTestId('tab-flags').click();
  await expect(notes()).toHaveValue('');

  // Import the exported file.
  await page.getByRole('button', { name: 'Settings and options' }).click();
  await page.getByRole('button', { name: /Backup & Vault Manager/ }).click();
  await page.getByLabel('Upload JSON backup file').setInputFiles(backupPath);
  await expect(page.getByLabel('Paste JSON backup content')).not.toHaveValue('');
  // Merge is the default import mode; this flow covers the full Replace restore.
  await page.getByRole('radio', { name: 'Replace' }).check();
  await page.getByRole('button', { name: 'Import and apply' }).click();

  await expect(notes()).toHaveValue(note);
  expect(errors).toEqual([]);
});
