import { test, expect } from "../../fixtures/auth";
import { adminUsers as sel } from "../../helpers/selectors";

/**
 * League admin — User management & invite flow
 *
 * Tests user listing, invite modal, and activate/deactivate toggle from
 * the perspective of a user with the `league_admin` role.
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
  test("renders the users list with an Invite Club Admin button", async ({
    leagueAdminPage: page,
  }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.locator(sel.inviteButton)).toBeVisible();
  });

  test("list shows the league admin's own account", async ({
    leagueAdminPage: page,
  }) => {
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
    await expect(
      dialog.getByText("Invite Club Admin", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("submit without email → shows required error, stays in modal", async ({
    leagueAdminPage: page,
  }) => {
    await page.goto("/admin/users");
    await page.locator(sel.inviteButton).click();

    // Fill display name but not email
    await page.locator(sel.inviteNameInput).fill("Missing Email User");
    await page.locator(sel.sendInviteButton).click();

    // HTML5 required on email input should prevent submission
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("submit without club → shows validation error, stays in modal", async ({
    leagueAdminPage: page,
  }) => {
    await page.goto("/admin/users");
    await page.locator(sel.inviteButton).click();

    // Fill email and name but leave club unselected
    await page.locator(sel.inviteEmailInput).fill(`test.${uid()}@example.com`);
    await page.locator(sel.inviteNameInput).fill("No Club User");
    await page.locator(sel.sendInviteButton).click();

    await expect(page.getByText("Validation Error")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("valid invite → success toast shown and user appears in list", async ({
    leagueAdminPage: page,
  }) => {
    const inviteEmail = `invite.${uid()}@example.com`;
    const inviteName = `Invited User ${uid()}`;

    await page.goto("/admin/users");
    await page.locator(sel.inviteButton).click();

    await page.locator(sel.inviteEmailInput).fill(inviteEmail);
    await page.locator(sel.inviteNameInput).fill(inviteName);
    await page.locator(sel.inviteClubTrigger).click();
    await page.getByRole("option").first().click();
    await page.locator(sel.sendInviteButton).click();

    // Success toast
    await expect(page.getByText("Invite sent", { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Modal closes after success
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // The invited user's record should refresh into the list
    await expect(page.getByText(inviteEmail, { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Cleanup: deactivate the placeholder user (no hard-delete user API in phase 2)
    const usersRes = await page.request.get("/api/users");
    const { users } = await usersRes.json();
    const invited = users.find(
      (u: { email: string; uid: string }) => u.email === inviteEmail,
    );
    if (invited) {
      await page.request.put(`/api/users/${invited.uid}`, {
        data: { isActive: false },
      });
    }
  });
});

// ── Toggle active / deactivate ────────────────────────────────────────────────

test.describe("toggle user active state", () => {
  test("deactivate a user → button changes to Activate and badge shows Inactive", async ({
    leagueAdminPage: page,
  }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    if (!testEmail) test.skip(true, "TEST_USER_EMAIL not set");

    await page.goto("/admin/users");

    // Filter the table so the row is rendered and visible
    await page.getByPlaceholder("Search users...").fill(testEmail!);

    // Find the row for TEST_USER, scroll it into view, then open the edit dialog
    const row = page.getByRole("row", { name: new RegExp(testEmail!, "i") });
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: /edit/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Toggle the Active switch off to deactivate
    const activeSwitch = dialog.getByRole("switch", { name: /active/i });
    await expect(activeSwitch).toBeChecked();
    await activeSwitch.click();
    await expect(activeSwitch).not.toBeChecked();

    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Row badge should now show Inactive
    await expect(row.getByText("Inactive")).toBeVisible({ timeout: 10_000 });

    // Restore: open edit dialog again and re-activate
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: /edit/i }).click();
    await expect(dialog).toBeVisible();

    const activeSwitchRestore = dialog.getByRole("switch", { name: /active/i });
    await expect(activeSwitchRestore).not.toBeChecked();
    await activeSwitchRestore.click();
    await expect(activeSwitchRestore).toBeChecked();

    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    await expect(row.getByText("Active")).toBeVisible({ timeout: 10_000 });
  });
});
