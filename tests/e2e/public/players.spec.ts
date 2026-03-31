import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";
import {
  seedPlayer,
  seedClubWithPlayers,
  cleanupClubWithPlayers,
} from "../../helpers/stats";

/**
 * Public — Players listing, player profiles, players API (Phase 7)
 *
 * Covers:
 *   - GET /api/players — public access, q filter, clubId filter, limit param, shape
 *   - GET /api/players/[playerId] — shape, zero stats for new player, 404 for nonexistent, public access
 *   - /players listing page — renders, search input, player cards, click navigates
 *   - /players/[playerId] profile page — heading, stat cards, Season Statistics, not-found, back link
 */

// ── GET /api/players ──────────────────────────────────────────────────────────

test.describe("GET /api/players — public access", () => {
  test("returns 200 without authentication", async ({ page }) => {
    const res = await page.request.get("/api/players?limit=5");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.players)).toBe(true);
  });

  test("respects the limit parameter", async ({ page }) => {
    const res = await page.request.get("/api/players?limit=2");
    const body = await res.json();
    expect(body.players.length).toBeLessThanOrEqual(2);
  });

  test("response players include required fields", async ({ page }) => {
    const res = await page.request.get("/api/players?limit=1");
    const body = await res.json();
    if (body.players.length > 0) {
      const p = body.players[0] as Record<string, unknown>;
      for (const field of ["id", "firstName", "lastName", "status"]) {
        expect(p, `missing field: ${field}`).toHaveProperty(field);
      }
    }
  });
});

authTest.describe("GET /api/players — filtering", () => {
  authTest("clubId filter restricts results to that club's players", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 2);
    try {
      const res = await adminPage.request.get(`/api/players?clubId=${clubId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      const ids = (body.players as Array<{ id: string }>).map((p) => p.id);
      expect(ids).toContain(playerIds[0]);
      expect(ids).toContain(playerIds[1]);
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("q filter matches player by last name (case-insensitive)", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueLastName = `Testlast${Date.now()}`;
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    await adminPage.request.patch(`/api/clubs/${clubId}/players/${playerIds[0]}`, {
      data: { lastName: uniqueLastName },
    });
    try {
      const res = await page.request.get(
        `/api/players?q=${encodeURIComponent(uniqueLastName.toLowerCase())}`
      );
      expect(res.status()).toBe(200);
      const body = await res.json();
      const ids = (body.players as Array<{ id: string }>).map((p) => p.id);
      expect(ids).toContain(playerIds[0]);
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });
});

// ── GET /api/players/[playerId] ───────────────────────────────────────────────

test.describe("GET /api/players/[playerId] — not found", () => {
  test("returns 404 for a nonexistent player ID", async ({ page }) => {
    const res = await page.request.get("/api/players/nonexistent-player-id-xyz");
    expect(res.status()).toBe(404);
  });
});

authTest.describe("GET /api/players/[playerId] — profile data", () => {
  authTest("returns player, seasonStats, and matchHistory for an existing player", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    try {
      const res = await page.request.get(`/api/players/${playerIds[0]}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("player");
      expect(body).toHaveProperty("seasonStats");
      expect(body).toHaveProperty("matchHistory");
      expect((body.player as { id: string }).id).toBe(playerIds[0]);
      expect(typeof (body.seasonStats as { matchesPlayed: number }).matchesPlayed).toBe("number");
      expect(Array.isArray(body.matchHistory)).toBe(true);
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("season stats default to zero for a player with no match history", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    try {
      const res = await page.request.get(`/api/players/${playerIds[0]}`);
      const body = await res.json();
      const stats = body.seasonStats as Record<string, number>;
      expect(stats.matchesPlayed).toBe(0);
      expect(stats.goals).toBe(0);
      expect(stats.assists).toBe(0);
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("is accessible without authentication", async ({
    leagueAdminPage: adminPage,
    browser,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    const ctx = await browser.newContext();
    try {
      const res = await ctx.request.get(`/api/players/${playerIds[0]}`);
      expect(res.status()).toBe(200);
    } finally {
      await ctx.close();
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });
});

// ── /players listing page ─────────────────────────────────────────────────────

test.describe("public players listing page", () => {
  test("renders heading without authentication", async ({ page }) => {
    await page.goto("/players");
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
  });

  test("search input is present on the page", async ({ page }) => {
    await page.goto("/players");
    await expect(page.locator("input[placeholder*='name']")).toBeVisible();
  });
});

authTest.describe("players listing page — data visibility", () => {
  authTest("seeded active player appears in the listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    const playerRes = await adminPage.request.get(`/api/clubs/${clubId}/players/${playerIds[0]}`);
    const { player } = await playerRes.json();
    try {
      await page.goto("/players");
      await expect(
        page.getByText(`${player.firstName} ${player.lastName}`, { exact: false })
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("clicking a player card navigates to the profile page", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    try {
      await page.goto("/players");
      await page.locator(`a[href="/players/${playerIds[0]}"]`).first().click();
      await expect(page).toHaveURL(`/players/${playerIds[0]}`);
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });
});

// ── /players/[playerId] profile page ─────────────────────────────────────────

test.describe("player profile page — not found", () => {
  test("shows not-found state for a nonexistent player ID", async ({ page }) => {
    await page.goto("/players/nonexistent-player-xyz");
    await expect(page.getByText("Player not found.")).toBeVisible({ timeout: 10_000 });
  });
});

authTest.describe("player profile page — structure", () => {
  authTest("renders player name as heading", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    const playerRes = await adminPage.request.get(`/api/clubs/${clubId}/players/${playerIds[0]}`);
    const { player } = await playerRes.json();
    try {
      await page.goto(`/players/${playerIds[0]}`);
      await expect(
        page.getByRole("heading", { name: `${player.firstName} ${player.lastName}` })
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("shows highlight stat cards: Matches, Goals, Assists", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    try {
      await page.goto(`/players/${playerIds[0]}`);
      await expect(page.getByText("Matches")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Goals")).toBeVisible();
      await expect(page.getByText("Assists")).toBeVisible();
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("shows the Season Statistics section", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    try {
      await page.goto(`/players/${playerIds[0]}`);
      await expect(page.getByText("Season Statistics")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("Back link navigates to /players", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    try {
      await page.goto(`/players/${playerIds[0]}`);
      await page.getByRole("link", { name: "All Players" }).click();
      await expect(page).toHaveURL("/players");
    } finally {
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });

  authTest("is accessible without authentication", async ({
    leagueAdminPage: adminPage,
    browser,
  }) => {
    const { clubId, playerIds } = await seedClubWithPlayers(adminPage.request, 1);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(`/players/${playerIds[0]}`);
      await expect(p).not.toHaveURL(/\/login/, { timeout: 5_000 });
    } finally {
      await ctx.close();
      await cleanupClubWithPlayers(adminPage.request, clubId, playerIds);
    }
  });
});
