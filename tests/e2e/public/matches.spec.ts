import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Public — Match listing, calendar, match result pages, match stats API (Phase 4 + Phase 7)
 *
 * Covers:
 *   - /matches page accessible without authentication
 *   - /calendar page accessible without authentication
 *   - Unauthenticated API requests are rejected with 401
 *   - A created match is visible on the public matches page
 *   - Calendar renders with month/list toggle
 *   - /matches/[matchId] result page — score card, status badge, Watch Live link, stats section
 *   - GET /api/matches/[matchId]/stats — public access, 404 when no stats exist
 */

// ── Public page access (no auth required) ─────────────────────────────────────

test.describe("public matches page", () => {
  test("renders /matches without authentication", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  });

  test("shows search input", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByPlaceholder("Search matches...")).toBeVisible();
  });

  test("shows Date & Time, Match, Venue, Status, Result columns", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("columnheader", { name: "Date & Time" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Match" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Venue" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Result" })).toBeVisible();
  });
});

test.describe("public calendar page", () => {
  test("renders /calendar without authentication", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  test("month/list tab toggle is present", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
  });

  test("month navigation arrows are present", async ({ page }) => {
    await page.goto("/calendar");
    // Previous and next month buttons exist (ChevronLeft/ChevronRight)
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible();
  });

  test("can navigate to next month", async ({ page }) => {
    await page.goto("/calendar");
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const now = new Date();
    const nextMonth = monthNames[(now.getMonth() + 1) % 12];
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(page.getByText(nextMonth)).toBeVisible();
  });

  test("can switch to list view and back", async ({ page }) => {
    await page.goto("/calendar");
    await page.getByRole("tab", { name: "List" }).click();
    await expect(page.getByRole("tab", { name: "List" })).toHaveAttribute("data-state", "active");
    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.getByRole("tab", { name: "Month" })).toHaveAttribute("data-state", "active");
  });
});

// ── Data visibility ───────────────────────────────────────────────────────────

authTest.describe("public sees published matches", () => {
  authTest("created match appears on public /matches page", async ({ leagueAdminPage: adminPage, page }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const uniqueVenue = `Public Pitch ${Date.now()}`;
    const match = await seedMatch(adminPage.request, fx, { venue: uniqueVenue });

    try {
      await page.goto("/matches");
      await expect(page.getByText(uniqueVenue)).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("created match appears on public /calendar in list view", async ({ leagueAdminPage: adminPage, page }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    futureDate.setDate(10);
    const uniqueVenue = `Calendar Public ${Date.now()}`;
    const match = await seedMatch(adminPage.request, fx, {
      venue: uniqueVenue,
      scheduledAt: futureDate.toISOString(),
    });

    try {
      await page.goto("/calendar");
      // Navigate to next month
      await page.getByRole("button", { name: "Next month" }).click();
      await page.getByRole("tab", { name: "List" }).click();
      await expect(page.getByText(uniqueVenue)).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("completed match with result shows score on /matches page", async ({ leagueAdminPage: adminPage, page }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { venue: "Score Pitch" });

    // Set a result and mark as completed
    await adminPage.request.patch(`/api/matches/${match.id as string}`, {
      data: {
        status: "completed",
        result: { homeScore: 3, awayScore: 1 },
      },
    });

    try {
      await page.goto("/matches");
      await expect(page.getByText("Score Pitch")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("3 – 1")).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── Unauthenticated API security ──────────────────────────────────────────────

test.describe("unauthenticated API access", () => {
  test("POST /api/matches → 401", async ({ page }) => {
    const res = await page.request.post("/api/matches", {
      data: { leagueId: "x", homeTeamId: "a", awayTeamId: "b", venue: "v", scheduledAt: "2026-01-01T10:00:00Z" },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/matches/:id → 401", async ({ page }) => {
    const res = await page.request.patch("/api/matches/any-id", {
      data: { venue: "Hacked" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/matches/:id → 401", async ({ page }) => {
    const res = await page.request.delete("/api/matches/any-id");
    expect(res.status()).toBe(401);
  });

  test("GET /api/matches → 200 (public read)", async ({ page }) => {
    const res = await page.request.get("/api/matches");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.matches)).toBe(true);
  });
});

// ── GET /api/matches/[matchId]/stats ──────────────────────────────────────────

test.describe("GET /api/matches/[matchId]/stats — public access", () => {
  test("returns 404 for a nonexistent match ID", async ({ page }) => {
    const res = await page.request.get("/api/matches/nonexistent-match-id/stats");
    expect(res.status()).toBe(404);
  });
});

authTest.describe("GET /api/matches/[matchId]/stats — match without stats", () => {
  authTest("returns 404 for a match that has not been finalized", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);
    try {
      const res = await page.request.get(`/api/matches/${match.id}/stats`);
      expect(res.status()).toBe(404);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("is accessible without authentication (returns 404, not 401 or 403)", async ({
    leagueAdminPage: adminPage,
    browser,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);
    const ctx = await browser.newContext();
    try {
      const res = await ctx.request.get(`/api/matches/${match.id}/stats`);
      expect([404]).toContain(res.status());
    } finally {
      await ctx.close();
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── /matches/[matchId] result page ────────────────────────────────────────────

test.describe("match result page — not found", () => {
  test("shows not-found message for a nonexistent match ID", async ({ page }) => {
    await page.goto("/matches/nonexistent-match-xyz");
    await expect(page.getByText("Match not found.")).toBeVisible({ timeout: 10_000 });
  });
});

authTest.describe("match result page — content", () => {
  authTest("shows both team names and venue for a scheduled match", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { venue: "Result Page Venue" });
    try {
      await page.goto(`/matches/${match.id}`);
      await expect(page.getByText(fx.team1.name)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(fx.team2.name)).toBeVisible();
      await expect(page.getByText("Result Page Venue")).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("shows the match status badge", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);
    try {
      await page.goto(`/matches/${match.id}`);
      await expect(page.getByText("scheduled", { exact: false })).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("shows 'Watch Live' link for a live match", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { status: "live" });
    try {
      await page.goto(`/matches/${match.id}`);
      await expect(page.getByRole("link", { name: /Watch Live/i })).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("does not show 'Watch Live' link for a completed match", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { status: "completed" });
    try {
      await page.goto(`/matches/${match.id}`);
      await expect(page.getByRole("link", { name: /Watch Live/i })).not.toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("shows 'Statistics not yet available.' for completed match with no stats", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { status: "completed" });
    try {
      await page.goto(`/matches/${match.id}`);
      await expect(page.getByText("Statistics not yet available.")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("Back link navigates to /matches listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);
    try {
      await page.goto(`/matches/${match.id}`);
      await page.getByRole("link", { name: "All Matches" }).click();
      await expect(page).toHaveURL("/matches");
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("is accessible without authentication", async ({
    leagueAdminPage: adminPage,
    browser,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    try {
      await p.goto(`/matches/${match.id}`);
      await expect(p.getByText(fx.team1.name)).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});
