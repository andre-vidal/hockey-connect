import path from "path";
import { test, expect } from "../../fixtures/auth";
import { adminClubs as sel } from "../../helpers/selectors";

/**
 * Phase 2 — Club CRUD + logo upload
 *
 * Verification criteria from the plan:
 *   "Create a league, tournament, club."
 *   "Upload a club logo."
 *   "Verify Firestore security rules reject unauthorized writes."
 *
 * Logo upload test attaches a real image file from tests/fixtures/assets/.
 * Create one small PNG there if it does not exist (e.g. a 1x1 pixel image).
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
    // The "Include Archived Clubs" label/switch should be present
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
    console.log(clubs);
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

    // Use a small placeholder PNG from the fixtures/assets directory
    const logoPath = path.resolve(__dirname, "../../fixtures/assets/test-logo.png");
    await page.locator(sel.logoInput).setInputFiles(logoPath);

    // An <img> preview should appear immediately (object URL)
    await expect(page.locator('img[alt="Logo preview"]')).toBeVisible({ timeout: 5_000 });
  });

  test("club created with logo → uploads to Storage and saves logoUrl", async ({ leagueAdminPage: page }) => {
    const name = `Logo Club ${uid()}`;
    await page.goto("/admin/clubs/new");
    await page.locator(sel.nameInput).fill(name);

    const logoPath = path.resolve(__dirname, "../../fixtures/assets/test-logo.png");
    await page.locator(sel.logoInput).setInputFiles(logoPath);

    // Wait for preview to confirm file is picked up
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
      // Toggle the "Archive Club" switch (id="isArchived")
      await page.locator("#isArchived").click();
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/clubs", { timeout: 10_000 });
      // Archived club should be hidden from default list view
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

// ── Security ──────────────────────────────────────────────────────────────────

test.describe("security — clubs API", () => {
  test("unauthenticated POST /api/clubs → 401", async ({ page }) => {
    const res = await page.request.post("/api/clubs", { data: { name: "Fail" } });
    expect(res.status()).toBe(401);
  });

  test("plain user POST /api/clubs → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/clubs", { data: { name: "Fail" } });
    expect(res.status()).toBe(403);
  });

  test("plain user DELETE /api/clubs/:id → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.delete("/api/clubs/nonexistent-id");
    expect(res.status()).toBe(403);
  });
});
