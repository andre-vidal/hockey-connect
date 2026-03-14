import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";

/**
 * Phase 1 — Middleware: route protection & redirect behaviour
 *
 * Verification criteria from the plan:
 *   "Confirm middleware redirects unauthorized users."
 *   "Authenticated user visiting /login is redirected away."
 *
 * These tests use a fresh browser context with no session cookie to simulate
 * an unauthenticated visitor (the middleware checks the `session` httpOnly
 * cookie set by /api/auth/session).
 */

const PROTECTED_PATHS = ["/admin", "/official", "/team", "/player"] as const;
const PUBLIC_PATHS = ["/", "/leagues", "/clubs", "/players", "/calendar", "/articles", "/matches", "/stats"] as const;

// ── Unauthenticated access ────────────────────────────────────────────────────

test.describe("unauthenticated visitor", () => {
  for (const path of PROTECTED_PATHS) {
    test(`GET ${path} → redirects to /login with redirect param`, async ({ page }) => {
      await page.goto(path);

      // Should land on /login
      await expect(page).toHaveURL(/\/login/);

      // The redirect query param should preserve the original destination
      const url = new URL(page.url());
      expect(url.searchParams.get("redirect")).toBe(path);
    });
  }

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

// ── Authenticated access ──────────────────────────────────────────────────────

authTest.describe("authenticated visitor", () => {
  authTest(
    "visiting /login is redirected away (middleware detects existing session)",
    async ({ authenticatedPage: page }) => {
      await page.goto("/login");

      // Middleware should redirect away from /login when session cookie is present
      await expect(page).not.toHaveURL(/\/login/);
    }
  );

  authTest(
    "visiting /register is redirected away (middleware detects existing session)",
    async ({ authenticatedPage: page }) => {
      await page.goto("/register");

      await expect(page).not.toHaveURL(/\/register/);
    }
  );
});
