import { test, expect } from "@playwright/test";
import { setMaintenanceMode, resetMaintenanceMode } from "../../helpers/firebase-cli";
import { maintenance as maintenanceSel } from "../../helpers/selectors";

/**
 * Public visitor — Maintenance mode
 *
 * Verifies the maintenance mode toggle: when enabled, all visitors are
 * redirected to /maintenance; when disabled, /maintenance bounces back to /.
 *
 * How it works:
 *   The firebase-cli helper writes to /maintenance/enabled in the Realtime
 *   Database. MaintenanceProvider (mounted in the root layout) subscribes to
 *   this path via onValue(). When the value is `true` and the user is not
 *   already on /maintenance, it calls router.replace("/maintenance").
 *   When the value is `false` and the user is on /maintenance, it calls
 *   router.replace("/").
 *
 * Because the redirect is client-side (React, post-hydration), tests use
 *   await page.waitForURL(...)
 * rather than asserting the URL immediately after navigation.
 *
 * IMPORTANT: tests in this file mutate shared RTDB state. The suite runs with
 * workers: 1 (set in playwright.config.ts) to prevent races between tests.
 * afterEach resets maintenance mode regardless of test outcome.
 */

// Generous timeout for the RTDB → onValue → router.replace round-trip
const REDIRECT_TIMEOUT = 10_000;

test.afterEach(async () => {
  // Always restore maintenance mode to OFF so subsequent tests are not affected
  resetMaintenanceMode();
});

test.describe("maintenance mode ON", () => {
  test("navigating to / redirects to /maintenance", async ({ page }) => {
    setMaintenanceMode(true);
    await page.goto("/");

    await page.waitForURL("/maintenance", { timeout: REDIRECT_TIMEOUT });
    await expect(page.locator(maintenanceSel.heading)).toBeVisible();
  });

  test("navigating to a public path redirects to /maintenance", async ({ page }) => {
    setMaintenanceMode(true);
    await page.goto("/leagues");

    await page.waitForURL("/maintenance", { timeout: REDIRECT_TIMEOUT });
    await expect(page.locator(maintenanceSel.heading)).toBeVisible();
  });

  test("/maintenance page shows the correct heading", async ({ page }) => {
    setMaintenanceMode(true);
    await page.goto("/");
    await page.waitForURL("/maintenance", { timeout: REDIRECT_TIMEOUT });

    await expect(page.locator(maintenanceSel.heading)).toHaveText("Under Maintenance");
  });
});

test.describe("maintenance mode OFF", () => {
  test("navigating to /maintenance redirects to /", async ({ page }) => {
    // Ensure we start clean (OFF → visit /maintenance → should bounce to /)
    resetMaintenanceMode();
    await page.goto("/maintenance");

    await page.waitForURL("/", { timeout: REDIRECT_TIMEOUT });
    await expect(page).not.toHaveURL("/maintenance");
  });

  test("disabling maintenance mode restores normal navigation", async ({ page }) => {
    // Enable then immediately disable
    setMaintenanceMode(true);
    setMaintenanceMode(false);

    await page.goto("/");

    // After a brief wait, should still be on / (no maintenance redirect)
    await page.waitForTimeout(3_000);
    await expect(page).not.toHaveURL("/maintenance");
  });
});
