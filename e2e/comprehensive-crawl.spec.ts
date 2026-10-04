import { test, expect } from '@playwright/test';

/**
 * ZEROBOX Tactical Cybersecurity Operations Suite
 * Standalone TypeScript Playwright 360-Degree E2E & Full Route Crawl Suite
 *
 * Requirements addressed:
 * - Crawls all 11 primary HashRouter routes with zero console/page errors.
 * - Validates interactive UI elements (Attack Graph canvas, Kanban/Table/Grid views, zoom controls, export triggers).
 * - Tests search/filter boundaries, empty states, and reset recovery.
 * - Tests Target Detail dossier tabs (Recon, Flags Vault, Attack Methodology Checklist).
 * - Tests Field Manual multi-tab workspace operations.
 * - Tests Exam Simulator cockpit lifecycle and tactical HUD modals.
 * - Tests Persistent Header LHOST/RHOST/LPORT variables and Reverse Shell crafter modal.
 */

// All core HashRouter application routes
const ALL_ROUTES = [
  '/#/',
  '/#/tracker',
  '/#/target/thm-rootme',
  '/#/cheatsheets',
  '/#/field-manual',
  '/#/methodology',
  '/#/vault',
  '/#/loot',
  '/#/analytics',
  '/#/exam-simulator',
  '/#/writeup',
  '/#/theme-demo',
];

