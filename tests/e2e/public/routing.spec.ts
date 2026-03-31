import { test, expect } from "@playwright/test";

/**
 * Public visitor — Route access, redirect behaviour, and header navigation (Phase 1 + Phase 7)
 *
 * Verifies that:
 *   - Protected routes redirect an unauthenticated visitor to /login
 *     with a `redirect` query parameter preserving the original path.
 *   - Public routes are accessible without authentication.
 *   - Phase 7 header nav links (Stats, Leagues, Players, Clubs) are present and functional.
 */

const PROTECTED_PATHS = ["/admin", "/official", "/team", "/player"] as const;
const PUBLIC_PATHS = [
  "/",
  "/leagues",
  "/clubs",
  "/players",
  "/calendar",
  "/articles",
  "/matches",
  "/stats",
] as const;

test.describe("unauthenticated visitor — protected routes", () => {
  for (const path of PROTECTED_PATHS) {
    test(`GET ${path} → redirects to /login with redirect param`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login/);

      // The redirect query param should preserve the original destination
      const url = new URL(page.url());
      expect(url.searchParams.get("redirect")).toBe(path);
    });
  }
});

test.describe("unauthenticated visitor — public routes", () => {
  for (const path of PUBLIC_PATHS) {
    test(`GET ${path} → accessible without authentication`, async ({ page }) => {
      const response = await page.goto(path);

      // Must not be redirected to /login
      expect(page.url()).not.toMatch(/\/login/);

      // Page should load (2xx or 3xx that resolves to non-login page)
      expect(response?.status()).toBeLessThan(500);
    });
  }
});

// ── Header navigation links (Phase 7) ────────────────────────────────────────

test.describe("header navigation — stats and directory links", () => {
  test("Stats link is visible in header on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("nav a[href='/stats']")).toBeVisible();
  });

  test("Stats link navigates to /stats", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("nav a[href='/stats']").click();
    await expect(page).toHaveURL("/stats");
  });

  test("Leagues link navigates to /leagues", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("nav a[href='/leagues']").click();
    await expect(page).toHaveURL("/leagues");
  });

  test("Players link navigates to /players", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("nav a[href='/players']").click();
    await expect(page).toHaveURL("/players");
  });

  test("Clubs link navigates to /clubs", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator("nav a[href='/clubs']").click();
    await expect(page).toHaveURL("/clubs");
  });
});
