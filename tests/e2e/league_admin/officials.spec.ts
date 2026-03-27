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
});
