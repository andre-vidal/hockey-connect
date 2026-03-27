import { test, expect } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Match official — API security boundaries (Phase 4)
 *
 * Verifies that a `match_official` can read matches but cannot create,
 * update, or delete them (those operations are restricted to league_admin).
 */

// ── Read access (allowed) ─────────────────────────────────────────────────────

test.describe("match official can read match data", () => {
  test("GET /api/matches → 200", async ({ matchOfficialPage: page }) => {
    const res = await page.request.get("/api/matches");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.matches)).toBe(true);
  });

  test("GET /api/matches/nonexistent → 404 (not 401 or 403)", async ({ matchOfficialPage: page }) => {
    const res = await page.request.get("/api/matches/nonexistent-id");
    expect(res.status()).toBe(404);
  });
});

// ── Write access (blocked) ────────────────────────────────────────────────────

test.describe("match official cannot mutate matches", () => {
  test("POST /api/matches → 403", async ({ matchOfficialPage: page }) => {
    const res = await page.request.post("/api/matches", {
      data: {
        leagueId: "any",
        homeTeamId: "a",
        awayTeamId: "b",
        venue: "Blocked Stadium",
        scheduledAt: "2026-01-01T10:00:00.000Z",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("PATCH /api/matches/:id → 403", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      const res = await officialPage.request.patch(`/api/matches/${match.id as string}`, {
        data: { venue: "Hacked Venue" },
      });
      expect(res.status()).toBe(403);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("DELETE /api/matches/:id → 403", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      const res = await officialPage.request.delete(`/api/matches/${match.id as string}`);
      expect(res.status()).toBe(403);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── Other league-admin-only endpoints ────────────────────────────────────────

test.describe("match official cannot access other league-admin endpoints", () => {
  test("POST /api/leagues → 403", async ({ matchOfficialPage: page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Blocked League", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/tournaments → 403", async ({ matchOfficialPage: page }) => {
    const res = await page.request.post("/api/tournaments", {
      data: { name: "Blocked Tournament", venue: "V", startDate: "2026-01-01", endDate: "2026-01-02" },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs → 403", async ({ matchOfficialPage: page }) => {
    const res = await page.request.post("/api/clubs", { data: { name: "Blocked Club" } });
    expect(res.status()).toBe(403);
  });

  test("POST /api/officials → 403", async ({ matchOfficialPage: page }) => {
    const res = await page.request.post("/api/officials", {
      data: { userId: "x", displayName: "X", email: "x@x.com", officialTypes: ["umpire"] },
    });
    expect(res.status()).toBe(403);
  });
});

// ── Dashboard route access ────────────────────────────────────────────────────

test.describe("match official route access", () => {
  test("/official is accessible", async ({ matchOfficialPage: page }) => {
    await page.goto("/official");
    await expect(page.getByRole("heading", { name: "Match Official Dashboard" })).toBeVisible();
  });

  test("/official/matches is accessible", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/matches");
    await expect(page.getByRole("heading", { name: "My Matches" })).toBeVisible();
  });

  test("/official/calendar is accessible", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  test("/admin/matches is not accessible", async ({ matchOfficialPage: page }) => {
    await page.goto("/admin/matches");
    await expect(page).not.toHaveURL("/admin/matches", { timeout: 5_000 });
  });
});
