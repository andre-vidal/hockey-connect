import { test, expect } from "../../fixtures/auth";

/**
 * Team admin — API security boundaries
 *
 * Verifies that a `team_admin` cannot access endpoints reserved for
 * `league_admin` or `club_admin`, and cannot read/write another club's data.
 */

function clubId(): string {
  const id = process.env.TEAM_ADMIN_CLUB_ID;
  if (!id) throw new Error("TEAM_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── League-admin-only endpoints → 403 ────────────────────────────────────────

test.describe("team admin cannot access league_admin endpoints", () => {
  test("POST /api/leagues → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Unauthorised League", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/clubs", {
      data: { name: "Unauthorised Club" },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/clubs/:id → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.delete("/api/clubs/nonexistent-id");
    expect(res.status()).toBe(403);
  });

  test("POST /api/officials → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/officials", {
      data: { userId: "x", displayName: "X", email: "x@x.com", officialTypes: ["umpire"] },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/users/invite → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/users/invite", {
      data: { email: "x@x.com", displayName: "X" },
    });
    expect(res.status()).toBe(403);
  });
});

// ── Club-admin-only endpoints → 403 ──────────────────────────────────────────

test.describe("team admin cannot access club_admin-only endpoints", () => {
  test("POST /api/clubs/{clubId}/players → 403 (creating players is club_admin only)", async ({
    teamAdminPage: page,
  }) => {
    const res = await page.request.post(`/api/clubs/${clubId()}/players`, {
      data: { firstName: "Unauthorised", lastName: "Player" },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs/{clubId}/teams → 403 (creating teams is club_admin only)", async ({
    teamAdminPage: page,
  }) => {
    const res = await page.request.post(`/api/clubs/${clubId()}/teams`, {
      data: { name: "Unauthorised Team", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });
});

// ── Cross-club isolation ──────────────────────────────────────────────────────

test.describe("team admin cannot access another club's data", () => {
  test("GET /api/clubs/[otherId]/teams → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.get("/api/clubs/some-other-club-id/teams");
    expect(res.status()).toBe(403);
  });

  test("GET /api/clubs/[otherId]/players → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.get("/api/clubs/some-other-club-id/players");
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs/[otherId]/teams → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/clubs/some-other-club-id/teams", {
      data: { name: "Cross-club Team", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });
});

// ── Match API security ────────────────────────────────────────────────────────

test.describe("team admin cannot mutate matches", () => {
  test("POST /api/matches → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/matches", {
      data: { leagueId: "x", homeTeamId: "a", awayTeamId: "b", venue: "v", scheduledAt: "2026-01-01T10:00:00Z" },
    });
    expect(res.status()).toBe(403);
  });

  test("PATCH /api/matches/:id → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.patch("/api/matches/nonexistent-id", {
      data: { venue: "Hacked" },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/matches/:id → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.delete("/api/matches/nonexistent-id");
    expect(res.status()).toBe(403);
  });

  test("GET /api/matches → 200 (team admin can read matches)", async ({ teamAdminPage: page }) => {
    const res = await page.request.get("/api/matches");
    expect(res.status()).toBe(200);
  });
});

// ── Own club data is accessible ───────────────────────────────────────────────

test.describe("team admin can access their own club's data", () => {
  test("GET /api/clubs/{clubId}/teams → 200", async ({ teamAdminPage: page }) => {
    const res = await page.request.get(`/api/clubs/${clubId()}/teams`);
    expect(res.status()).toBe(200);
  });

  test("GET /api/clubs/{clubId}/players → 200", async ({ teamAdminPage: page }) => {
    const res = await page.request.get(`/api/clubs/${clubId()}/players`);
    expect(res.status()).toBe(200);
  });

  test("GET /api/squads → 200", async ({ teamAdminPage: page }) => {
    const res = await page.request.get("/api/squads");
    expect(res.status()).toBe(200);
  });
});
