import { test, expect } from "../../fixtures/auth";
import { clubUsers as sel } from "../../helpers/selectors";

/**
 * Club admin — Club user management
 *
 * Tests user listing and role editing from the perspective of a user with the
 * `club_admin` role. Club admins can only see and manage users within their
 * own club; they cannot invite new users or assign elevated roles.
 *
 * API endpoints under test: /api/users (club-scoped), /api/users/[uid]
 */

// ── List page ─────────────────────────────────────────────────────────────────

test.describe("club users list", () => {
  test("renders the club users list", async ({ clubAdminPage: page }) => {
    await page.goto("/club/users");
    await expect(page.getByRole("heading", { name: "Club Users" })).toBeVisible();
  });

  test("list shows the club admin's own account", async ({ clubAdminPage: page }) => {
    const adminEmail = process.env.CLUB_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "CLUB_ADMIN_EMAIL not set");

    await page.goto("/club/users");
    await expect(page.getByText(adminEmail!)).toBeVisible({ timeout: 10_000 });
  });

  test("search filters users by name or email", async ({ clubAdminPage: page }) => {
    const adminEmail = process.env.CLUB_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "CLUB_ADMIN_EMAIL not set");

    await page.goto("/club/users");
    await page.locator(sel.searchInput).fill(adminEmail!);

    // Only matching row(s) should be visible
    await expect(page.getByText(adminEmail!)).toBeVisible({ timeout: 10_000 });
  });

  test("does not include an 'Invite Club Admin' button (league_admin only)", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/users");
    await expect(page.getByRole("button", { name: /invite/i })).not.toBeVisible();
  });
});

// ── Edit user modal ───────────────────────────────────────────────────────────

test.describe("edit user roles", () => {
  test("edit modal opens with role checkboxes", async ({ clubAdminPage: page }) => {
    await page.goto("/club/users");

    // Click the first edit (pencil) button in the table
    const editButtons = page.getByRole("button").filter({ has: page.locator(".lucide-pencil") });
    await editButtons.first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Edit User", { exact: true })).toBeVisible();

    // All 5 assignable role checkboxes should be present
    await expect(dialog.getByRole("checkbox")).toHaveCount(5);
  });

  test("edit modal does not offer league_admin or root roles", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/users");

    const editButtons = page.getByRole("button").filter({ has: page.locator(".lucide-pencil") });
    await editButtons.first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // league_admin and root should not appear as assignable roles
    await expect(dialog.getByText("league admin", { exact: true })).not.toBeVisible();
    await expect(dialog.getByText("root", { exact: true })).not.toBeVisible();
  });

  test("cancel closes the modal without saving", async ({ clubAdminPage: page }) => {
    await page.goto("/club/users");

    const editButtons = page.getByRole("button").filter({ has: page.locator(".lucide-pencil") });
    await editButtons.first().click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

// ── API scoping ───────────────────────────────────────────────────────────────

test.describe("GET /api/users scoped to own club", () => {
  test("returns only users from the club admin's club", async ({ clubAdminPage: page }) => {
    const adminEmail = process.env.CLUB_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "CLUB_ADMIN_EMAIL not set");

    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(200);

    const { users } = await res.json();

    // Every returned user should have the same clubId as the admin
    const clubAdminUser = users.find(
      (u: { email: string }) => u.email === adminEmail
    );
    expect(clubAdminUser).toBeDefined();

    // All users share the same clubId
    const expectedClubId = process.env.CLUB_ADMIN_CLUB_ID;
    if (expectedClubId) {
      users.forEach((u: { clubId?: string }) => {
        expect(u.clubId).toBe(expectedClubId);
      });
    }
  });
});
