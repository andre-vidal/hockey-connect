import { test, expect } from "@playwright/test";
import { login as loginSel, register as registerSel } from "../../helpers/selectors";

/**
 * Phase 1 — Authentication
 *
 * Verification criteria from the plan:
 *   "Login with email/password, Google, and anonymous."
 *
 * Google OAuth cannot be fully automated without a persisted browser profile
 * signed into Google. We verify the button is present and enabled instead.
 *
 * Register tests cover client-side validation and the "email already in use"
 * error path — no new accounts are created on every run.
 */

// ── Email / password login ────────────────────────────────────────────────────

test.describe("email/password login", () => {
  test("valid credentials → navigates away from /login", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) test.skip(true, "TEST_USER_EMAIL / TEST_USER_PASSWORD not set");

    await page.goto("/login");
    await page.locator(loginSel.emailInput).fill(email!);
    await page.locator(loginSel.passwordInput).fill(password!);
    await page.locator(loginSel.submitButton).click();

    // LoginForm calls router.push("/") on success
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("invalid credentials → shows error, stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.locator(loginSel.emailInput).fill("nonexistent@example.com");
    await page.locator(loginSel.passwordInput).fill("wrong-password");
    await page.locator(loginSel.submitButton).click();

    // Error message should appear
    await expect(page.locator(loginSel.errorMessage)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(loginSel.errorMessage)).toContainText("Invalid email or password");

    // Must remain on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders all expected elements", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator(loginSel.emailInput)).toBeVisible();
    await expect(page.locator(loginSel.passwordInput)).toBeVisible();
    await expect(page.locator(loginSel.submitButton)).toBeVisible();
    await expect(page.locator(loginSel.submitButton)).toBeEnabled();
  });
});

// ── Google sign-in ────────────────────────────────────────────────────────────

test.describe("Google sign-in", () => {
  test("Google button is visible and enabled on /login", async ({ page }) => {
    await page.goto("/login");

    const googleBtn = page.locator(loginSel.googleButton);
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });
});

// ── Anonymous / guest login ───────────────────────────────────────────────────

test.describe("anonymous login", () => {
  test('"Continue as guest" → navigates away from /login', async ({ page }) => {
    await page.goto("/login");

    await page.locator(loginSel.guestButton).click();

    // signInAnonymous() succeeds and router.push("/") is called
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test('"Continue as guest" button is visible and enabled on /login', async ({ page }) => {
    await page.goto("/login");

    const guestBtn = page.locator(loginSel.guestButton);
    await expect(guestBtn).toBeVisible();
    await expect(guestBtn).toBeEnabled();
  });
});

// ── Registration form ─────────────────────────────────────────────────────────

test.describe("registration form", () => {
  test("password mismatch → shows validation error, stays on /register", async ({ page }) => {
    await page.goto("/register");

    await page.locator(registerSel.displayNameInput).fill("Test User");
    await page.locator(registerSel.emailInput).fill("someone@example.com");
    await page.locator(registerSel.passwordInput).fill("Password123!");
    await page.locator(registerSel.confirmPasswordInput).fill("DifferentPassword!");
    await page.locator(registerSel.submitButton).click();

    await expect(page.locator(registerSel.errorMessage)).toContainText("Passwords do not match");
    await expect(page).toHaveURL(/\/register/);
  });

  test("password too short → shows validation error, stays on /register", async ({ page }) => {
    await page.goto("/register");

    await page.locator(registerSel.displayNameInput).fill("Test User");
    await page.locator(registerSel.emailInput).fill("someone@example.com");
    await page.locator(registerSel.passwordInput).fill("abc");
    await page.locator(registerSel.confirmPasswordInput).fill("abc");
    await page.locator(registerSel.submitButton).click();

    await expect(page.locator(registerSel.errorMessage)).toContainText("at least 6 characters");
    await expect(page).toHaveURL(/\/register/);
  });

  test("email already in use → shows Firebase error, stays on /register", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    if (!email) test.skip(true, "TEST_USER_EMAIL not set");

    await page.goto("/register");

    await page.locator(registerSel.displayNameInput).fill("Duplicate User");
    await page.locator(registerSel.emailInput).fill(email!);
    await page.locator(registerSel.passwordInput).fill("ValidPass123!");
    await page.locator(registerSel.confirmPasswordInput).fill("ValidPass123!");
    await page.locator(registerSel.submitButton).click();

    await expect(page.locator(registerSel.errorMessage)).toContainText(
      "An account with this email already exists",
      { timeout: 10_000 }
    );
    await expect(page).toHaveURL(/\/register/);
  });

  test("registration form renders all expected fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator(registerSel.displayNameInput)).toBeVisible();
    await expect(page.locator(registerSel.emailInput)).toBeVisible();
    await expect(page.locator(registerSel.passwordInput)).toBeVisible();
    await expect(page.locator(registerSel.confirmPasswordInput)).toBeVisible();
    await expect(page.locator(registerSel.submitButton)).toBeEnabled();
  });
});
