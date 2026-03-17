import { test, expect } from "../../fixtures/auth";

/**
 * Authenticated visitor (no roles) — Route access
 *
 * Verifies that a signed-in user is redirected away from auth pages
 * (the middleware detects the existing session cookie and prevents
 * re-visiting /login or /register).
 */

test.describe("authenticated visitor — auth page redirects", () => {
  test(
    "visiting /login is redirected away (middleware detects existing session)",
    async ({ authenticatedPage: page }) => {
      await page.goto("/login");

      await expect(page).not.toHaveURL(/\/login/);
    }
  );

  test(
    "visiting /register is redirected away (middleware detects existing session)",
    async ({ authenticatedPage: page }) => {
      await page.goto("/register");

      await expect(page).not.toHaveURL(/\/register/);
    }
  );
});
