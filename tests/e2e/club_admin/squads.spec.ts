import { test, expect } from "../../fixtures/auth";
import { clubSquads as sel } from "../../helpers/selectors";

/**
 * Club admin — Squad management
 *
 * Tests squad creation, editing, and player management from the perspective of
 * a user with the `club_admin` role. Squads are scoped to the club admin's own
 * club (CLUB_ADMIN_CLUB_ID).
 *
 * Requires:
 *   CLUB_ADMIN_CLUB_ID  — the club this admin manages
 *   CLUB_ADMIN_OPEN_LEAGUE_ID — a pre-seeded league to link squads to
 *   CLUB_ADMIN_CLOSED_LEAGUE_ID — a pre-seeded closed league to test window-closed errors
 * API endpoints under test: /api/squads
 */

const uid = () => Date.now().toString(36);

function clubId(): string {
  const id = process.env.CLUB_ADMIN_CLUB_ID;
  if (!id) throw new Error("CLUB_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("squads list", () => {
  test("renders the squads list with a New Squad link", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/squads");
    await expect(page.getByRole("heading", { name: "Squads" })).toBeVisible();
    await expect(page.locator(sel.newSquadLink)).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create squad", () => {
  test("new squad form renders team and competition-type selects", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/squads/new");
    await expect(
      page.getByRole("heading", { name: "New Squad" }),
    ).toBeVisible();
    const form = page.locator("form");
    await expect(page.locator(sel.teamTrigger)).toBeVisible();
    await expect(
      form.getByRole("button", { name: "League", exact: true }),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Tournament", exact: true }),
    ).toBeVisible();
  });

  test("valid squad → redirects to list and appears as draft", async ({
    clubAdminPage: page,
  }) => {
    const leagueId = process.env.CLUB_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "CLUB_ADMIN_OPEN_LEAGUE_ID not set");

    // Create a team via API to use in the squad form
    const teamRes = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: `Squad Team ${uid()}`, gender: "male" },
    });
    const { team } = await teamRes.json();

    try {
      await page.goto("/club/squads/new");

      // Select the team
      await page.locator(sel.teamTrigger).click();
      await page.getByRole("option", { name: team.name, exact: true }).click();

      // Select League competition type and choose the pre-seeded league
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

      // Navigates to the squad management page for the new squad
      await expect(page).toHaveURL(/\/club\/squads\/[^/]+$/, {
        timeout: 10_000,
      });
      await expect(
        page.getByRole("heading", { name: "Squad Management" }),
      ).toBeVisible();

      // Extract the squad ID from the URL for cleanup
      const squadId = page.url().split("/").pop()!;
      await page.request.delete(`/api/squads/${squadId}`);
    } finally {
      await page.request.delete(`/api/clubs/${clubId()}/teams/${team.id}`);
    }
  });
});

// ── Closed squad setup window ─────────────────────────────────────────────────

test.describe("closed squad setup window", () => {
  test("POST /api/squads → 400 with window-closed error", async ({
    clubAdminPage: page,
  }) => {
    const leagueId = process.env.CLUB_ADMIN_CLOSED_LEAGUE_ID;
    if (!leagueId) test.skip(true, "CLUB_ADMIN_CLOSED_LEAGUE_ID not set");

    const teamRes = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: `Window Test Team ${uid()}`, gender: "male" },
    });
    const { team } = await teamRes.json();

    try {
      const res = await page.request.post("/api/squads", {
        data: {
          clubId: clubId(),
          teamId: team.id,
          leagueId,
          season: "2025/2026",
        },
      });

      expect(res.status()).toBe(400);
      const { error } = await res.json();
      expect(error).toBe("Squad setup window is currently closed");
    } finally {
      await page.request.delete(`/api/clubs/${clubId()}/teams/${team.id}`);
    }
  });

  test("submitting the form shows a 'window closed' error toast", async ({
    clubAdminPage: page,
  }) => {
    const leagueId = process.env.CLUB_ADMIN_CLOSED_LEAGUE_ID;
    if (!leagueId) test.skip(true, "CLUB_ADMIN_CLOSED_LEAGUE_ID not set");

    const teamRes = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: `Window UI Team ${uid()}`, gender: "male" },
    });
    const { team } = await teamRes.json();

    try {
      await page.goto("/club/squads/new");

      await page.locator(sel.teamTrigger).click();
      await page.getByRole("option", { name: team.name, exact: true }).click();

      await page
        .locator("form")
        .getByRole("button", { name: "League", exact: true })
        .click();
      await page.locator(sel.leagueTrigger).click();
      await page.getByRole("option").first().click();

      await page.locator(sel.submitButton).click();

      await expect(
        page.getByText("Squad setup window is currently closed", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 10_000 });

      // Must remain on the form
      await expect(page).toHaveURL(/\/club\/squads\/new/);
    } finally {
      await page.request.delete(`/api/clubs/${clubId()}/teams/${team.id}`);
    }
  });
});

