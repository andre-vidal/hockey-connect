import { test, expect } from "../../fixtures/auth";

/**
 * Team admin — Player roster (read-only)
 *
 * Tests player listing and detail view from the perspective of a user with
 * the `team_admin` role. Team admins can view their club's player roster but
 * cannot add, edit, or remove players.
 *
 * API endpoints under test: /api/clubs/[clubId]/players
 */

function clubId(): string {
  const id = process.env.TEAM_ADMIN_CLUB_ID;
  if (!id) throw new Error("TEAM_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── List ──────────────────────────────────────────────────────────────────────

test.describe("players list", () => {
  test("renders the players list with a status filter", async ({ teamAdminPage: page }) => {
    await page.goto("/team/players");
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("no add or invite player actions", async ({ teamAdminPage: page }) => {
    await page.goto("/team/players");
    await expect(page.getByRole("link", { name: /add player/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /invite/i })).not.toBeVisible();
  });

  test("status filter Active hides non-active status badges", async ({ teamAdminPage: page }) => {
    await page.goto("/team/players");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Active", exact: true }).click();

    // With active filter applied, inactive/injured/suspended badges should not appear
    await expect(page.getByText("Inactive", { exact: true })).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Injured", { exact: true })).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Suspended", { exact: true })).not.toBeVisible({ timeout: 5_000 });
  });
});

// ── Player detail ─────────────────────────────────────────────────────────────

test.describe("player detail", () => {
  test("View link navigates to read-only player detail page", async ({ teamAdminPage: page }) => {
    const res = await page.request.get(`/api/clubs/${clubId()}/players`);
    const { players } = await res.json();
    if (!players?.length) test.skip(true, "No players in club");

    await page.goto("/team/players");

    const viewLink = page.getByRole("link", { name: "View" }).first();
    await expect(viewLink).toBeVisible({ timeout: 10_000 });
    await viewLink.click();

    await expect(page).toHaveURL(/\/team\/players\/[^/]+$/, { timeout: 10_000 });

    // Detail page is read-only — no save or edit buttons
    await expect(page.getByRole("button", { name: /save/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /edit/i })).not.toBeVisible();
  });
});
