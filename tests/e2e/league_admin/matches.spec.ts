import { test, expect } from "../../fixtures/auth";
import { adminMatches as sel } from "../../helpers/selectors";

/**
 * League admin — Match CRUD
 *
 * Tests create, edit, delete, and calendar/list views from the perspective
 * of a user with the `league_admin` role.
 *
 * Strategy:
 *   - Most tests seed required fixtures (league, clubs, teams) via the API
 *     before the test and clean them up afterwards.
 *   - UI-based creation tests verify the full form flow end-to-end.
 */

const uid = () => Date.now().toString(36);

/** Creates all required fixtures for a match: league + 2 clubs + 2 teams */
async function seedMatchFixtures(page: Parameters<typeof test>[1] extends { leagueAdminPage: infer P } ? P : never) {
  const leagueRes = await page.request.post("/api/leagues", {
    data: { name: `Match League ${uid()}`, country: "Testland", gender: "male" },
  });
  const { league } = await leagueRes.json();

  const club1Res = await page.request.post("/api/clubs", {
    data: { name: `Club A ${uid()}`, country: "Testland" },
  });
  const { club: club1 } = await club1Res.json();

  const club2Res = await page.request.post("/api/clubs", {
    data: { name: `Club B ${uid()}`, country: "Testland" },
  });
  const { club: club2 } = await club2Res.json();

  const team1Res = await page.request.post(`/api/clubs/${club1.id}/teams`, {
    data: { name: "First XI", gender: "male" },
  });
  const { team: team1 } = await team1Res.json();

  const team2Res = await page.request.post(`/api/clubs/${club2.id}/teams`, {
    data: { name: "First XI", gender: "male" },
  });
  const { team: team2 } = await team2Res.json();

  return { league, club1, club2, team1, team2 };
}

async function cleanupFixtures(
  page: Parameters<typeof test>[1] extends { leagueAdminPage: infer P } ? P : never,
  ids: { leagueId: string; clubId1: string; clubId2: string }
) {
  await page.request.delete(`/api/leagues/${ids.leagueId}`);
  await page.request.delete(`/api/clubs/${ids.clubId1}`);
  await page.request.delete(`/api/clubs/${ids.clubId2}`);
}

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("match list", () => {
  test("renders the matches list with a New Match link", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
    await expect(page.locator(sel.newMatchLink)).toBeVisible();
  });
});

// ── API-level CRUD ────────────────────────────────────────────────────────────