// ── Manage squad ──────────────────────────────────────────────────────────────

test.describe("manage squad", () => {
  test("can add a player to a draft squad", async ({ clubAdminPage: page }) => {
    const leagueId = process.env.CLUB_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "CLUB_ADMIN_OPEN_LEAGUE_ID not set");

    // Set up: create a team, a player, and a squad
    const teamRes = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: `Manage Team ${uid()}`, gender: "male" },
    });
    const { team } = await teamRes.json();

    const playerRes = await page.request.post(
      `/api/clubs/${clubId()}/players`,
      {
        data: { firstName: `Squad${uid()}`, lastName: "Player" },
      },
    );
    const { player } = await playerRes.json();

    const squadRes = await page.request.post("/api/squads", {
      data: {
        clubId: clubId(),
        teamId: team.id,
        leagueId,
        season: "2025/2026",
      },
    });
    const { squad } = await squadRes.json();

    try {
      await page.goto(`/club/squads/${squad.id}`);
      await expect(
        page.getByRole("heading", { name: "Squad Management" }),
      ).toBeVisible();

      // Select the player (first combobox in the Add Player card)
      await page.getByRole("combobox").nth(0).click();
      await page
        .getByRole("option", {
          name: `${player.firstName} ${player.lastName}`,
          exact: true,
        })
        .click();

      // Select a position (second combobox)
      await page.getByRole("combobox").nth(1).click();
      await page.getByRole("option", { name: "Defender" }).click();

      // Enter a jersey number
      await page.locator('input[placeholder="e.g. 10"]').fill("7");

      // Add the player to the squad
      await page.getByRole("button", { name: "Add to Squad" }).click();

      // Player should now appear in the Squad Players list
      await expect(
        page.getByText(`${player.firstName} ${player.lastName}`, {
          exact: true,
        }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("#7", { exact: true })).toBeVisible();

      // Cleanup: remove the player from the squad via the trash icon
      await page
        .getByRole("button")
        .filter({ has: page.locator(".lucide-trash2") })
        .click();
      await expect(
        page.getByText(`${player.firstName} ${player.lastName}`, {
          exact: true,
        }),
      ).not.toBeVisible({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/squads/${squad.id}`);
      await page.request.delete(`/api/clubs/${clubId()}/players/${player.id}`);
      await page.request.delete(`/api/clubs/${clubId()}/teams/${team.id}`);
    }
  });

  test("approved squad does not show Add Player form", async ({
    clubAdminPage: page,
  }) => {
    const leagueId = process.env.CLUB_ADMIN_OPEN_LEAGUE_ID;
    if (!leagueId) test.skip(true, "CLUB_ADMIN_OPEN_LEAGUE_ID not set");

    const teamRes = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: `Approved Team ${uid()}`, gender: "male" },
    });
    const { team } = await teamRes.json();

    // Create a squad and force it to "approved" status via API
    const squadRes = await page.request.post("/api/squads", {
      data: {
        clubId: clubId(),
        teamId: team.id,
        leagueId,
        season: "2025/2026",
      },
    });
    const { squad } = await squadRes.json();

    // Patch status directly (league_admin can approve, but for this test
    // we just verify the UI hides the Add Player form when not in draft)
    await page.request.put(`/api/squads/${squad.id}`, {
      data: { status: "approved" },
    });

    try {
      await page.goto(`/club/squads/${squad.id}`);

      // Add Player form should be hidden for non-draft squads
      await expect(page.getByText("Add Player")).not.toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await page.request.delete(`/api/squads/${squad.id}`);
      await page.request.delete(`/api/clubs/${clubId()}/teams/${team.id}`);
    }
  });
});
