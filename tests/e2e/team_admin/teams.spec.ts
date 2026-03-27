import { test, expect } from "../../fixtures/auth";

/**
 * Team admin — Team view
 *
 * Tests team listing from the perspective of a user with the `team_admin` role.
 * Team admins can view teams assigned to them but cannot create, edit, or delete them.
 * Team admin assignment is managed by the club admin.
 *
 * API endpoints under test: /api/clubs/[clubId]/teams
 */

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("teams list", () => {
  test("renders the teams list", async ({ teamAdminPage: page }) => {
    await page.goto("/team/teams");
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
  });
});
