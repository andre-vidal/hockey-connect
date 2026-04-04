import { test, expect } from "../../fixtures/auth";
import { teamSquads as sel } from "../../helpers/selectors";

/**
 * Team admin — Squad management
 *
 * Tests squad creation, player management, and submission from the perspective
 * of a user with the `team_admin` role. Squads are scoped to the teams
 * assigned to this team admin (via `teamIds` on their user profile).
 *
 * Requires:
 *   TEAM_ADMIN_CLUB_ID        — the club this team admin belongs to
 *   TEAM_ADMIN_OPEN_LEAGUE_ID — a pre-seeded league with an open setup window
 * API endpoints under test: /api/squads
 */

const uid = () => Date.now().toString(36);

function clubId(): string {
  const id = process.env.TEAM_ADMIN_CLUB_ID;
  if (!id) throw new Error("TEAM_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

/** Returns the first team assigned to this team_admin, or null. */
async function getAssignedTeam(
  page: Parameters<Parameters<typeof test>[1]>[0]["teamAdminPage"],
) {
  const res = await page.request.get(`/api/clubs/${clubId()}/teams`);
  const { teams } = await res.json();
  if (!teams?.length) return null;
  return teams[0] as { id: string; name: string };
}

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("squads list", () => {
  test("renders the squads list with a New Squad link", async ({
    teamAdminPage: page,
  }) => {
    await page.goto("/team/squads");
    await expect(page.getByRole("heading", { name: "Squads" })).toBeVisible();
    await expect(page.locator(sel.newSquadLink)).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create squad", () => {
  test("new squad form renders team and competition-type selects", async ({
    teamAdminPage: page,
  }) => {
    await page.goto("/team/squads/new");
    await expect(
      page.getByRole("heading", { name: "New Squad" }),
    ).toBeVisible();
    await expect(page.locator(sel.teamTrigger)).toBeVisible();
    await expect(
      page.locator("form").getByRole("button", { name: "League", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("form")
        .getByRole("button", { name: "Tournament", exact: true }),
    ).toBeVisible();
  });

  test("valid squad → navigates to squad management page", async ({
    teamAdminPage: page,
  }) => {
    const leagueId = process.env.TEAM_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "TEAM_ADMIN_OPEN_LEAGUE_ID not set");

    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    let squadId: string | undefined;
    try {
      await page.goto("/team/squads/new");

      await page.locator(sel.teamTrigger).click();
      await page.getByRole("option", { name: team!.name, exact: true }).click();

      await page
        .locator("form")
        .getByRole("button", { name: "League", exact: true })
        .click();
      await page.locator(sel.leagueTrigger).click();
      await page
        .getByRole("option", { name: "Demo League (Open)", exact: true })
        .click();

      await page.locator(sel.seasonInput).fill("2025/2026");
      await page.locator(sel.submitButton).click();

      await expect(page).toHaveURL(/\/team\/squads\/[^/]+$/, { timeout: 10_000 });
      await expect(
        page.getByRole("heading", { name: "Squad Management" }),
      ).toBeVisible();

      squadId = page.url().split("/").pop()!;
    } finally {
      if (squadId) await page.request.delete(`/api/squads/${squadId}`).catch(() => {});
    }
  });
});

// ── Manage squad ──────────────────────────────────────────────────────────────

test.describe("manage squad", () => {
  test("can add a player to a draft squad", async ({ teamAdminPage: page }) => {
    const leagueId = process.env.TEAM_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "TEAM_ADMIN_OPEN_LEAGUE_ID not set");

    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    const playersRes = await page.request.get(
      `/api/clubs/${clubId()}/players?status=active`,
    );
    const { players } = await playersRes.json();
    if (!players?.length) test.skip(true, "No active players in club");
    const player = players[0] as {
      id: string;
      firstName: string;
      lastName: string;
    };

    const squadRes = await page.request.post("/api/squads", {
      data: {
        clubId: clubId(),
        teamId: team!.id,
        leagueId,
        season: "2025/2026",
      },
    });
    const { squad } = await squadRes.json();

    try {
      await page.goto(`/team/squads/${squad.id}`);
      await expect(
        page.getByRole("heading", { name: "Squad Management" }),
      ).toBeVisible();

      // Select player (first combobox)
      await page.getByRole("combobox").nth(0).click();
      await page
        .getByRole("option", {
          name: `${player.firstName} ${player.lastName}`,
          exact: true,
        })
        .click();

      // Select position (second combobox)
      await page.getByRole("combobox").nth(1).click();
      await page.getByRole("option", { name: "Defender" }).click();

      // Enter jersey number
      await page.locator('input[placeholder="e.g. 10"]').fill("5");

      await page.getByRole("button", { name: "Add to Squad" }).click();

      await expect(
        page.getByText(`${player.firstName} ${player.lastName}`, {
          exact: true,
        }),
      ).toBeVisible({ timeout: 10_000 });

      // Cleanup: remove player from squad via trash icon
      await page
        .getByRole("button")
        .filter({ has: page.locator(".lucide-trash-2") })
        .click();
      await expect(
        page.getByText(`${player.firstName} ${player.lastName}`, {
          exact: true,
        }),
      ).not.toBeVisible({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/squads/${squad.id}`);
    }
  });

  test("submit for approval → status badge changes to submitted", async ({
    teamAdminPage: page,
  }) => {
    const leagueId = process.env.TEAM_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "TEAM_ADMIN_OPEN_LEAGUE_ID not set");

    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    const playersRes = await page.request.get(
      `/api/clubs/${clubId()}/players?status=active`,
    );
    const { players } = await playersRes.json();
    if (!players?.length) test.skip(true, "No active players in club");
    const player = players[0] as { id: string; position: string };

    // Create squad and add a player via API so the Submit button is enabled
    const squadRes = await page.request.post("/api/squads", {
      data: {
        clubId: clubId(),
        teamId: team!.id,
        leagueId,
        season: "2025/2026",
      },
    });
    const { squad } = await squadRes.json();
    await page.request.put(`/api/squads/${squad.id}`, {
      data: {
        players: [
          {
            playerId: player.id,
            jerseyNumber: 9,
            position: player.position ?? "defender",
          },
        ],
      },
    });

    try {
      await page.goto(`/team/squads/${squad.id}`);
      await page.locator(sel.submitForApprovalButton).click();

      await expect(
        page.getByText("Squad submitted", { exact: true }),
      ).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText("submitted", { exact: true })).toBeVisible();

      // Submit button disappears after submission
      await expect(page.locator(sel.submitForApprovalButton)).not.toBeVisible();
    } finally {
      await page.request.delete(`/api/squads/${squad.id}`);
    }
  });

  test("submitted squad does not show Add Player form", async ({
    teamAdminPage: page,
  }) => {
    const leagueId = process.env.TEAM_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "TEAM_ADMIN_OPEN_LEAGUE_ID not set");

    const team = await getAssignedTeam(page);
    if (!team) test.skip(true, "No teams assigned to TEAM_ADMIN");

    const squadRes = await page.request.post("/api/squads", {
      data: {
        clubId: clubId(),
        teamId: team!.id,
        leagueId,
        season: "2025/2026",
      },
    });
    const { squad } = await squadRes.json();
    await page.request.put(`/api/squads/${squad.id}`, {
      data: { status: "submitted" },
    });

    try {
      await page.goto(`/team/squads/${squad.id}`);
      await expect(page.getByText("Add Player")).not.toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await page.request.delete(`/api/squads/${squad.id}`);
    }
  });
});
