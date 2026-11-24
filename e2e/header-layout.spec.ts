import { test, expect, type Page } from '@playwright/test';

/**
 * Top bar layout: with the exam clock running AND a target engaged, no two header controls may overlap and none may
 * spill past the viewport, from phone width up. Also checks the Session popover's keyboard contract.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
    localStorage.setItem('zerobox_onboarding_v1', JSON.stringify({ tourDone: true, tipsOff: true }));
    localStorage.setItem('zerobox_backup_v1', JSON.stringify({ lastBackupAt: new Date().toISOString() }));
  });
});

async function startExamAndEngage(page: Page): Promise<void> {
  await page.goto('/exam', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('exam-start-btn').click();
  await expect(page.getByTestId('exam-header-capsule')).toBeVisible();

  await page.getByRole('button', { name: 'Engage target', exact: true }).click();
  const search = page.getByPlaceholder('Search target name or IP...');
  await search.fill('RootMe');
  await search.locator('xpath=..').getByRole('button', { name: /RootMe/ }).first().click();
  const assignIp = page.getByRole('heading', { name: /Assign spawned target IP/i });
  if (await assignIp.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(assignIp).not.toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Switch Active Target' })).toBeVisible();
}

/** Visible header controls whose boxes intersect (neither contains the other), and controls outside the viewport. */
async function headerGeometry(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('[data-testid="app-header"]') as HTMLElement;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const name = (el: Element) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName).trim().slice(0, 30);
    const controls = [...header.querySelectorAll('a[href], button, input, [role="button"]')].filter(visible);
    const overlaps: string[] = [];
    for (let i = 0; i < controls.length; i++) {
      for (let k = i + 1; k < controls.length; k++) {
        const a = controls[i];
        const b = controls[k];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ox > 1 && oy > 1) overlaps.push(`${name(a)} x ${name(b)}`);
      }
    }
    const outside = controls
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < -0.5 || r.right > window.innerWidth + 0.5;
      })
      .map(name);
    const unnamed = controls.filter((el) => !name(el) || name(el) === el.tagName).map((el) => el.outerHTML.slice(0, 80));
    return { overlaps, outside, unnamed, count: controls.length, pageOverflow: document.documentElement.scrollWidth - window.innerWidth };
  });
}

for (const [label, viewport, mobile] of [
  ['375', { width: 375, height: 812 }, true],
  ['768', { width: 768, height: 1024 }, false],
  ['1280', { width: 1280, height: 800 }, false],
] as const) {
  test(`header controls never overlap or spill at ${label}px with the exam running and a target engaged`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
    await context.addInitScript(() => {
      localStorage.setItem('zerobox_onboarding_completed', 'true');
      localStorage.setItem('zerobox_onboarding_v1', JSON.stringify({ tourDone: true, tipsOff: true }));
      localStorage.setItem('zerobox_backup_v1', JSON.stringify({ lastBackupAt: new Date().toISOString() }));
    });
    const page = await context.newPage();
    await startExamAndEngage(page);

    // The exam clock is never hidden.
    await expect(page.getByTestId('exam-header-capsule')).toBeVisible();
    // The target pill keeps a readable (truncated) name beside the clock, not just a chevron.
    const pillName = page.getByTestId('app-header').getByRole('link', { name: /RootMe/ });
    await expect(pillName).toBeVisible();
    expect((await pillName.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(32);
    const geo = await headerGeometry(page);
    expect(geo.overlaps, 'overlapping header controls').toEqual([]);
    expect(geo.outside, 'header controls outside the viewport').toEqual([]);
    expect(geo.unnamed, 'header controls without a name').toEqual([]);
    expect(geo.pageOverflow).toBeLessThanOrEqual(0);
    await context.close();
  });
}

test('Session popover: focus moves in on open, Escape closes and returns focus to the trigger', async ({ page }) => {
  await page.goto('/tracker', { waitUntil: 'domcontentloaded' });
  const trigger = page.getByRole('button', { name: /^Session/ });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Session' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"][aria-label="Session"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
