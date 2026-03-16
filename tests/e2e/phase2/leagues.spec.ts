import { test, expect } from "../../fixtures/auth";
import { adminLeagues as sel } from "../../helpers/selectors";

/**
 * Phase 2 — League CRUD
 *
 * Verification criteria from the plan:
 *   "Create a league, tournament, club."
 *   "Verify Firestore security rules reject unauthorized writes."
 *
 * Strategy:
 *   - Happy-path create: performed via UI with a unique name. Created records
 *     are deleted via the API at the end of each test.
 *   - Edit / delete: resource created via API before the test so the UI can
 *     operate on a known document.
 *   - Security: raw API calls from unauthenticated and plain-user sessions
 *     verify 401 / 403 responses.
 */

const uid = () => Date.now().toString(36);

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("league list", () => {
  test("renders the leagues list with a New League link", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/leagues");
    await expect(page.getByRole("heading", { name: "Leagues" })).toBeVisible();
    await expect(page.locator(sel.newLeagueLink)).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create league", () => {
  test("valid required fields → redirects to list and league appears", async ({ leagueAdminPage: page }) => {
    const name = `Test League ${uid()}`;
    await page.goto("/admin/leagues/new");
    await page.locator(sel.nameInput).fill(name);
    await page.locator(sel.countryInput).fill("Testland");
    // gender defaults to "male" — no interaction needed
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/admin/leagues", { timeout: 10_000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Cleanup
    const res = await page.request.get("/api/leagues");
    const { leagues } = await res.json();
    const created = leagues.find((l: { name: string; id: string }) => l.name === name);
    if (created) await page.request.delete(`/api/leagues/${created.id}`);
  });

  test("missing name → HTML5 validation prevents submission, stays on form", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/leagues/new");
    await page.locator(sel.countryInput).fill("Testland");
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL(/\/admin\/leagues\/new/);
  });

  test("missing country → HTML5 validation prevents submission, stays on form", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/leagues/new");
    await page.locator(sel.nameInput).fill(`League ${uid()}`);
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL(/\/admin\/leagues\/new/);
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit league", () => {
  test("save changes → updated name appears in list", async ({ leagueAdminPage: page }) => {
    const original = `League ${uid()}`;
    const updated = `${original} (edited)`;
    const res = await page.request.post("/api/leagues", {
      data: { name: original, country: "Testland", gender: "male" },
    });
    const { league: { id } } = await res.json();

    try {
      await page.goto(`/admin/leagues/${id}`);
      await page.locator(sel.nameInput).fill(updated);
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/leagues", { timeout: 10_000 });
      await expect(page.getByText(updated, { exact: true })).toBeVisible();
    } finally {
      await page.request.delete(`/api/leagues/${id}`);
    }
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

test.describe("delete league", () => {
  test("confirm delete → league removed from list", async ({ leagueAdminPage: page }) => {
    const name = `League ${uid()}`;
    const res = await page.request.post("/api/leagues", {
      data: { name, country: "Testland", gender: "female" },
    });
    const { league: { id } } = await res.json();

    await page.goto(`/admin/leagues/${id}`);
    await page.locator(sel.deleteButton).click();
    await page.locator(sel.confirmDeleteButton).click();

    await expect(page).toHaveURL("/admin/leagues", { timeout: 10_000 });
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });
});

// ── Season management ─────────────────────────────────────────────────────────

test.describe("new season", () => {
  test("archiving previous season and creating new one shows success toast", async ({ leagueAdminPage: page }) => {
    const name = `League ${uid()}`;
    const res = await page.request.post("/api/leagues", {
      data: {
        name,
        country: "Testland",
        gender: "male",
        season: { currentSeason: "2024/2025", startDate: "2024-01-01", endDate: "2024-12-31" },
      },
    });
    const { league: { id } } = await res.json();

    try {
      await page.goto(`/admin/leagues/${id}`);
      await page.locator(sel.newSeasonButton).click();

      const modal = page.getByRole("dialog");
      await modal.locator(sel.seasonNameInput).fill("2025/2026");
      const dateInputs = modal.locator('input[type="date"]');
      await dateInputs.nth(0).fill("2025-01-01");
      await dateInputs.nth(1).fill("2025-12-31");
      await modal.locator(sel.createSeasonButton).click();

      await expect(page.getByText("Season created", { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/leagues/${id}`);
    }
  });
});

// ── Security ──────────────────────────────────────────────────────────────────

test.describe("security — leagues API", () => {
  test("unauthenticated GET /api/leagues → 401", async ({ page }) => {
    const res = await page.request.get("/api/leagues");
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST /api/leagues → 401", async ({ page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Should fail", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(401);
  });

  test("plain user (no roles) POST /api/leagues → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Should fail", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });

  test("plain user (no roles) DELETE /api/leagues/:id → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.delete("/api/leagues/nonexistent-id");
    expect(res.status()).toBe(403);
  });
});
