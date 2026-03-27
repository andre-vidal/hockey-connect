import { test, expect } from "../../fixtures/auth";

/**
 * Club admin — API security boundaries
 *
 * Verifies that a `club_admin` cannot access endpoints reserved for
 * `league_admin` (or higher), and cannot operate on clubs other than
 * their own.
 */

function clubId(): string {
  const id = process.env.CLUB_ADMIN_CLUB_ID;
  if (!id) throw new Error("CLUB_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── League-admin-only endpoints → 403 ────────────────────────────────────────

test.describe("club admin cannot access league_admin endpoints", () => {
  test("POST /api/leagues → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Unauthorised League", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs → 403 (creating clubs is league_admin only)", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.post("/api/clubs", {
      data: { name: "Unauthorised Club" },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/clubs/:id → 403 (deleting clubs is league_admin only)", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.delete("/api/clubs/nonexistent-id");
    expect(res.status()).toBe(403);
  });

  test("POST /api/tournaments → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.post("/api/tournaments", {
      data: {
        name: "Unauthorised Tournament",
        venue: "V",
        startDate: "2026-01-01",
        endDate: "2026-01-02",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/officials → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.post("/api/officials", {
      data: {
        userId: "x",
        displayName: "X",
        email: "x@x.com",
        officialTypes: ["umpire"],
      },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/users/invite → 403 (inviting club admins is league_admin only)", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.post("/api/users/invite", {
      data: { email: "x@x.com", displayName: "X" },
    });
    expect(res.status()).toBe(403);
  });
});

// ── Cross-club isolation ──────────────────────────────────────────────────────

test.describe("club admin cannot access another club's data", () => {
  test("GET /api/clubs/[otherId]/teams → 403", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.get("/api/clubs/some-other-club-id/teams");
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs/[otherId]/teams → 403", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.post("/api/clubs/some-other-club-id/teams", {
      data: { name: "Cross-club team", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });

  test("GET /api/clubs/[otherId]/players → 403", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.get("/api/clubs/some-other-club-id/players");
    expect(res.status()).toBe(403);
  });

  test("POST /api/clubs/[otherId]/players → 403", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.post(
      "/api/clubs/some-other-club-id/players",
      {
        data: { firstName: "Cross", lastName: "Club" },
      },
    );
    expect(res.status()).toBe(403);
  });
});

// ── Match API security ────────────────────────────────────────────────────────

test.describe("club admin cannot mutate matches", () => {
  test("POST /api/matches → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.post("/api/matches", {
      data: { leagueId: "x", homeTeamId: "a", awayTeamId: "b", venue: "v", scheduledAt: "2026-01-01T10:00:00Z" },
    });
    expect(res.status()).toBe(403);
  });

  test("PATCH /api/matches/:id → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.patch("/api/matches/nonexistent-id", {
      data: { venue: "Hacked" },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/matches/:id → 403", async ({ clubAdminPage: page }) => {
    const res = await page.request.delete("/api/matches/nonexistent-id");
    expect(res.status()).toBe(403);
  });

  test("GET /api/matches → 200 (club admin can read matches)", async ({ clubAdminPage: page }) => {
    const res = await page.request.get("/api/matches");
    expect(res.status()).toBe(200);
  });
});

// ── Own club data is accessible ───────────────────────────────────────────────

test.describe("club admin can access their own club's data", () => {
  test("GET /api/clubs/[ownClubId]/teams → 200", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.get(`/api/clubs/${clubId()}/teams`);
    expect(res.status()).toBe(200);
  });

  test("GET /api/clubs/[ownClubId]/players → 200", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.get(`/api/clubs/${clubId()}/players`);
    expect(res.status()).toBe(200);
  });

  test("GET /api/squads?clubId=[ownClubId] → 200", async ({
    clubAdminPage: page,
  }) => {
    const res = await page.request.get(`/api/squads?clubId=${clubId()}`);
    expect(res.status()).toBe(200);
  });
});
