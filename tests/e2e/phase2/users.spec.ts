import { test, expect } from "../../fixtures/auth";
import { adminUsers as sel } from "../../helpers/selectors";

/**
 * Phase 2 — User management & invite flow
 *
 * Verification criteria from the plan:
 *   "Invite a club admin via email."
 *   "Verify Firestore security rules reject unauthorized writes."
 *
 * Notes:
 *   - The invite test does NOT actually send a real email — Resend is live but
 *     the invite address is a throwaway @example.com domain that will never be
 *     delivered. The test verifies that the API accepted the request and the
 *     user record appears in the list.
 *   - The toggle (activate / deactivate) test operates on the TEST_USER account
 *     and restores the original state afterward.
 */

const uid = () => Date.now().toString(36);

// ── List page ─────────────────────────────────────────────────────────────────

test.describe("users list", () => {
  test("renders the users list with an Invite Club Admin button", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.locator(sel.inviteButton)).toBeVisible();
  });

  test("list shows the league admin's own account", async ({ leagueAdminPage: page }) => {
    const adminEmail = process.env.LEAGUE_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "LEAGUE_ADMIN_EMAIL not set");

    await page.goto("/admin/users");
    await expect(page.getByText(adminEmail!)).toBeVisible({ timeout: 10_000 });
  });
});

// ── Invite modal ──────────────────────────────────────────────────────────────

test.describe("invite club admin", () => {
  test("invite modal opens and closes", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/users");
    await page.locator(sel.inviteButton).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Invite Club Admin", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("submit without email → shows required error, stays in modal", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/users");
    await page.locator(sel.inviteButton).click();

    // Fill display name but not email
    await page.locator(sel.inviteNameInput).fill("Missing Email User");
    await page.locator(sel.sendInviteButton).click();

    // HTML5 required on email input should prevent submission
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("valid invite → success toast shown and user appears in list", async ({ leagueAdminPage: page }) => {
    const inviteEmail = `invite.${uid()}@example.com`;
    const inviteName = `Invited User ${uid()}`;

    await page.goto("/admin/users");
    await page.locator(sel.inviteButton).click();

    await page.locator(sel.inviteEmailInput).fill(inviteEmail);
    await page.locator(sel.inviteNameInput).fill(inviteName);
    await page.locator(sel.sendInviteButton).click();

    // Success toast
    await expect(page.getByText("Invite sent", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Modal closes after success
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // The invited user's record should refresh into the list
    await expect(page.getByText(inviteEmail, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Cleanup: find the placeholder user and delete via Firebase Admin (no delete endpoint
    // exists for users — we toggle active state as the available operation)
    const usersRes = await page.request.get("/api/users");
    const { users } = await usersRes.json();
    const invited = users.find((u: { email: string; uid: string }) => u.email === inviteEmail);
    // Deactivate as cleanup (no hard-delete user API in phase 2)
    if (invited) {
      await page.request.put(`/api/users/${invited.uid}`, {
        data: { isActive: false },
      });
    }
  });
});

// ── Toggle active / deactivate ────────────────────────────────────────────────

test.describe("toggle user active state", () => {
  test("deactivate a user → button changes to Activate and badge shows Inactive", async ({ leagueAdminPage: page }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    if (!testEmail) test.skip(true, "TEST_USER_EMAIL not set");

    await page.goto("/admin/users");

    // Find the row for TEST_USER and click Deactivate
    const row = page.getByRole("row", { name: new RegExp(testEmail!, "i") });
    await row.getByRole("button", { name: "Deactivate" }).click();

    await expect(row.getByText("Inactive")).toBeVisible({ timeout: 10_000 });
    await expect(row.getByRole("button", { name: "Activate" })).toBeVisible();

    // Restore: click Activate to return to original state
    await row.getByRole("button", { name: "Activate" }).click();
    await expect(row.getByText("Active")).toBeVisible({ timeout: 10_000 });
  });
});

// ── Security ──────────────────────────────────────────────────────────────────

test.describe("security — users API", () => {
  test("unauthenticated GET /api/users → 401", async ({ page }) => {
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(401);
  });

  test("plain user GET /api/users → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(403);
  });

  test("unauthenticated POST /api/users/invite → 401", async ({ page }) => {
    const res = await page.request.post("/api/users/invite", {
      data: { email: "x@x.com", displayName: "X" },
    });
    expect(res.status()).toBe(401);
  });

  test("plain user POST /api/users/invite → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/users/invite", {
      data: { email: "x@x.com", displayName: "X" },
    });
    expect(res.status()).toBe(403);
  });
});