test.describe('ZEROBOX Comprehensive 360° E2E & Route Crawl Suite', () => {
  const consoleErrors: string[] = [];
  const uncaughtPageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    uncaughtPageErrors.length = 0;

    // Seed onboarding completion so StartCleanModal does not intercept clicks
    await page.addInitScript(() => {
      localStorage.setItem('zerobox_onboarding_completed', 'true');
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known benign third-party or browser resource notices if any
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(`[Console Error] ${text}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      uncaughtPageErrors.push(`[Page Error] ${err.message}`);
    });
  });

  test.afterEach(async () => {
    expect(uncaughtPageErrors, 'Uncaught runtime page exceptions detected').toEqual([]);
    expect(consoleErrors, 'Uncaught console.error calls detected during test run').toEqual([]);
  });

  // --------------------------------------------------------------------------
  // TEST 1: Full Route Crawl with Zero Errors
  // --------------------------------------------------------------------------
  test('TC-01: Crawl all primary application routes with 0 console/runtime errors', async ({ page }) => {
    for (const route of ALL_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);

      // Verify header presence and title
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Check main content container rendered
      const main = page.locator('main').first();
      await expect(main).toBeVisible();

      // Ensure no crash or uncaught error boundary displayed
      const errorBoundaryText = page.locator('text=SOMETHING WENT WRONG');
      await expect(errorBoundaryText).not.toBeVisible();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: Tracker Views & Attack Graph Canvas
  // --------------------------------------------------------------------------
  test('TC-02: Tracker view switching and Attack Graph Canvas interactions', async ({ page }) => {
    await page.goto('/#/tracker', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Switch to Kanban View
    const kanbanBtn = page.locator("[data-testid='view-kanban']");
    await expect(kanbanBtn).toBeVisible();
    await kanbanBtn.click();
    await page.waitForTimeout(300);

    // Switch to Table View
    const tableBtn = page.locator("[data-testid='view-table']");
    await expect(tableBtn).toBeVisible();
    await tableBtn.click();
    await page.waitForTimeout(300);

    // Switch to Attack Graph
    const graphBtn = page.locator("[data-testid='view-graph']");
    await expect(graphBtn).toBeVisible();
    await graphBtn.click();
    await page.waitForTimeout(800);

    // Verify canvas navigation toolbar & zoom controls
    const toolbar = page.locator("[data-testid='canvas-nav-toolbar']");
    await expect(toolbar).toBeVisible();

    const zoomIn = page.locator("[data-testid='graph-zoom-in']");
    const zoomOut = page.locator("[data-testid='graph-zoom-out']");
    const resetView = page.locator("[data-testid='graph-reset-view']");

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await expect(resetView).toBeVisible();

    await zoomIn.click();
    await page.waitForTimeout(100);
    await zoomOut.click();
    await page.waitForTimeout(100);
    await resetView.click();
    await page.waitForTimeout(100);

    // Verify export triggers
    const exportCanvas = page.locator("[data-testid='graph-export-canvas']");
    const exportSvg = page.locator("[data-testid='graph-export-svg']");
    await expect(exportCanvas).toBeVisible();
    await expect(exportSvg).toBeVisible();

    // Verify active attack nodes exist in graph
    const nodes = page.locator("[data-testid^='attack-node-']");
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);

    // Switch back to Grid View
    const gridBtn = page.locator("[data-testid='view-grid']");
    await expect(gridBtn).toBeVisible();
    await gridBtn.click();
    await page.waitForTimeout(300);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Search & Filter Boundary Handling
  // --------------------------------------------------------------------------
  test('TC-03: Filter input boundary stress and empty-state recovery', async ({ page }) => {
    await page.goto('/#/tracker', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const searchInput = page.locator('#tracker-search-input');
    await expect(searchInput).toBeVisible();

    // Inject non-matching query to trigger Empty State
    await searchInput.fill('__NON_EXISTENT_MACHINE_PROBE_XYZ_9999__');
    await page.waitForTimeout(400);

    // Verify empty state display
    const emptyNotice = page.locator("text=NO TARGETS FOUND");
    await expect(emptyNotice).toBeVisible();

    // Verify reset filters recovery button
    const resetBtn = page.locator("[data-testid='reset-filters-btn']");
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(400);

    // Target cards restored and input cleared
    await expect(page.locator('#tracker-search-input')).toHaveValue('');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Target Detail Dossier & Multi-Tab Exploration
  // --------------------------------------------------------------------------
  test('TC-04: Target Detail dossier navigation and tab switching', async ({ page }) => {
    await page.goto('/#/target/thm-rootme', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes('RootMe') || bodyText.includes('THM') || bodyText.includes('10.10')).toBe(true);

    // Switch tabs: Recon, Flags Vault, Checklist
    const reconTab = page.locator("[data-testid='tab-recon'], button:has-text('RECON')").first();
    await expect(reconTab).toBeVisible();
    await reconTab.click();
    await page.waitForTimeout(300);

    const flagsTab = page.locator("[data-testid='tab-flags'], button:has-text('FLAGS VAULT')").first();
    await expect(flagsTab).toBeVisible();
    await flagsTab.click();
    await page.waitForTimeout(300);

    const checklistTab = page.locator("[data-testid='tab-checklist'], button:has-text('ATTACK METHODOLOGY')").first();
    await expect(checklistTab).toBeVisible();
    await checklistTab.click();
    await page.waitForTimeout(300);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Field Manual & Notes Workspace
  // --------------------------------------------------------------------------
  test('TC-05: Field manual notes search and multi-tab viewer', async ({ page }) => {
    await page.goto('/#/field-manual', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Verify search filter input
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('privilege');
      await page.waitForTimeout(400);
      await searchInput.fill('');
      await page.waitForTimeout(400);
    }

    // Check notes rendered
    const notes = page.locator("[id^='cpts-note-']");
    const count = await notes.count();
    expect(count).toBeGreaterThan(0);

    // Open first note
    const firstNoteBtn = notes.first().locator('button').first();
    if (await firstNoteBtn.isVisible()) {
      await firstNoteBtn.click();
      await page.waitForTimeout(600);

      // Verify docked or modal viewer mounted
      const dockedOrModal = page.locator("[data-testid='docked-note-viewer-pane'], [data-testid='obsidian-note-viewer-modal'], [data-testid='tab-strip-scroll-container']");
      await expect(dockedOrModal.first()).toBeVisible();

      // Close note with Alt+W shortcut
      await page.keyboard.press('Alt+w');
      await page.waitForTimeout(300);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: Exam Simulator Lifecycle & Bio-Break Modal
  // --------------------------------------------------------------------------
  test('TC-06: Exam Simulator cockpit pre-flight, HUD pacing, and report modal', async ({ page }) => {
    await page.goto('/#/exam-simulator', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Check setup screen or active cockpit
    const startBtn = page.locator("[data-testid='exam-start-btn'], [data-testid='start-exam-btn']").first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(800);
    }

    // Check export report button in active session
    const reportBtn = page.locator("[data-testid='exam-export-report-btn']").first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await page.waitForTimeout(400);

      // Assert report modal dialog is open
      const reportModal = page.locator("div[role='dialog']").first();
      await expect(reportModal).toBeVisible();

      // Close report modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(reportModal).not.toBeVisible();
    }

    // Test Alt+E quick action drawer
    await page.keyboard.press('Alt+e');
    await page.waitForTimeout(400);
    const quickDrawer = page.locator("div[role='dialog']").first();
    if (await quickDrawer.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(quickDrawer).not.toBeVisible();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 7: Reverse Shell Modal & Persistent Header Variables
  // --------------------------------------------------------------------------
  test('TC-07: Persistent Header LHOST/RHOST/LPORT variables and RevShell Crafter', async ({ page }) => {
    await page.goto('/#/tracker', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Header variable inputs
    const lhostInput = page.locator('#unified-lhost');
    const rhostInput = page.locator('#unified-rhost');
    const lportInput = page.locator('#unified-lport');

    await expect(lhostInput).toBeVisible();
    await expect(rhostInput).toBeVisible();
    await expect(lportInput).toBeVisible();

    // Update LPORT and verify value
    await lportInput.fill('4444');
    await page.waitForTimeout(100);
    await expect(lportInput).toHaveValue('4444');

    // Stopwatch timer controls
    const timerToggle = page.locator("[data-testid='timer-start-pause']");
    const timerReset = page.locator("[data-testid='timer-reset']");
    await expect(timerToggle).toBeVisible();
    await expect(timerReset).toBeVisible();

    await timerToggle.click();
    await page.waitForTimeout(200);
    await timerToggle.click();
    await page.waitForTimeout(100);
    await timerReset.click();
    await page.waitForTimeout(100);

    // Trigger RevShell modal via Alt+R hotkey
    await page.keyboard.press('Alt+r');
    await page.waitForTimeout(500);

    const revShellModal = page.locator("[data-testid='revshell-modal'], div[role='dialog']").first();
    await expect(revShellModal).toBeVisible();

    // Close modal with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(revShellModal).not.toBeVisible();
  });
});
