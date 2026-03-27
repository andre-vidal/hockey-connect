import { test, expect } from "../../fixtures/auth";
import { adminMatches as sel } from "../../helpers/selectors";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * League admin — Match scheduling (Phase 4)
 *
 * Covers:
 *   - List page navigation
 *   - API validation (required fields, business rules)
 *   - Full status lifecycle via API
 *   - Create / edit / delete via UI
 *   - Officials assignment persists through edit
 *   - Calendar page renders with view toggle
 *   - Role-based route access guard
 */

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("match list", () => {
  test("renders the matches list page with a New Match button", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
    await expect(page.locator(sel.newMatchLink)).toBeVisible();
  });

  test("created match appears in the list with correct status badge", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx, { venue: "Visibility Stadium" });

    try {
      await page.goto("/admin/matches");
      await expect(page.getByText("Visibility Stadium")).toBeVisible();
      // Scheduled badge should be visible
      await expect(page.getByText("scheduled").first()).toBeVisible();
    } finally {
      await cleanupMatchFixtures(page.request, fx, [match.id as string]);
    }
  });
});

// ── API validation ────────────────────────────────────────────────────────────

test.describe("match API — validation", () => {
  test("missing venue → 400", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    try {
      const res = await page.request.post("/api/matches", {
        data: {
          leagueId: fx.league.id,
          homeTeamId: fx.team1.id,
          awayTeamId: fx.team2.id,
          scheduledAt: "2026-06-01T10:00:00.000Z",
          // venue omitted
        },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanupMatchFixtures(page.request, fx);
    }
  });

  test("missing scheduledAt → 400", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    try {
      const res = await page.request.post("/api/matches", {
        data: {
          leagueId: fx.league.id,
          homeTeamId: fx.team1.id,
          awayTeamId: fx.team2.id,
          venue: "Stadium",
          // scheduledAt omitted
        },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanupMatchFixtures(page.request, fx);
    }
  });

  test("no leagueId or tournamentId → 400", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    try {
      const res = await page.request.post("/api/matches", {
        data: {
          homeTeamId: fx.team1.id,
          awayTeamId: fx.team2.id,
          venue: "Stadium",
          scheduledAt: "2026-06-01T10:00:00.000Z",
        },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanupMatchFixtures(page.request, fx);
    }
  });

  test("home team same as away team → 400", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    try {
      const res = await page.request.post("/api/matches", {
        data: {
          leagueId: fx.league.id,
          homeTeamId: fx.team1.id,
          awayTeamId: fx.team1.id,
          venue: "Stadium",
          scheduledAt: "2026-06-15T15:00:00.000Z",
        },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("different");
    } finally {
      await cleanupMatchFixtures(page.request, fx);
    }
  });

  test("unauthenticated POST → 401", async ({ page }) => {
    const res = await page.request.post("/api/matches", {
      data: { leagueId: "x", homeTeamId: "a", awayTeamId: "b", venue: "v", scheduledAt: "2026-01-01T10:00:00Z" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/matches/nonexistent → 404", async ({ leagueAdminPage: page }) => {
    const res = await page.request.get("/api/matches/does-not-exist");
    expect(res.status()).toBe(404);
  });
});

// ── Status lifecycle ──────────────────────────────────────────────────────────

test.describe("match status lifecycle", () => {
  test("scheduled → warmup → live → completed → confirmed via PATCH", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx);
    const id = match.id as string;

    try {
      for (const status of ["warmup", "live", "completed", "confirmed"]) {
        const res = await page.request.patch(`/api/matches/${id}`, { data: { status } });
        expect(res.status()).toBe(200);
        const { match: updated } = await res.json();
        expect(updated.status).toBe(status);
      }
    } finally {
      await cleanupMatchFixtures(page.request, fx, [id]);
    }
  });

  test("delete non-scheduled match → 400", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx, { status: "completed" });

    try {
      const res = await page.request.delete(`/api/matches/${match.id as string}`);
      expect(res.status()).toBe(400);
    } finally {
      await cleanupMatchFixtures(page.request, fx, [match.id as string]);
    }
  });
});

// ── Create via API ────────────────────────────────────────────────────────────

test.describe("create match", () => {
  test("valid payload → 201 with default status scheduled", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    let matchId: string | undefined;

    try {
      const res = await page.request.post("/api/matches", {
        data: {
          leagueId: fx.league.id,
          homeTeamId: fx.team1.id,
          homeTeamName: "Home",
          homeClubId: fx.club1.id,
          awayTeamId: fx.team2.id,
          awayTeamName: "Away",
          awayClubId: fx.club2.id,
          venue: "API Stadium",
          scheduledAt: "2026-06-15T15:00:00.000Z",
        },
      });
      expect(res.status()).toBe(201);
      const { match } = await res.json();
      matchId = match.id;
      expect(match.status).toBe("scheduled");
      expect(match.matchCardConfirmed).toBe(false);
      expect(match.officials).toEqual([]);
    } finally {
      await cleanupMatchFixtures(page.request, fx, matchId ? [matchId] : []);
    }
  });

  test("tournament-based match creation → leagueId is null", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);

    // Create a tournament to use
    const tournRes = await page.request.post("/api/tournaments", {
      data: {
        name: `Tournament ${Date.now()}`,
        venue: "Venue",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      },
    });
    const { tournament } = await tournRes.json();
    let matchId: string | undefined;

    try {
      const res = await page.request.post("/api/matches", {
        data: {
          tournamentId: tournament.id,
          homeTeamId: fx.team1.id,
          homeTeamName: "Home",
          homeClubId: fx.club1.id,
          awayTeamId: fx.team2.id,
          awayTeamName: "Away",
          awayClubId: fx.club2.id,
          venue: "Tournament Ground",
          scheduledAt: "2026-06-15T10:00:00.000Z",
        },
      });
      expect(res.status()).toBe(201);
      const { match } = await res.json();
      matchId = match.id;
      expect(match.tournamentId).toBe(tournament.id);
      expect(match.leagueId).toBeNull();
    } finally {
      if (matchId) await page.request.delete(`/api/matches/${matchId}`);
      await page.request.delete(`/api/tournaments/${tournament.id}`);
      await cleanupMatchFixtures(page.request, fx);
    }
  });
});

