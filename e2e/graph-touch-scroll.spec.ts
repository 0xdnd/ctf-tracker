import { test, expect, type CDPSession, type Page } from '@playwright/test';

/**
 * Touch phones: a one-finger vertical swipe anywhere over the attack graph must scroll the page.
 * Real CDP touch events go through the compositor, so touch-action CSS and non-passive touch
 * listeners are exercised. The minimap (touch-none, bottom-left) used to trap these swipes.
 */

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('zerobox_onboarding_completed', 'true');
    localStorage.setItem('zerobox_onboarding_v1', JSON.stringify({ tipsOff: true }));
    localStorage.setItem('zerobox_backup_v1', JSON.stringify({ lastBackupAt: new Date().toISOString() }));
  });
});

async function swipe(cdp: CDPSession, x: number, y: number, dy: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: Math.round(y + (dy * i) / steps), id: 1 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** The app scrolls inside <main>, not the window. */
const scrollPos = (page: Page) =>
  page.evaluate(() => (document.querySelector('main')?.scrollTop ?? 0) + window.scrollY);

test('one-finger swipes over the graph scroll the page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch events are Chromium-only');
  test.setTimeout(90_000);
  await page.goto('/#/tracker');
  expect(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)).toBe(true);

  // Phones get the compact toolbar without a graph button; the graph is still reachable through a
  // remembered view mode (or a tablet-width toolbar), so switch views through the hidden control.
  // Wait for the first-mount phone default (grid) to settle before switching.
  await expect(page.getByTestId('view-grid-mobile')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('view-graph').dispatchEvent('click');
  await expect(page.getByTestId('view-graph')).toHaveAttribute('aria-pressed', 'true');
  const svg = page.locator('[data-testid="graph-viewport-svg"]');
  // The graph chunk is large; a cold dev server can take a while to serve it.
  await expect(svg).toBeVisible({ timeout: 45_000 });

  const cdp = await page.context().newCDPSession(page);
  // Little content sits below the graph, so scroll <main> to its end (graph bottom on screen) and
  // swipe the finger downward: the page should scroll back up.
  const placeGraph = async () => {
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = main.scrollHeight;
    });
    await page.waitForTimeout(150);
  };

  // 1) Bottom-left corner, where the open minimap used to swallow the swipe.
  await placeGraph();
  let box = await svg.boundingBox();
  if (!box) throw new Error('graph has no box');
  let before = await scrollPos(page);
  await swipe(cdp, Math.round(box.x + 100), Math.round(box.y + box.height - 150), 150);
  await page.waitForTimeout(250);
  expect(before - (await scrollPos(page))).toBeGreaterThan(60);

  // 2) Control: bare canvas in the middle of the graph.
  await placeGraph();
  box = await svg.boundingBox();
  if (!box) throw new Error('graph has no box');
  before = await scrollPos(page);
  await swipe(cdp, Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2), 150);
  await page.waitForTimeout(250);
  expect(before - (await scrollPos(page))).toBeGreaterThan(60);

  // Touch screens start with the minimap closed; it stays one tap away.
  await expect(page.getByTestId('graph-minimap-container')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show minimap' })).toBeVisible();
});
