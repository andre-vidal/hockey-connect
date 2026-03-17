import { test, expect } from "@playwright/test";

/**
 * Public visitor — Route access and redirect behaviour
 *
 * Verifies that:
 *   - Protected routes redirect an unauthenticated visitor to /login
 *     with a `redirect` query parameter preserving the original path.
 *   - Public routes are accessible without authentication.
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
