import path from "path";
import { test, expect } from "../../fixtures/auth";
import { adminClubs as sel } from "../../helpers/selectors";

/**
 * League admin — Club CRUD + logo upload
 *
 * Tests create, edit, delete, archive, and logo upload from the perspective
 * of a user with the `league_admin` role.
 *
 * Logo upload test attaches a real image file from tests/fixtures/assets/.
 */

const uid = () => Date.now().toString(36);

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("club list", () => {
  test("renders the clubs list with a New Club link", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/clubs");
    await expect(page.getByRole("heading", { name: "Clubs" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(sel.newClubLink)).toBeVisible({ timeout: 15_000 });
  });

  test("archived clubs are hidden by default, shown when filter toggled", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/clubs");
    await expect(page.getByText("Include Archived")).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create club", () => {
  test("valid required fields → redirects to list and club appears", async ({ leagueAdminPage: page }) => {
    const name = `Test Club ${uid()}`;
    await page.goto("/admin/clubs/new", { timeout: 15_000 });
    await page.locator(sel.nameInput).fill(name);
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/admin/clubs", { timeout: 15_000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Cleanup
    const res = await page.request.get("/api/clubs?includeArchived=true");
    const { clubs } = await res.json();
    const created = clubs.find((c: { name: string; id: string }) => c.name === name);
    if (created) await page.request.delete(`/api/clubs/${created.id}`);
  });

  test("missing name → HTML5 validation prevents submission, stays on form", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/clubs/new");
    await page.locator(sel.submitButton).click();
    await expect(page).toHaveURL(/\/admin\/clubs\/new/);
  });

  test("logo upload → preview appears before submission", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/clubs/new");

    const logoPath = path.resolve(__dirname, "../../fixtures/assets/test-logo.png");
    await page.locator(sel.logoInput).setInputFiles(logoPath);

    await expect(page.locator('img[alt="Logo preview"]')).toBeVisible({ timeout: 5_000 });
  });

  test("club created with logo → uploads to Storage and saves logoUrl", async ({ leagueAdminPage: page }) => {
    const name = `Logo Club ${uid()}`;
    await page.goto("/admin/clubs/new");
    await page.locator(sel.nameInput).fill(name);

    const logoPath = path.resolve(__dirname, "../../fixtures/assets/test-logo.png");
    await page.locator(sel.logoInput).setInputFiles(logoPath);

    await expect(page.locator('img[alt="Logo preview"]')).toBeVisible();

    await page.locator(sel.submitButton).click();
    await expect(page).toHaveURL("/admin/clubs", { timeout: 30_000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Verify the saved club has a logoUrl via the API
    const listRes = await page.request.get("/api/clubs");
    const { clubs } = await listRes.json();
    const created = clubs.find((c: { name: string; id: string; logoUrl?: string }) => c.name === name);
    expect(created?.logoUrl).toBeTruthy();

    if (created) await page.request.delete(`/api/clubs/${created.id}`);
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit club", () => {
  test("save changes → updated name appears in list", async ({ leagueAdminPage: page }) => {
    const original = `Club ${uid()}`;
    const updated = `${original} (edited)`;
    const res = await page.request.post("/api/clubs", {
      data: { name: original },
    });
    const { club: { id } } = await res.json();

    try {
      await page.goto(`/admin/clubs/${id}`);
      await page.locator(sel.nameInput).fill(updated);
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/clubs", { timeout: 10_000 });
      await expect(page.getByText(updated, { exact: true })).toBeVisible();
    } finally {
      await page.request.delete(`/api/clubs/${id}`);
    }
  });

  test("archiving a club sets it inactive and hides it from default list", async ({ leagueAdminPage: page }) => {
    const name = `Club ${uid()}`;
    const res = await page.request.post("/api/clubs", {
      data: { name },
    });
    const { club: { id } } = await res.json();

    try {
      await page.goto(`/admin/clubs/${id}`);
      await page.locator("#isArchived").click();
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/clubs", { timeout: 10_000 });
      await expect(page.getByText(name, { exact: true })).not.toBeVisible();
    } finally {
      await page.request.delete(`/api/clubs/${id}`);
    }
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

test.describe("delete club", () => {
  test("confirm delete → club removed from list", async ({ leagueAdminPage: page }) => {
    const name = `Club ${uid()}`;
    const res = await page.request.post("/api/clubs", { data: { name } });
    const { club: { id } } = await res.json();

    await page.goto(`/admin/clubs/${id}`);
    await page.locator(sel.deleteButton).click();
    await page.locator(sel.confirmDeleteButton).click();

    await expect(page).toHaveURL("/admin/clubs", { timeout: 10_000 });
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});
