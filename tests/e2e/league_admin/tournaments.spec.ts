import { test, expect } from "../../fixtures/auth";
import { adminTournaments as sel } from "../../helpers/selectors";

/**
 * League admin — Tournament CRUD
 *
 * Tests create, edit, delete, and league-linking from the perspective
 * of a user with the `league_admin` role.
 */

const uid = () => Date.now().toString(36);

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("tournament list", () => {
  test("renders the tournaments list with a New Tournament link", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/tournaments");
    await expect(page.getByRole("heading", { name: "Tournaments" })).toBeVisible();
    await expect(page.locator(sel.newTournamentLink)).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create tournament", () => {
  test("valid required fields → redirects to list and tournament appears", async ({ leagueAdminPage: page }) => {
    const name = `Test Tournament ${uid()}`;
    await page.goto("/admin/tournaments/new");
    await page.locator(sel.nameInput).fill(name);
    await page.locator(sel.venueInput).fill("National Stadium");
    await page.locator(sel.startDateInput).fill("2026-03-01");
    await page.locator(sel.endDateInput).fill("2026-03-15");
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/admin/tournaments", { timeout: 10_000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Cleanup
    const res = await page.request.get("/api/tournaments");
    const { tournaments } = await res.json();
    const created = tournaments.find((t: { name: string; id: string }) => t.name === name);
    if (created) await page.request.delete(`/api/tournaments/${created.id}`);
  });

  test("missing name → validation prevents submission, stays on form", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/tournaments/new");
    await page.locator(sel.venueInput).fill("Venue");
    await page.locator(sel.startDateInput).fill("2026-03-01");
    await page.locator(sel.endDateInput).fill("2026-03-15");
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL(/\/admin\/tournaments\/new/);
  });

  test("missing venue → validation prevents submission, stays on form", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/tournaments/new");
    await page.locator(sel.nameInput).fill(`Tournament ${uid()}`);
    await page.locator(sel.startDateInput).fill("2026-03-01");
    await page.locator(sel.endDateInput).fill("2026-03-15");
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL(/\/admin\/tournaments\/new/);
  });

  test("tournament linked to an existing league → saved with leagueId", async ({ leagueAdminPage: page }) => {
    // Create a league to link to
    const leagueRes = await page.request.post("/api/leagues", {
      data: { name: `League ${uid()}`, country: "Testland", gender: "male" },
    });
    const { league: { id: leagueId, name: leagueName } } = await leagueRes.json();

    const tournamentName = `Linked Tournament ${uid()}`;
    await page.goto("/admin/tournaments/new");
    await page.locator(sel.nameInput).fill(tournamentName);
    await page.locator(sel.venueInput).fill("Test Venue");
    await page.locator(sel.startDateInput).fill("2026-04-01");
    await page.locator(sel.endDateInput).fill("2026-04-07");

    // Open the league select and pick the league
    await page.locator("#leagueId").click();
    await page.getByRole("option", { name: leagueName, exact: true }).click();

    await page.locator(sel.submitButton).click();
    await expect(page).toHaveURL("/admin/tournaments", { timeout: 10_000 });

    // Verify leagueId was saved via API
    const listRes = await page.request.get("/api/tournaments");
    const { tournaments } = await listRes.json();
    const created = tournaments.find((t: { name: string; id: string; leagueId?: string }) => t.name === tournamentName);
    expect(created?.leagueId).toBe(leagueId);

    // Cleanup
    if (created) await page.request.delete(`/api/tournaments/${created.id}`);
    await page.request.delete(`/api/leagues/${leagueId}`);
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit tournament", () => {
  test("save changes → updated name appears in list", async ({ leagueAdminPage: page }) => {
    const original = `Tournament ${uid()}`;
    const updated = `${original} (edited)`;
    const res = await page.request.post("/api/tournaments", {
      data: { name: original, venue: "Venue", startDate: "2026-05-01", endDate: "2026-05-10" },
    });
    const { tournament: { id } } = await res.json();

    try {
      await page.goto(`/admin/tournaments/${id}`);
      await page.locator(sel.nameInput).fill(updated);
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/tournaments", { timeout: 10_000 });
      await expect(page.getByText(updated, { exact: true })).toBeVisible();
    } finally {
      await page.request.delete(`/api/tournaments/${id}`);
    }
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

test.describe("delete tournament", () => {
  test("confirm delete → tournament removed from list", async ({ leagueAdminPage: page }) => {
    const name = `Tournament ${uid()}`;
    await page.request.post("/api/tournaments", {
      data: { name, venue: "Venue", startDate: "2026-06-01", endDate: "2026-06-10" },
    });

    await page.goto("/admin/tournaments");
    const row = page.getByRole("row").filter({ hasText: name });
    await row.locator(sel.deleteButton).click();
    await page.locator(sel.confirmDeleteButton).click();

    await expect(row).not.toBeVisible({ timeout: 10_000 });
  });
});
