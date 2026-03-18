import { test, expect } from "../../fixtures/auth";
import { clubTeams as sel } from "../../helpers/selectors";

/**
 * Club admin — Team CRUD
 *
 * Tests create, edit, and delete from the perspective of a user with the
 * `club_admin` role. All operations are scoped to the club admin's own club
 * (CLUB_ADMIN_CLUB_ID).
 *
 * API endpoints under test: /api/clubs/[clubId]/teams
 */

const uid = () => Date.now().toString(36);

function clubId(): string {
  const id = process.env.CLUB_ADMIN_CLUB_ID;
  if (!id) throw new Error("CLUB_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("teams list", () => {
  test("renders the teams list with a New Team link", async ({ clubAdminPage: page }) => {
    await page.goto("/club/teams");
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
    await expect(page.locator(sel.newTeamLink)).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create team", () => {
  test("valid required fields → redirects to list and team appears", async ({ clubAdminPage: page }) => {
    const name = `Test Team ${uid()}`;

    await page.goto("/club/teams/new");
    await page.locator(sel.nameInput).fill(name);

    // Gender is required — open the Radix Select and pick "Male"
    await page.locator(sel.genderTrigger).click();
    await page.getByRole("option", { name: "Male", exact: true }).click();

    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/club/teams", { timeout: 10_000 });
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Cleanup
    const res = await page.request.get(`/api/clubs/${clubId()}/teams`);
    const { teams } = await res.json();
    const created = teams.find((t: { name: string; id: string }) => t.name === name);
    if (created) await page.request.delete(`/api/clubs/${clubId()}/teams/${created.id}`);
  });

  test("missing name → shows validation error on submit", async ({ clubAdminPage: page }) => {
    await page.goto("/club/teams/new");

    await page.locator(sel.genderTrigger).click();
    await page.getByRole("option", { name: "Male", exact: true }).click();

    await page.locator(sel.submitButton).click();
    await expect(page.getByText("Validation Error")).toBeVisible();
  });

  test("optional fields saved correctly", async ({ clubAdminPage: page }) => {
    const name = `Team With Details ${uid()}`;

    await page.goto("/club/teams/new");
    await page.locator(sel.nameInput).fill(name);
    await page.locator(sel.genderTrigger).click();
    await page.getByRole("option", { name: "Female", exact: true }).click();
    await page.locator(sel.ageGroupInput).fill("U21");
    await page.locator(sel.divisionInput).fill("Division 1");
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/club/teams", { timeout: 10_000 });

    // Verify via API that optional fields were persisted
    const res = await page.request.get(`/api/clubs/${clubId()}/teams`);
    const { teams } = await res.json();
    const created = teams.find((t: { name: string; id: string; ageGroup?: string }) => t.name === name);
    expect(created?.ageGroup).toBe("U21");

    if (created) await page.request.delete(`/api/clubs/${clubId()}/teams/${created.id}`);
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit team", () => {
  test("save changes → updated name appears in list", async ({ clubAdminPage: page }) => {
    const original = `Team ${uid()}`;
    const updated = `${original} (edited)`;

    const res = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: original, gender: "male" },
    });
    const { team: { id } } = await res.json();

    try {
      await page.goto(`/club/teams/${id}`);
      await page.locator(sel.nameInput).fill(updated);
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/club/teams", { timeout: 10_000 });
      await expect(page.getByText(updated, { exact: true })).toBeVisible();
    } finally {
      await page.request.delete(`/api/clubs/${clubId()}/teams/${id}`);
    }
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

test.describe("delete team", () => {
  test("confirm delete → team removed from list", async ({ clubAdminPage: page }) => {
    const name = `Team ${uid()}`;

    await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name, gender: "male" },
    });

    await page.goto("/club/teams");
    const row = page.getByRole("row").filter({ hasText: name });
    await row.locator(sel.deleteButton).click();
    await page.locator(sel.confirmDeleteButton).click();

    await expect(row).not.toBeVisible({ timeout: 10_000 });
  });
});
