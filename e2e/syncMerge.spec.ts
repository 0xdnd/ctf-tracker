import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

/**
 * Sync file round trip: export an encrypted sync file, change the same machine "on another device" (wiped
 * storage), then merge the file back. The edit on both sides is a conflict; nothing changes until it is
 * resolved, and the pre-sync snapshot shows up in the restore list.
 */

const DB_NAMES = ['zerobox_vault_db', 'zerobox_deep_storage_db', 'zerobox_resilient_store_v1'];
const PASSPHRASE = 'sync e2e passphrase 2026';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
  });
});

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
          })
      )
    );
  }, DB_NAMES);
}

const openBackup = async (page: Page) => {
  await page.getByRole('button', { name: 'Settings and options' }).click();
  await page.getByRole('button', { name: /Backup & Vault Manager/ }).click();
};

test('export a sync file, change data, then merge it back', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const notes = () => page.getByLabel('Tactical field notes');
  const original = `sync-original-${Date.now()}`;
  const changed = `sync-changed-${Date.now()}`;

  await page.goto('/#/target/thm-rootme');
  await page.getByTestId('tab-flags').click();
  await notes().fill(original);

  await openBackup(page);
  await page.getByRole('button', { name: 'Export sync file' }).click(); // turns on encryption first
  await page.getByLabel('Export passphrase', { exact: true }).fill(PASSPHRASE);
  await page.getByLabel('Confirm export passphrase').fill(PASSPHRASE);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sync file' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^zerobox_sync_/);
  const syncPath = testInfo.outputPath('sync.json');
  await download.saveAs(syncPath);
  const fileText = fs.readFileSync(syncPath, 'utf8');
  expect(fileText).toContain('zerobox-backup-encrypted');
  expect(fileText).not.toContain(original);

  // "Another device": fresh storage, and a different note on the same machine.
  await wipeStorage(page);
  await page.goto('/#/target/thm-rootme');
  await page.getByTestId('tab-flags').click();
  await notes().fill(changed);
  await page.waitForTimeout(500);

  await openBackup(page);
  await page.getByLabel('Upload JSON backup file').setInputFiles(syncPath);
  await page.getByLabel('Backup passphrase').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Decrypt and merge' }).click();

  const review = page.getByRole('region', { name: /changed on both devices/ });
  await expect(review).toBeVisible({ timeout: 30_000 });
  await expect(review.getByRole('button', { name: 'Apply merge' })).toBeDisabled();
  await review.getByRole('radio', { name: 'Keep incoming' }).first().check();
  await review.getByRole('button', { name: 'Apply merge' }).click();

  await expect(page.getByText('Merge complete')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/A pre-sync snapshot was saved/)).toBeVisible();
  await expect(page.getByText('Before sync merge')).toBeVisible();

  await page.getByRole('button', { name: 'Close backup modal' }).click();
  await expect(notes()).toHaveValue(original);
  expect(errors).toEqual([]);
});
