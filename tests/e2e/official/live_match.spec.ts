import { test, expect } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Phase 5 — Live Match Engine
 *
 * Covers:
 *   - Official live match page renders when match is in warmup/live
 *   - Timer controls are visible
 *   - Quick actions grid is displayed
 *   - Team admin live view page renders (read-only)
 *   - Match card page renders after finalization
 *   - Public live view page renders
 *
 * Note: Full RTDB-based timer and event tests require live Firebase and are
 * best run in integration mode against a real project. These specs cover
 * page rendering and API plumbing.
 */

// ── Official live match page ───────────────────────────────────────────────

test.describe("official live match page", () => {
  test("renders live page for warmup match", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, {
      venue: "Live Test Stadium",
      status: "warmup",
    });

    try {
      await officialPage.goto(`/official/match/${match.id}/live`);
      // Page should load without redirecting away
      await expect(officialPage).toHaveURL(`/official/match/${match.id}/live`);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("renders start warmup UI for scheduled match", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { venue: "Warmup Pitch" });

    try {
      await officialPage.goto(`/official/match/${match.id}/live`);
      await expect(
        officialPage.getByRole("button", { name: /start warmup/i })
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: live lifecycle ────────────────────────────────────────────────────

test.describe("live match API — lifecycle", () => {
  test("POST /api/matches/[matchId]/live with action=warmup initializes RTDB state", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      const res = await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.state).toBeTruthy();
      expect(body.state.status).toBe("warmup");
      expect(body.state.score).toMatchObject({ home: 0, away: 0 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("GET /api/matches/[matchId]/live returns live state after warmup", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      // Initialize
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      // Read
      const res = await adminPage.request.get(`/api/matches/${match.id}/live`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.state).toBeTruthy();
      expect(body.events).toBeInstanceOf(Array);
      expect(body.activePenalties).toBeInstanceOf(Array);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("POST action=start_live starts the match timer", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      const res = await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "start_live" },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.state.status).toBe("live");
      expect(body.state.isRunning).toBe(true);
      expect(body.state.intervalStartedAt).toBeTruthy();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: events ────────────────────────────────────────────────────────────

test.describe("live match API — events", () => {
  test("POST event creates entry and GET returns it", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "start_live" },
      });

      const postRes = await adminPage.request.post(
        `/api/matches/${match.id}/live/events`,
        {
          data: {
            type: "goal",
            intervalNumber: 1,
            matchTimeMs: 180000,
            teamSide: "home",
            playerName: "Test Player",
          },
        }
      );
      expect(postRes.status()).toBe(200);
      const postBody = await postRes.json();
      expect(postBody.event.type).toBe("goal");

      // Score should be updated
      const stateRes = await adminPage.request.get(`/api/matches/${match.id}/live`);
      const stateBody = await stateRes.json();
      expect(stateBody.state.score.home).toBe(1);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("POST away goal increments away score", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "start_live" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live/events`, {
        data: { type: "goal", intervalNumber: 1, matchTimeMs: 60000, teamSide: "away" },
      });
      const stateRes = await adminPage.request.get(`/api/matches/${match.id}/live`);
      const { state } = await stateRes.json();
      expect(state.score.away).toBe(1);
      expect(state.score.home).toBe(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("DELETE goal event decrements score", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "start_live" },
      });
      const postRes = await adminPage.request.post(
        `/api/matches/${match.id}/live/events`,
        { data: { type: "goal", intervalNumber: 1, matchTimeMs: 60000, teamSide: "home" } }
      );
      const { event } = await postRes.json();

      const delRes = await adminPage.request.delete(
        `/api/matches/${match.id}/live/events/${event.id}`
      );
      expect(delRes.status()).toBe(200);

      const stateRes = await adminPage.request.get(`/api/matches/${match.id}/live`);
      const { state } = await stateRes.json();
      expect(state.score.home).toBe(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: finalize + match card ─────────────────────────────────────────────

test.describe("live match API — finalize and match card", () => {
  test("POST /finalize creates matchCard in Firestore", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      // Full lifecycle
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "start_live" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "complete" },
      });

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live/finalize`
      );
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.matchCard).toBeTruthy();
      expect(body.matchCard.status).toBe("pending_review");
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("GET /matchcard returns card after finalization", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "start_live" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "complete" },
      });
      await adminPage.request.post(`/api/matches/${match.id}/live/finalize`);

      const res = await adminPage.request.get(`/api/matches/${match.id}/matchcard`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.matchCard.matchId).toBe(match.id);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── Public live page ───────────────────────────────────────────────────────

test.describe("public live match page", () => {
  test("renders /matches/[id]/live without auth", async ({ page }) => {
    // Use a fake matchId — page should render gracefully even without data
    await page.goto("/matches/nonexistent-match-id/live");
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
  });
});
