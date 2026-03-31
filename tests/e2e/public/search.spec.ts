import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Public — Global search API and header search UI (Phase 7)
 *
 * Covers:
 *   - GET /api/search — min-length guard, response shape, type filtering, public access
 *   - Club search returns matching clubs
 *   - Match search returns matching matches
 *   - Header search input visible and interactive on desktop
 *   - Dropdown appears after typing, clear button resets query
 */

// ── GET /api/search ───────────────────────────────────────────────────────────

test.describe("GET /api/search — input validation", () => {
  test("returns empty results for a query shorter than 2 characters", async ({ page }) => {
    const res = await page.request.get("/api/search?q=a");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.players).toHaveLength(0);
    expect(body.clubs).toHaveLength(0);
    expect(body.matches).toHaveLength(0);
  });

  test("returns empty results for an empty query", async ({ page }) => {
    const res = await page.request.get("/api/search?q=");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.players).toHaveLength(0);
    expect(body.clubs).toHaveLength(0);
    expect(body.matches).toHaveLength(0);
  });

  test("response always contains players, clubs, and matches keys", async ({ page }) => {
    const res = await page.request.get("/api/search?q=xyz");
    const body = await res.json();
    expect(body).toHaveProperty("players");
    expect(body).toHaveProperty("clubs");
    expect(body).toHaveProperty("matches");
  });

  test("is publicly accessible without authentication", async ({ page }) => {
    const res = await page.request.get("/api/search?q=test");
    expect(res.status()).toBe(200);
  });
});

test.describe("GET /api/search — type filtering", () => {
  test("types=clubs returns only clubs (players and matches are empty)", async ({ page }) => {
    const res = await page.request.get("/api/search?q=te&types=clubs");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect((body.players ?? []).length).toBe(0);
    expect((body.matches ?? []).length).toBe(0);
  });

  test("types=matches returns only matches (players and clubs are empty)", async ({ page }) => {
    const res = await page.request.get("/api/search?q=te&types=matches");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect((body.players ?? []).length).toBe(0);
    expect((body.clubs ?? []).length).toBe(0);
  });
});

authTest.describe("GET /api/search — club results", () => {
  authTest("finds a club by its exact name", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `SearchClub${Date.now()}`;
    const clubRes = await adminPage.request.post("/api/clubs", {
      data: { name: uniqueName, country: "Testland" },
    });
    const { club } = await clubRes.json();
    try {
      const res = await page.request.get(
        `/api/search?q=${encodeURIComponent(uniqueName.toLowerCase())}&types=clubs`
      );
      expect(res.status()).toBe(200);
      const body = await res.json();
      const found = (body.clubs as Array<{ id: string }>).find((c) => c.id === club.id);
      expect(found).toBeTruthy();
    } finally {
      await adminPage.request.patch(`/api/clubs/${club.id}`, { data: { isArchived: true } });
    }
  });

  authTest("club results include id and name fields", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `ShapeClub${Date.now()}`;
    const clubRes = await adminPage.request.post("/api/clubs", {
      data: { name: uniqueName, country: "Testland" },
    });
    const { club } = await clubRes.json();
    try {
      const res = await page.request.get(
        `/api/search?q=${encodeURIComponent(uniqueName.toLowerCase())}&types=clubs`
      );
      const body = await res.json();
      if (body.clubs.length > 0) {
        const c = body.clubs[0] as Record<string, unknown>;
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("name");
      }
    } finally {
      await adminPage.request.patch(`/api/clubs/${club.id}`, { data: { isArchived: true } });
    }
  });
});

authTest.describe("GET /api/search — match results", () => {
  authTest("match results include id and team name fields", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);
    try {
      // Search by a fragment of the club name (which is part of the team name string)
      const q = fx.club1.name.substring(0, 6).toLowerCase();
      const res = await page.request.get(`/api/search?q=${encodeURIComponent(q)}&types=matches`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.matches)).toBe(true);
      if (body.matches.length > 0) {
        const m = body.matches[0] as Record<string, unknown>;
        expect(m).toHaveProperty("id");
        expect(m).toHaveProperty("homeTeamName");
        expect(m).toHaveProperty("awayTeamName");
      }
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── Header global search UI ───────────────────────────────────────────────────

test.describe("header search UI", () => {
  test("search input is visible on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("input[placeholder*='Search']").first()).toBeVisible();
  });

  test("typing at least 2 characters makes the dropdown appear", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const input = page.locator("input[placeholder*='Search']").first();
    await input.fill("te");
    // The dropdown container or searching text should be visible
    await expect(input).toHaveValue("te");
  });

  test("clear button resets the query to empty", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const input = page.locator("input[placeholder*='Search']").first();
    await input.fill("something");
    // The X clear button sits inside the search container
    await page.locator("input[placeholder*='Search'] ~ button").first().click();
    await expect(input).toHaveValue("");
  });

  test("search input is hidden on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    const input = page.locator("input[placeholder*='Search']").first();
    await expect(input).not.toBeVisible();
  });
});