test.describe("match API", () => {
  test("create match via API → appears in list page", async ({ leagueAdminPage: page }) => {
    const { league, club1, club2, team1, team2 } = await seedMatchFixtures(page);

    const matchRes = await page.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: team1.id,
        homeTeamName: `${club1.name} — ${team1.name}`,
        homeClubId: club1.id,
        awayTeamId: team2.id,
        awayTeamName: `${club2.name} — ${team2.name}`,
        awayClubId: club2.id,
        venue: "National Stadium",
        scheduledAt: "2026-06-15T15:00:00.000Z",
      },
    });
    expect(matchRes.status()).toBe(201);
    const { match } = await matchRes.json();
    expect(match.id).toBeTruthy();
    expect(match.status).toBe("scheduled");

    try {
      await page.goto("/admin/matches");
      await expect(page.getByText("National Stadium")).toBeVisible();
    } finally {
      await page.request.delete(`/api/matches/${match.id}`);
      await cleanupFixtures(page, { leagueId: league.id, clubId1: club1.id, clubId2: club2.id });
    }
  });

  test("create match with same home and away team → rejected (400)", async ({ leagueAdminPage: page }) => {
    const { league, club1, team1, club2 } = await seedMatchFixtures(page);
    try {
      const res = await page.request.post("/api/matches", {
        data: {
          leagueId: league.id,
          homeTeamId: team1.id,
          awayTeamId: team1.id,
          venue: "Stadium",
          scheduledAt: "2026-06-15T15:00:00.000Z",
        },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("different");
    } finally {
      await cleanupFixtures(page, { leagueId: league.id, clubId1: club1.id, clubId2: club2.id });
    }
  });

  test("patch match status → status updates in list", async ({ leagueAdminPage: page }) => {
    const { league, club1, club2, team1, team2 } = await seedMatchFixtures(page);

    const matchRes = await page.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: team1.id,
        homeTeamName: "Home",
        homeClubId: club1.id,
        awayTeamId: team2.id,
        awayTeamName: "Away",
        awayClubId: club2.id,
        venue: "Test Stadium",
        scheduledAt: "2026-07-01T10:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    try {
      const patchRes = await page.request.patch(`/api/matches/${match.id}`, {
        data: { status: "warmup" },
      });
      expect(patchRes.status()).toBe(200);
      const { match: updated } = await patchRes.json();
      expect(updated.status).toBe("warmup");
    } finally {
      await page.request.delete(`/api/matches/${match.id}`);
      await cleanupFixtures(page, { leagueId: league.id, clubId1: club1.id, clubId2: club2.id });
    }
  });

  test("delete non-scheduled match → rejected (400)", async ({ leagueAdminPage: page }) => {
    const { league, club1, club2, team1, team2 } = await seedMatchFixtures(page);

    const matchRes = await page.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: team1.id,
        homeTeamName: "Home",
        homeClubId: club1.id,
        awayTeamId: team2.id,
        awayTeamName: "Away",
        awayClubId: club2.id,
        venue: "Stadium",
        scheduledAt: "2026-08-01T10:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    // Advance status to completed
    await page.request.patch(`/api/matches/${match.id}`, { data: { status: "completed" } });

    try {
      const deleteRes = await page.request.delete(`/api/matches/${match.id}`);
      expect(deleteRes.status()).toBe(400);
    } finally {
      // Force cleanup by patching back to scheduled first
      await page.request.patch(`/api/matches/${match.id}`, { data: { status: "scheduled" } });
      await page.request.delete(`/api/matches/${match.id}`);
      await cleanupFixtures(page, { leagueId: league.id, clubId1: club1.id, clubId2: club2.id });
    }
  });

  test("unauthenticated request to create match → 401", async ({ page }) => {
    const res = await page.request.post("/api/matches", {
      data: { leagueId: "x", homeTeamId: "a", awayTeamId: "b", venue: "v", scheduledAt: "2026-01-01T10:00:00Z" },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Edit via UI ───────────────────────────────────────────────────────────────

test.describe("edit match", () => {
  test("save venue change → updated venue appears in list", async ({ leagueAdminPage: page }) => {
    const { league, club1, club2, team1, team2 } = await seedMatchFixtures(page);

    const matchRes = await page.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: team1.id,
        homeTeamName: "Home",
        homeClubId: club1.id,
        awayTeamId: team2.id,
        awayTeamName: "Away",
        awayClubId: club2.id,
        venue: "Old Stadium",
        scheduledAt: "2026-09-01T14:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    try {
      await page.goto(`/admin/matches/${match.id}`);
      await page.locator(sel.venueInput).clear();
      await page.locator(sel.venueInput).fill("New Arena");
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/matches", { timeout: 10_000 });
      await expect(page.getByText("New Arena")).toBeVisible();
    } finally {
      await page.request.delete(`/api/matches/${match.id}`);
      await cleanupFixtures(page, { leagueId: league.id, clubId1: club1.id, clubId2: club2.id });
    }
  });
});

// ── Delete via UI ─────────────────────────────────────────────────────────────

test.describe("delete match", () => {
  test("delete scheduled match via UI → removed from list", async ({ leagueAdminPage: page }) => {
    const { league, club1, club2, team1, team2 } = await seedMatchFixtures(page);

    const matchRes = await page.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: team1.id,
        homeTeamName: "DeleteHome",
        homeClubId: club1.id,
        awayTeamId: team2.id,
        awayTeamName: "DeleteAway",
        awayClubId: club2.id,
        venue: "Delete Stadium",
        scheduledAt: "2026-10-01T10:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    try {
      await page.goto(`/admin/matches/${match.id}`);
      await page.locator(sel.deleteButton).click();
      await page.locator(sel.confirmDeleteButton).click();

      await expect(page).toHaveURL("/admin/matches", { timeout: 10_000 });
      await expect(page.getByText("Delete Stadium")).not.toBeVisible();
    } finally {
      // Cleanup in case test failed before deletion
      await page.request.delete(`/api/matches/${match.id}`).catch(() => {});
      await cleanupFixtures(page, { leagueId: league.id, clubId1: club1.id, clubId2: club2.id });
    }
  });
});

// ── Calendar ──────────────────────────────────────────────────────────────────

test.describe("calendar views", () => {
  test("official calendar page renders calendar grid", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    // Month/List toggle tabs should be visible
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
  });

  test("team calendar page renders calendar grid", async ({ teamAdminPage: page }) => {
    await page.goto("/team/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
  });

  test("public calendar page renders", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  test("public matches page renders", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  });
});

// ── Role access ───────────────────────────────────────────────────────────────

test.describe("role access", () => {
  test("non-admin cannot access match create page", async ({ teamAdminPage: page }) => {
    await page.goto("/admin/matches/new");
    // Should be redirected or blocked
    await expect(page).not.toHaveURL("/admin/matches/new", { timeout: 5_000 });
  });
});
