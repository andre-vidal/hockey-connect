import { test, expect } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Team admin — Match views (Phase 4)
 *
 * Covers:
 *   - /team/matches page: renders, shows team's matches
 *   - /team/calendar page: renders with month/list toggle
 *   - Matches filtered to the team admin's club
 *   - Result column visible (team admins can see final scores)
 *
 * API security (POST/PATCH/DELETE → 403) is covered in security.spec.ts.
 */

function clubId(): string {
  const id = process.env.TEAM_ADMIN_CLUB_ID;
  if (!id) throw new Error("TEAM_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── Page render ───────────────────────────────────────────────────────────────

test.describe("team admin matches page", () => {
  test("renders /team/matches with heading", async ({ teamAdminPage: page }) => {
    await page.goto("/team/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  });

  test("search input is present", async ({ teamAdminPage: page }) => {
    await page.goto("/team/matches");
    await expect(page.getByPlaceholder("Search matches...")).toBeVisible();
  });

  test("date/time and result columns are present", async ({ teamAdminPage: page }) => {
    await page.goto("/team/matches");
    await expect(page.getByRole("columnheader", { name: "Date & Time" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Result" })).toBeVisible();
  });
});

// ── Calendar page ─────────────────────────────────────────────────────────────

test.describe("team admin calendar page", () => {
  test("renders /team/calendar with heading", async ({ teamAdminPage: page }) => {
    await page.goto("/team/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  test("month/list view tabs are visible", async ({ teamAdminPage: page }) => {
    await page.goto("/team/calendar");
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
  });

  test("can toggle to list view", async ({ teamAdminPage: page }) => {
    await page.goto("/team/calendar");
    await page.getByRole("tab", { name: "List" }).click();
    await expect(page.getByRole("tab", { name: "List" })).toHaveAttribute("data-state", "active");
  });

  test("month grid shows current month/year label", async ({ teamAdminPage: page }) => {
    await page.goto("/team/calendar");
    const now = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    await expect(page.getByText(monthNames[now.getMonth()])).toBeVisible();
  });
});

// ── Data visibility ───────────────────────────────────────────────────────────

test.describe("team admin sees their club's matches", () => {
  test("match involving team admin's club appears on /team/matches", async ({
    leagueAdminPage: adminPage,
    teamAdminPage: teamPage,
  }) => {
    const ownClubId = clubId();

    const leagueRes = await adminPage.request.post("/api/leagues", {
      data: { name: `Team Match League ${Date.now()}`, country: "Testland", gender: "male" },
    });
    const { league } = await leagueRes.json();

    const awayClubRes = await adminPage.request.post("/api/clubs", {
      data: { name: `Opponent ${Date.now()}`, country: "Testland" },
    });
    const { club: awayClub } = await awayClubRes.json();

    const homeTeamRes = await adminPage.request.post(`/api/clubs/${ownClubId}/teams`, {
      data: { name: `Team Match XI ${Date.now()}`, gender: "male" },
    });
    const { team: homeTeam } = await homeTeamRes.json();

    const awayTeamRes = await adminPage.request.post(`/api/clubs/${awayClub.id}/teams`, {
      data: { name: "Visitor XI", gender: "male" },
    });
    const { team: awayTeam } = await awayTeamRes.json();

    const matchRes = await adminPage.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: homeTeam.id,
        homeTeamName: "Team Admin Home",
        homeClubId: ownClubId,
        awayTeamId: awayTeam.id,
        awayTeamName: "Visitor",
        awayClubId: awayClub.id,
        venue: "Team Admin Stadium",
        scheduledAt: "2026-11-20T14:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    try {
      await teamPage.goto("/team/matches");
      await expect(teamPage.getByText("Team Admin Stadium")).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminPage.request.delete(`/api/matches/${match.id}`).catch(() => {});
      await adminPage.request.delete(`/api/clubs/${awayClub.id}`).catch(() => {});
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
      await adminPage.request.delete(`/api/clubs/${ownClubId}/teams/${homeTeam.id}`).catch(() => {});
    }
  });

  test("match not involving team admin's club is filtered out", async ({
    leagueAdminPage: adminPage,
    teamAdminPage: teamPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const uniqueVenue = `Foreign Pitch ${Date.now()}`;
    const match = await seedMatch(adminPage.request, fx, { venue: uniqueVenue });

    try {
      await teamPage.goto("/team/matches");
      await expect(teamPage.getByText(uniqueVenue)).not.toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("completed match shows result dash when no result set", async ({
    leagueAdminPage: adminPage,
    teamAdminPage: teamPage,
  }) => {
    const ownClubId = clubId();

    const leagueRes = await adminPage.request.post("/api/leagues", {
      data: { name: `Result League ${Date.now()}`, country: "Testland", gender: "male" },
    });
    const { league } = await leagueRes.json();

    const awayClubRes = await adminPage.request.post("/api/clubs", {
      data: { name: `Result Away ${Date.now()}`, country: "Testland" },
    });
    const { club: awayClub } = await awayClubRes.json();

    const homeTeamRes = await adminPage.request.post(`/api/clubs/${ownClubId}/teams`, {
      data: { name: `Result XI ${Date.now()}`, gender: "male" },
    });
    const { team: homeTeam } = await homeTeamRes.json();

    const awayTeamRes = await adminPage.request.post(`/api/clubs/${awayClub.id}/teams`, {
      data: { name: "Result Away XI", gender: "male" },
    });
    const { team: awayTeam } = await awayTeamRes.json();

    const matchRes = await adminPage.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: homeTeam.id,
        homeTeamName: "Home",
        homeClubId: ownClubId,
        awayTeamId: awayTeam.id,
        awayTeamName: "Away",
        awayClubId: awayClub.id,
        venue: "Result Pitch",
        scheduledAt: "2026-01-10T10:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    await adminPage.request.patch(`/api/matches/${match.id}`, { data: { status: "completed" } });

    try {
      await teamPage.goto("/team/matches");
      await expect(teamPage.getByText("Result Pitch")).toBeVisible({ timeout: 10_000 });
      // Result column shows "—" when no result is set
      await expect(teamPage.getByText("—").first()).toBeVisible();
    } finally {
      await adminPage.request.patch(`/api/matches/${match.id}`, { data: { status: "scheduled" } }).catch(() => {});
      await adminPage.request.delete(`/api/matches/${match.id}`).catch(() => {});
      await adminPage.request.delete(`/api/clubs/${awayClub.id}`).catch(() => {});
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
      await adminPage.request.delete(`/api/clubs/${ownClubId}/teams/${homeTeam.id}`).catch(() => {});
    }
  });
});

// ── API access ────────────────────────────────────────────────────────────────

test.describe("team admin API access", () => {
  test("GET /api/matches → 200", async ({ teamAdminPage: page }) => {
    const res = await page.request.get("/api/matches");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.matches)).toBe(true);
  });

  test("POST /api/matches → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/matches", {
      data: { leagueId: "x", homeTeamId: "a", awayTeamId: "b", venue: "v", scheduledAt: "2026-01-01T10:00:00Z" },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/matches/:id → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.delete("/api/matches/nonexistent-id");
    expect(res.status()).toBe(403);
  });

  test("PATCH /api/matches/:id → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.patch("/api/matches/nonexistent-id", {
      data: { status: "live" },
    });
    expect(res.status()).toBe(403);
  });
});
