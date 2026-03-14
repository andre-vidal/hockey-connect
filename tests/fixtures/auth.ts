import { test as base, expect, Page } from "@playwright/test";

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
 * Extended Playwright fixtures that provide pre-authenticated pages.
 *
 * Usage in a test file:
 *   import { test, expect } from "../../fixtures/auth";
 *   test("...", async ({ authenticatedPage }) => { ... });
 */
export const test = base.extend<{
  /** A page with a valid session cookie for TEST_USER_EMAIL */
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test");
    }
    await createSession(page, email, password);
    await use(page);
  },
});

export { expect };
