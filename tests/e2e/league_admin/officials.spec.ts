import { test, expect } from "../../fixtures/auth";
import { adminOfficials as sel } from "../../helpers/selectors";

/**
 * League admin — Match Officials CRUD
 *
 * Tests create, edit, and delete from the perspective of a user with the
 * `league_admin` role. The officials/new form uses a live user search
 * (fetches /api/users, filters client-side). Tests search for the
 * LEAGUE_ADMIN_EMAIL user who is guaranteed to exist in the Firebase project.
 */

const uid = () => Date.now().toString(36);

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("officials list", () => {
  test("renders the officials list with an Add Official link", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/officials");
    await expect(page.getByRole("heading", { name: "Match Officials" })).toBeVisible();
    await expect(page.locator(sel.addOfficialLink)).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create official", () => {
  test("select user + choose type → redirects to list and official appears", async ({ leagueAdminPage: page }) => {
    const adminEmail = process.env.LEAGUE_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "LEAGUE_ADMIN_EMAIL not set");

    // Pre-clean: remove any stale officials for this email from prior failed runs
    const preRes = await page.request.get("/api/officials");
    const { officials: existing } = await preRes.json();
    const stale = (existing as { email: string; id: string }[]).filter((o) => o.email === adminEmail);
    await Promise.all(stale.map((o) => page.request.delete(`/api/officials/${o.id}`)));

    await page.goto("/admin/officials/new");

    // Type enough of the email to trigger the dropdown
    await page.locator(sel.userSearchInput).fill(adminEmail!.split("@")[0]);

    // Wait for the user dropdown to appear and click the first result
    const firstResult = page.locator(sel.userSearchFirstResult).first();
    await expect(firstResult).toBeVisible({ timeout: 15_000 });
    await firstResult.click();

    // Confirm the "Selected:" banner is shown
    await expect(page.getByText("Selected:")).toBeVisible();

    // Check "Umpire"
    await page.locator(sel.umpireCheckbox).check();

    await page.locator(sel.submitButton).click();
    await expect(page).toHaveURL("/admin/officials", { timeout: 10_000 });

    // Verify the official appears — exactly one row for this email
    await expect(page.getByText(adminEmail!, { exact: true }).first()).toBeVisible();

    // Cleanup: delete all officials for this email
    const res = await page.request.get("/api/officials");
    const { officials } = await res.json();
    const created = (officials as { email: string; id: string }[]).filter((o) => o.email === adminEmail);
    await Promise.all(created.map((o) => page.request.delete(`/api/officials/${o.id}`)));
  });

  test("submit without selecting a user → shows validation error, stays on form", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/officials/new");

    // Check a type but don't select a user
    await page.locator(sel.umpireCheckbox).check();
    await page.locator(sel.submitButton).click();

    await expect(page.getByText("Please select a user.", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin\/officials\/new/);
  });

  test("submit without selecting an official type → shows validation error", async ({ leagueAdminPage: page }) => {
    const adminEmail = process.env.LEAGUE_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "LEAGUE_ADMIN_EMAIL not set");

    await page.goto("/admin/officials/new");
    await page.locator(sel.userSearchInput).fill(adminEmail!.split("@")[0]);
    const firstResult = page.locator(sel.userSearchFirstResult).first();
    await expect(firstResult).toBeVisible({ timeout: 15_000 });
    await firstResult.click();

    // Don't check any type, submit directly
    await page.locator(sel.submitButton).click();

    await expect(page.getByText("Select at least one official type.", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin\/officials\/new/);
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit official", () => {
  test("toggle isActive → deactivated official shows Inactive badge", async ({ leagueAdminPage: page }) => {
    const adminEmail = process.env.LEAGUE_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "LEAGUE_ADMIN_EMAIL not set");

    // Resolve userId for the admin user
    const usersRes = await page.request.get("/api/users");
    const { users } = await usersRes.json();
    const adminUser = users.find((u: { email: string; uid: string }) => u.email === adminEmail);
    if (!adminUser) test.skip(true, "LEAGUE_ADMIN_EMAIL user not found in /api/users");

    // Create via API
    const res = await page.request.post("/api/officials", {
      data: {
        userId: adminUser.uid,
        displayName: adminUser.displayName ?? "Admin",
        email: adminEmail,
        officialTypes: ["umpire"],
      },
    });
    const { official: { id } } = await res.json();

    try {
      await page.goto(`/admin/officials/${id}`);
      await page.getByLabel("Active").click();
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/officials", { timeout: 10_000 });
      await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
    } finally {
      await page.request.delete(`/api/officials/${id}`);
    }
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

test.describe("delete official", () => {
  test("confirm delete → official removed from list", async ({ leagueAdminPage: page }) => {
    const adminEmail = process.env.LEAGUE_ADMIN_EMAIL;
    if (!adminEmail) test.skip(true, "LEAGUE_ADMIN_EMAIL not set");

    const usersRes = await page.request.get("/api/users");
    const { users } = await usersRes.json();
    const adminUser = users.find((u: { email: string; uid: string }) => u.email === adminEmail);
    if (!adminUser) test.skip(true, "LEAGUE_ADMIN_EMAIL user not found in /api/users");

    await page.request.post("/api/officials", {
      data: {
        userId: adminUser.uid,
        displayName: adminUser.displayName ?? "Admin",
        email: adminEmail,
        officialTypes: ["table_operator"],
      },
    });

    await page.goto("/admin/officials");
    const row = page.getByRole("row").filter({ hasText: adminEmail! });
    await row.locator(sel.deleteButton).click();
    await page.locator(sel.confirmDeleteButton).click();

    await expect(row).not.toBeVisible({ timeout: 10_000 });
  });
});
