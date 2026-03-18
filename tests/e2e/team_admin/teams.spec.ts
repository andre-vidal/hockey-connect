import { test, expect } from "../../fixtures/auth";
import { clubTeams as sel } from "../../helpers/selectors";

/**
 * Team admin — Team view and edit
 *
 * Tests team listing and editing from the perspective of a user with the
 * `team_admin` role. Team admins can view and edit teams assigned to them
 * (via `teamIds` on their user profile) but cannot create or delete teams.
 *
 * API endpoints under test: /api/clubs/[clubId]/teams
 */

function clubId(): string {
  const id = process.env.TEAM_ADMIN_CLUB_ID;
  if (!id) throw new Error("TEAM_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

/** Returns the first team assigned to this team_admin, or skips the test. */
async function getAssignedTeam(page: Parameters<Parameters<typeof test>[1]>[0]["teamAdminPage"]) {
  const res = await page.request.get(`/api/clubs/${clubId()}/teams`);
  const { teams } = await res.json();
  if (!teams?.length) return null;
  return teams[0] as { id: string; name: string; gender: string };
}

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("teams list", () => {
  test("renders the teams list", async ({ teamAdminPage: page }) => {
    await page.goto("/team/teams");
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit team", () => {
  test("save changes → updated name appears in list", async ({ teamAdminPage: page }) => {
    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    const original = team!.name;
    const updated = `${original} (edited)`;

    await page.goto(`/team/teams/${team!.id}`);
    await page.locator(sel.nameInput).fill(updated);
    await page.locator(sel.saveButton).click();

    await expect(page).toHaveURL("/team/teams", { timeout: 10_000 });
    await expect(page.getByText(updated, { exact: true })).toBeVisible();

    // Restore original name
    await page.request.put(`/api/clubs/${clubId()}/teams/${team!.id}`, {
      data: { name: original, gender: team!.gender },
    });
  });

  test("no delete button visible for team_admin", async ({ teamAdminPage: page }) => {
    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    await page.goto(`/team/teams/${team!.id}`);
    await expect(page.getByRole("button", { name: /delete/i })).not.toBeVisible();
  });

  test("team admin field is read-only (assigned by Club Admin label)", async ({ teamAdminPage: page }) => {
    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    await page.goto(`/team/teams/${team!.id}`);
    await expect(page.getByText("assigned by Club Admin", { exact: false })).toBeVisible();
  });
});
