import { test as base, expect, Page, Browser } from "@playwright/test";

/**
 * Authenticates a user without touching the UI by:
 * 1. Calling the Firebase Auth REST API to exchange email/password for an ID token.
 * 2. POSTing that token to /api/auth/session so the app sets an httpOnly session cookie.
 *
 * This is the correct way to establish a fully server-recognised session for
 * middleware tests (the middleware checks the `session` cookie, not Firebase
 * client-side auth state).
 *
 * The Firebase Auth REST API is public-facing and uses the same API key as the
 * client SDK — no additional credentials required.
 */
async function createSession(page: Page, email: string, password: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");

  // Exchange credentials for a Firebase ID token via the REST API
  const signInRes = await page.request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      data: { email, password, returnSecureToken: true },
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!signInRes.ok()) {
    const body = await signInRes.text();
    throw new Error(`Firebase REST sign-in failed (${signInRes.status()}): ${body}`);
  }

  const { idToken } = await signInRes.json();

  // Exchange the ID token for a server-managed session cookie
  const sessionRes = await page.request.post("/api/auth/session", {
    data: { idToken },
    headers: { "Content-Type": "application/json" },
  });

  if (!sessionRes.ok()) {
    const body = await sessionRes.text();
    throw new Error(`Session creation failed (${sessionRes.status()}): ${body}`);
  }
}

/**
 * Signs in through the UI so both Firebase client auth state (onAuthStateChanged)
 * AND the httpOnly session cookie are established. The REST-API-only approach
 * (createSession) is sufficient for middleware/API tests but not for dashboard
 * pages that use AuthGuard, which reads roles from AuthProvider client-side.
 *
 * Waits for navigation away from /login (redirect destination varies by role),
 * so no specific redirect URL needs to be hard-coded.
 */
async function createUiSession(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  // Wait for navigation away from /login — destination varies by role
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 15_000 });
}

/**
 * Creates an isolated BrowserContext from a `browser` fixture and returns a
 * fresh Page within it. This ensures each role fixture has its own cookie jar,
 * which prevents session contamination when multiple fixtures are used in the
 * same test (e.g. leagueAdminPage + matchOfficialPage).
 */
async function createIsolatedPage(browser: Browser): Promise<{ page: Page; cleanup: () => Promise<void> }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { page, cleanup: () => context.close() };
}

/**
 * Extended Playwright fixtures that provide pre-authenticated pages for each
 * user role in the system.
 *
 * Usage in a test file:
 *   import { test, expect } from "../../fixtures/auth";
 *   test("...", async ({ authenticatedPage }) => { ... });
 *   test("...", async ({ leagueAdminPage }) => { ... });
 *   test("...", async ({ matchOfficialPage }) => { ... });
 *   test("...", async ({ teamAdminPage }) => { ... });
 */
export const test = base.extend<{
  /** A page with a valid session cookie for TEST_USER_EMAIL (no roles) */
  authenticatedPage: Page;
  /** A page signed in as LEAGUE_ADMIN_EMAIL (league_admin role) */
  leagueAdminPage: Page;
  /** A page signed in as CLUB_ADMIN_EMAIL (club_admin role) */
  clubAdminPage: Page;
  /** A page signed in as MATCH_OFFICIAL_EMAIL (match_official role) */
  matchOfficialPage: Page;
  /** A page signed in as TEAM_ADMIN_EMAIL (team_admin role) */
  teamAdminPage: Page;
}>({
  // authenticatedPage uses the shared page fixture — it only makes API calls
  // via page.request, so it doesn't need an isolated context.
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test");
    }
    await createSession(page, email, password);
    await use(page);
  },

  // Role fixtures each create their own BrowserContext so that multiple
  // role fixtures can coexist in a single test without session contamination.
  leagueAdminPage: async ({ browser }, use) => {
    const email = process.env.LEAGUE_ADMIN_EMAIL;
    const password = process.env.LEAGUE_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("LEAGUE_ADMIN_EMAIL and LEAGUE_ADMIN_PASSWORD must be set in .env.test");
    }
    const { page, cleanup } = await createIsolatedPage(browser);
    await createUiSession(page, email, password);
    await use(page);
    await cleanup();
  },

  clubAdminPage: async ({ browser }, use) => {
    const email = process.env.CLUB_ADMIN_EMAIL;
    const password = process.env.CLUB_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("CLUB_ADMIN_EMAIL and CLUB_ADMIN_PASSWORD must be set in .env.test");
    }
    const { page, cleanup } = await createIsolatedPage(browser);
    await createUiSession(page, email, password);
    await use(page);
    await cleanup();
  },

  matchOfficialPage: async ({ browser }, use) => {
    const email = process.env.MATCH_OFFICIAL_EMAIL;
    const password = process.env.MATCH_OFFICIAL_PASSWORD;
    if (!email || !password) {
      throw new Error("MATCH_OFFICIAL_EMAIL and MATCH_OFFICIAL_PASSWORD must be set in .env.test");
    }
    const { page, cleanup } = await createIsolatedPage(browser);
    await createUiSession(page, email, password);
    await use(page);
    await cleanup();
  },

  teamAdminPage: async ({ browser }, use) => {
    const email = process.env.TEAM_ADMIN_EMAIL;
    const password = process.env.TEAM_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error("TEAM_ADMIN_EMAIL and TEAM_ADMIN_PASSWORD must be set in .env.test");
    }
    const { page, cleanup } = await createIsolatedPage(browser);
    await createUiSession(page, email, password);
    await use(page);
    await cleanup();
  },
});

export { expect };
