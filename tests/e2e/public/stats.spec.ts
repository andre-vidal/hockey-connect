import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";
import { seedMatchFixtures, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Public — Stats hub page, standings API, player stats leaderboard API (Phase 7)
 *
 * Covers:
 *   - /stats page renders and tab navigation works without auth
 *   - League selector appears when multiple leagues exist
 *   - GET /api/standings — public access, filtering, shape, sort contract
 *   - GET /api/stats/players — public access, valid/invalid sort keys, limit cap, shape
 */

// ── /stats hub page ───────────────────────────────────────────────────────────

test.describe("public stats page", () => {
  test("renders heading and all three tabs without authentication", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Standings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Top Scorers" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leaderboards" })).toBeVisible();
  });

  test("Standings tab is active by default", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByRole("button", { name: "Standings" })).toHaveClass(/text-primary/);
  });

  test("clicking Top Scorers tab stays on /stats", async ({ page }) => {
    await page.goto("/stats");
    await page.getByRole("button", { name: "Top Scorers" }).click();
    await expect(page).toHaveURL("/stats");
    await expect(page.getByRole("button", { name: "Top Scorers" })).toHaveClass(/text-primary/);
  });

  test("clicking Leaderboards tab stays on /stats", async ({ page }) => {
    await page.goto("/stats");
    await page.getByRole("button", { name: "Leaderboards" }).click();
    await expect(page).toHaveURL("/stats");
    await expect(page.getByRole("button", { name: "Leaderboards" })).toHaveClass(/text-primary/);
  });
});

authTest.describe("stats page — league selector", () => {
  authTest("league selector is shown when multiple leagues exist", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const l1Res = await adminPage.request.post("/api/leagues", {
      data: { name: `SelectorLeague1 ${Date.now()}`, country: "Testland", gender: "male" },
    });
    const l2Res = await adminPage.request.post("/api/leagues", {
      data: { name: `SelectorLeague2 ${Date.now()}`, country: "Testland", gender: "female" },
    });
    const { league: l1 } = await l1Res.json();
    const { league: l2 } = await l2Res.json();
    try {
      await page.goto("/stats");
      const selectors = page.locator("select");
      await expect(selectors.first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminPage.request.delete(`/api/leagues/${l1.id}`).catch(() => {});
      await adminPage.request.delete(`/api/leagues/${l2.id}`).catch(() => {});
    }
  });
});

// ── GET /api/standings ────────────────────────────────────────────────────────

test.describe("GET /api/standings — public access", () => {
  test("returns 200 with standings array without authentication", async ({ page }) => {
    const res = await page.request.get("/api/standings");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("standings");
    expect(Array.isArray(body.standings)).toBe(true);
  });

  test("leagueId filter is optional — returns 200 with no param", async ({ page }) => {
    const res = await page.request.get("/api/standings");
    expect(res.status()).toBe(200);
  });

  test("standings are sorted by points descending when data exists", async ({ page }) => {
    const res = await page.request.get("/api/standings");
    const body = await res.json();
    const standings = body.standings as Array<{ points: number }>;
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i].points).toBeLessThanOrEqual(standings[i - 1].points);
    }
  });

  test("response entries include all required standing fields", async ({ page }) => {
    const res = await page.request.get("/api/standings");
    const body = await res.json();
    if (body.standings.length > 0) {
      const s = body.standings[0] as Record<string, unknown>;
      for (const field of [
        "leagueId", "teamId", "played", "won", "drawn", "lost",
        "goalsFor", "goalsAgainst", "goalDifference", "points",
      ]) {
        expect(s, `missing field: ${field}`).toHaveProperty(field);
      }
    }
  });
});

authTest.describe("GET /api/standings — filtering", () => {
  authTest("returns empty array for a brand-new league with no matches", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      const res = await page.request.get(`/api/standings?leagueId=${fx.league.id}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.standings).toHaveLength(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });
});

// ── GET /api/stats/players ────────────────────────────────────────────────────

test.describe("GET /api/stats/players — leaderboard", () => {
  test("returns 200 with players array without authentication", async ({ page }) => {
    const res = await page.request.get("/api/stats/players?limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.players)).toBe(true);
  });

  test("rejects invalid sort key with 400", async ({ page }) => {
    const res = await page.request.get("/api/stats/players?sort=invalid_stat");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("accepts all valid sort keys", async ({ page }) => {
    const validKeys = [
      "goals", "assists", "penaltyCorners", "penaltyStrokes",
      "greenCards", "yellowCards", "redCards", "saves",
      "tackles", "interceptions", "circleEntries",
      "shotsOnGoal", "shotsOffGoal", "freeHits", "longCorners",
      "turnovers", "aerials", "minutesPlayed",
    ];
    for (const sort of validKeys) {
      const res = await page.request.get(`/api/stats/players?sort=${sort}&limit=1`);
      expect(res.status(), `sort=${sort} should return 200`).toBe(200);
    }
  });

  test("respects limit parameter", async ({ page }) => {
    const res = await page.request.get("/api/stats/players?limit=3");
    const body = await res.json();
    expect(body.players.length).toBeLessThanOrEqual(3);
  });

  test("caps limit at 100", async ({ page }) => {
    const res = await page.request.get("/api/stats/players?limit=9999");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.players.length).toBeLessThanOrEqual(100);
  });

  test("response player objects include required stat fields", async ({ page }) => {
    const res = await page.request.get("/api/stats/players?limit=1");
    const body = await res.json();
    if (body.players.length > 0) {
      const p = body.players[0] as Record<string, unknown>;
      for (const field of ["playerId", "playerName", "teamId", "matchesPlayed", "goals", "assists"]) {
        expect(p, `missing field: ${field}`).toHaveProperty(field);
      }
    }
  });
});

authTest.describe("GET /api/stats/players — leagueId filter", () => {
  authTest("returns empty array for a league with no confirmed matches", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      const res = await page.request.get(`/api/stats/players?leagueId=${fx.league.id}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.players).toHaveLength(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });
});