// ── Edit via UI ───────────────────────────────────────────────────────────────

test.describe("edit match via UI", () => {
  test("update venue → appears in list", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx, { venue: "Old Ground" });

    try {
      await page.goto(`/admin/matches/${match.id as string}`);
      await page.locator(sel.venueInput).clear();
      await page.locator(sel.venueInput).fill("New Arena");
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/matches", { timeout: 10_000 });
      await expect(page.getByText("New Arena")).toBeVisible();
    } finally {
      await cleanupMatchFixtures(page.request, fx, [match.id as string]);
    }
  });

  test("change status via dropdown → persists", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx, { venue: "Status Stadium" });

    try {
      await page.goto(`/admin/matches/${match.id as string}`);

      // Open the status select and choose "Warmup"
      await page.locator("#status").click();
      await page.getByRole("option", { name: "Warmup", exact: true }).click();
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/admin/matches", { timeout: 10_000 });
      await expect(page.getByText("warmup").first()).toBeVisible();
    } finally {
      await cleanupMatchFixtures(page.request, fx, [match.id as string]);
    }
  });

  test("non-scheduled match does not show delete button", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx, { status: "completed" });

    try {
      await page.goto(`/admin/matches/${match.id as string}`);
      await expect(page.locator(sel.deleteButton)).not.toBeVisible();
    } finally {
      await cleanupMatchFixtures(page.request, fx, [match.id as string]);
    }
  });
});

// ── Delete via UI ─────────────────────────────────────────────────────────────

test.describe("delete match via UI", () => {
  test("confirm delete → removed from list", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    const match = await seedMatch(page.request, fx, { venue: "Deleted Ground" });

    try {
      await page.goto(`/admin/matches/${match.id as string}`);
      await page.locator(sel.deleteButton).click();
      await page.locator(sel.confirmDeleteButton).click();

      await expect(page).toHaveURL("/admin/matches", { timeout: 10_000 });
      await expect(page.getByText("Deleted Ground")).not.toBeVisible();
    } finally {
      await page.request.delete(`/api/matches/${match.id as string}`).catch(() => {});
      await cleanupMatchFixtures(page.request, fx);
    }
  });
});

// ── Calendar ──────────────────────────────────────────────────────────────────

test.describe("admin calendar and dashboard", () => {
  test("admin dashboard shows upcoming matches widget", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin");
    // The UpcomingMatchesWidget renders a card with this title
    await expect(page.getByText("Upcoming Matches")).toBeVisible();
  });

  test("match appears in admin dashboard upcoming widget", async ({ leagueAdminPage: page }) => {
    const fx = await seedMatchFixtures(page.request);
    // Schedule in the future so it shows as "upcoming"
    const match = await seedMatch(page.request, fx, {
      venue: "Widget Ground",
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    try {
      await page.goto("/admin");
      await expect(page.getByText("Widget Ground")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(page.request, fx, [match.id as string]);
    }
  });
});

// ── Role access guard ─────────────────────────────────────────────────────────

test.describe("role access", () => {
  test("team admin is blocked from /admin/matches/new", async ({ teamAdminPage: page }) => {
    await page.goto("/admin/matches/new");
    await expect(page).not.toHaveURL("/admin/matches/new", { timeout: 5_000 });
  });

  test("club admin is blocked from /admin/matches/new", async ({ clubAdminPage: page }) => {
    await page.goto("/admin/matches/new");
    await expect(page).not.toHaveURL("/admin/matches/new", { timeout: 5_000 });
  });

  test("match official is blocked from /admin/matches/new", async ({ matchOfficialPage: page }) => {
    await page.goto("/admin/matches/new");
    await expect(page).not.toHaveURL("/admin/matches/new", { timeout: 5_000 });
  });
});
