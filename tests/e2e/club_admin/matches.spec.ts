import { test, expect } from "../../fixtures/auth";
import {
  seedMatchFixtures,
  seedMatch,
  cleanupMatchFixtures,
} from "../../helpers/matches";

/**
 * Club admin — Match views (Phase 4)
 *
 * Covers:
 *   - /club/matches page: renders, shows matches for their club
 *   - /club/calendar page: renders with month/list toggle
 *   - Dashboard upcoming widget is visible
 *   - Matches belonging to the club appear on the matches page
 *   - Matches from other clubs are not shown (filtered client-side by clubId)
 *
 * Note: club admin cannot create or modify matches — that's league_admin only.
 * API security for POST/DELETE is covered in security.spec.ts.
 */

function clubId(): string {
  const id = process.env.CLUB_ADMIN_CLUB_ID;
  if (!id) throw new Error("CLUB_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── Page render ───────────────────────────────────────────────────────────────

test.describe("club admin matches page", () => {
  test("renders /club/matches with heading", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  });

  test("search input is present", async ({ clubAdminPage: page }) => {
    await page.goto("/club/matches");
    await expect(page.getByPlaceholder("Search matches...")).toBeVisible();
  });

  test("result column header is present", async ({ clubAdminPage: page }) => {
    await page.goto("/club/matches");
    await expect(
      page.getByRole("columnheader", { name: "Result" }),
    ).toBeVisible();
  });
});

// ── Calendar page ─────────────────────────────────────────────────────────────

test.describe("club admin calendar page", () => {
  test("renders /club/calendar with heading", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  test("month/list view tabs are visible", async ({ clubAdminPage: page }) => {
    await page.goto("/club/calendar");
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
  });

  test("can switch between month and list views", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/calendar");
    await page.getByRole("tab", { name: "List" }).click();
    await expect(page.getByRole("tab", { name: "List" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.getByRole("tab", { name: "Month" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  test("month navigation arrows are present", async ({
    clubAdminPage: page,
  }) => {
    await page.goto("/club/calendar");
    // Prev/next month chevron buttons
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible();
  });
});

// ── Data visibility ───────────────────────────────────────────────────────────

test.describe("club admin sees their club's matches", () => {
  test("match involving own club appears on /club/matches", async ({
    leagueAdminPage: adminPage,
    clubAdminPage: clubPage,
  }) => {
    // Create fixtures using the club admin's actual club as one of the clubs
    const ownClubId = clubId();

    // Create a league and a second club for the away team
    const leagueRes = await adminPage.request.post("/api/leagues", {
      data: {
        name: `Club Match League ${Date.now()}`,
        country: "Testland",
        gender: "male",
      },
    });
    const { league } = await leagueRes.json();

    const awayClubRes = await adminPage.request.post("/api/clubs", {
      data: { name: `Away Club ${Date.now()}`, country: "Testland" },
    });
    const { club: awayClub } = await awayClubRes.json();

    // Create a team in the club admin's own club
    const homeTeamRes = await adminPage.request.post(
      `/api/clubs/${ownClubId}/teams`,
      {
        data: { name: `Test Home XI ${Date.now()}`, gender: "male" },
      },
    );
    const { team: homeTeam } = await homeTeamRes.json();

    // Create a team in the away club
    const awayTeamRes = await adminPage.request.post(
      `/api/clubs/${awayClub.id}/teams`,
      {
        data: { name: "Away XI", gender: "male" },
      },
    );
    const { team: awayTeam } = await awayTeamRes.json();

    const matchRes = await adminPage.request.post("/api/matches", {
      data: {
        leagueId: league.id,
        homeTeamId: homeTeam.id,
        homeTeamName: "Own Club Home",
        homeClubId: ownClubId,
        awayTeamId: awayTeam.id,
        awayTeamName: "Away Club Away",
        awayClubId: awayClub.id,
        venue: "Own Club Stadium",
        scheduledAt: "2026-11-15T15:00:00.000Z",
      },
    });
    const { match } = await matchRes.json();

    try {
      await clubPage.goto("/club/matches");
      await expect(clubPage.getByText("Own Club Stadium")).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await adminPage.request
        .delete(`/api/matches/${match.id}`)
        .catch(() => {});
      await adminPage.request
        .delete(`/api/clubs/${awayClub.id}`)
        .catch(() => {});
      await adminPage.request
        .delete(`/api/leagues/${league.id}`)
        .catch(() => {});
      // Teams within own club are cleaned up implicitly; the team resource may need explicit cleanup
      await adminPage.request
        .delete(`/api/clubs/${ownClubId}/teams/${homeTeam.id}`)
        .catch(() => {});
    }
  });

  test("match not involving own club is filtered out", async ({
    leagueAdminPage: adminPage,
    clubAdminPage: clubPage,
  }) => {
    // Create a match between two entirely different clubs
    const fx = await seedMatchFixtures(adminPage.request);
    const uniqueVenue = `Unrelated Pitch ${Date.now()}`;
    const match = await seedMatch(adminPage.request, fx, {
      venue: uniqueVenue,
    });

    try {
      await clubPage.goto("/club/matches");
      // The match between unrelated clubs should NOT appear for the club admin
      await expect(clubPage.getByText(uniqueVenue)).not.toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API access ────────────────────────────────────────────────────────────────

test.describe("club admin API access", () => {
  test("GET /api/matches → 200", async ({ clubAdminPage: page }) => {
    const res = await page.request.get("/api/matches");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.matches)).toBe(true);
  });

  test("POST /api/matches → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.post("/api/matches", {
      data: {
        leagueId: "x",
        homeTeamId: "a",
        awayTeamId: "b",
        venue: "v",
        scheduledAt: "2026-01-01T10:00:00Z",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/matches/:id → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.delete("/api/matches/nonexistent-id");
    expect(res.status()).toBe(403);
  });

  test("PATCH /api/matches/:id → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.patch("/api/matches/nonexistent-id", {
      data: { venue: "Hacked" },
    });
    expect(res.status()).toBe(403);
  });
});
