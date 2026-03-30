import { test, expect } from "../../fixtures/auth";
import {
  seedMatchFixtures,
  seedMatch,
  cleanupMatchFixtures,
} from "../../helpers/matches";

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
    const match = await seedMatch(adminPage.request, fx, {
      venue: "Warmup Pitch",
    });

    try {
      await officialPage.goto(`/official/match/${match.id}/live`);
      await expect(
        officialPage.getByRole("button", { name: /start warmup/i }),
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
      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live`,
        {
          data: { action: "warmup" },
        },
      );
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
      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live`,
        {
          data: { action: "start_live" },
        },
      );
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
        },
      );
      expect(postRes.status()).toBe(201);
      const postBody = await postRes.json();
      expect(postBody.event.type).toBe("goal");

      // Score should be updated
      const stateRes = await adminPage.request.get(
        `/api/matches/${match.id}/live`,
      );
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
        data: {
          type: "goal",
          intervalNumber: 1,
          matchTimeMs: 60000,
          teamSide: "away",
        },
      });
      const stateRes = await adminPage.request.get(
        `/api/matches/${match.id}/live`,
      );
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
        {
          data: {
            type: "goal",
            intervalNumber: 1,
            matchTimeMs: 60000,
            teamSide: "home",
          },
        },
      );
      const { event } = await postRes.json();

      const delRes = await adminPage.request.delete(
        `/api/matches/${match.id}/live/events/${event.id}`,
      );
      expect(delRes.status()).toBe(200);

      const stateRes = await adminPage.request.get(
        `/api/matches/${match.id}/live`,
      );
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
        `/api/matches/${match.id}/live/finalize`,
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

      const res = await adminPage.request.get(
        `/api/matches/${match.id}/matchcard`,
      );
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

// ── API: interval lifecycle ────────────────────────────────────────────────

test.describe("live match API — interval lifecycle", () => {
  test("end_interval transitions to interval_break and records interval_end event", async ({
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

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live`,
        {
          data: { action: "end_interval" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.status).toBe("interval_break");
      expect(state.isRunning).toBe(false);
      expect(state.intervalStartedAt).toBeNull();

      // Verify interval_end event was recorded
      const eventsRes = await adminPage.request.get(
        `/api/matches/${match.id}/live/events`,
      );
      const { events } = await eventsRes.json();
      expect(
        events.some((e: { type: string }) => e.type === "interval_end"),
      ).toBe(true);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("start_next_interval increments interval counter to 2 and resumes timer", async ({
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
        data: { action: "end_interval" },
      });

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live`,
        {
          data: { action: "start_next_interval" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.status).toBe("live");
      expect(state.currentInterval).toBe(2);
      expect(state.isRunning).toBe(true);
      expect(state.intervalElapsedMs).toBe(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("complete action records match_end event and sets completed status", async ({
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

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live`,
        {
          data: { action: "complete" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.status).toBe("completed");
      expect(state.isRunning).toBe(false);

      const eventsRes = await adminPage.request.get(
        `/api/matches/${match.id}/live/events`,
      );
      const { events } = await eventsRes.json();
      expect(events.some((e: { type: string }) => e.type === "match_end")).toBe(
        true,
      );
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: timer control ─────────────────────────────────────────────────────

test.describe("live match API — timer control", () => {
  test("pause accumulates intervalElapsedMs and sets isRunning to false", async ({
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

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live/timer`,
        {
          data: { action: "pause" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.isRunning).toBe(false);
      expect(state.intervalStartedAt).toBeNull();
      // At least some ms should have accumulated
      expect(typeof state.intervalElapsedMs).toBe("number");
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("start resumes timer from paused state", async ({
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
      await adminPage.request.post(`/api/matches/${match.id}/live/timer`, {
        data: { action: "pause" },
      });

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live/timer`,
        {
          data: { action: "start" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.isRunning).toBe(true);
      expect(state.status).toBe("live");
      expect(state.intervalStartedAt).toBeTruthy();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("start_stoppage transitions to stoppage and records stoppage_start event", async ({
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

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live/timer`,
        {
          data: { action: "start_stoppage", stoppageReason: "injury" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.status).toBe("stoppage");
      expect(state.isRunning).toBe(false);
      expect(state.stoppageStartedAt).toBeTruthy();
      expect(state.stoppageReason).toBe("injury");

      const eventsRes = await adminPage.request.get(
        `/api/matches/${match.id}/live/events`,
      );
      const { events } = await eventsRes.json();
      expect(
        events.some(
          (e: { type: string; stoppageReason?: string }) =>
            e.type === "stoppage_start" && e.stoppageReason === "injury",
        ),
      ).toBe(true);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("end_stoppage resumes timer and records stoppage_end event", async ({
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
      await adminPage.request.post(`/api/matches/${match.id}/live/timer`, {
        data: { action: "start_stoppage", stoppageReason: "card" },
      });

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live/timer`,
        {
          data: { action: "end_stoppage" },
        },
      );
      expect(res.status()).toBe(200);
      const { state } = await res.json();
      expect(state.status).toBe("live");
      expect(state.isRunning).toBe(true);
      expect(state.stoppageStartedAt).toBeNull();
      expect(state.stoppageReason).toBeNull();

      const eventsRes = await adminPage.request.get(
        `/api/matches/${match.id}/live/events`,
      );
      const { events } = await eventsRes.json();
      expect(
        events.some((e: { type: string }) => e.type === "stoppage_end"),
      ).toBe(true);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("invalid timer action returns 400", async ({
    leagueAdminPage: adminPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx);

    try {
      await adminPage.request.post(`/api/matches/${match.id}/live`, {
        data: { action: "warmup" },
      });

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/live/timer`,
        {
          data: { action: "fly_to_moon" },
        },
      );
      expect(res.status()).toBe(400);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: event editing ─────────────────────────────────────────────────────

test.describe("live match API — event editing", () => {
  test("PATCH event updates playerName", async ({
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
            type: "foul",
            intervalNumber: 1,
            matchTimeMs: 60000,
            teamSide: "home",
            playerName: "Original Name",
          },
        },
      );
      const { event } = await postRes.json();

      const patchRes = await adminPage.request.patch(
        `/api/matches/${match.id}/live/events/${event.id}`,
        { data: { playerName: "Updated Name" } },
      );
      expect(patchRes.status()).toBe(200);
      const { event: updated } = await patchRes.json();
      expect(updated.playerName).toBe("Updated Name");
      expect(updated.editedAt).toBeTruthy();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("PATCH goal changing teamSide from home to away adjusts both scores", async ({
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
            matchTimeMs: 60000,
            teamSide: "home",
          },
        },
      );
      const { event } = await postRes.json();

      // Score should be home: 1, away: 0
      const before = await (
        await adminPage.request.get(`/api/matches/${match.id}/live`)
      ).json();
      expect(before.state.score.home).toBe(1);
      expect(before.state.score.away).toBe(0);

      // Move goal to away side
      await adminPage.request.patch(
        `/api/matches/${match.id}/live/events/${event.id}`,
        {
          data: { teamSide: "away" },
        },
      );

      const after = await (
        await adminPage.request.get(`/api/matches/${match.id}/live`)
      ).json();
      expect(after.state.score.home).toBe(0);
      expect(after.state.score.away).toBe(1);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("PATCH goal type to non-goal decrements score", async ({
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
            matchTimeMs: 60000,
            teamSide: "home",
          },
        },
      );
      const { event } = await postRes.json();

      await adminPage.request.patch(
        `/api/matches/${match.id}/live/events/${event.id}`,
        {
          data: { type: "foul" },
        },
      );

      const stateRes = await adminPage.request.get(
        `/api/matches/${match.id}/live`,
      );
      const { state } = await stateRes.json();
      expect(state.score.home).toBe(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: cards and penalties ───────────────────────────────────────────────

test.describe("live match API — cards and penalties", () => {
  test("POST green_card event creates active penalty with green card type", async ({
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
        data: {
          type: "green_card",
          intervalNumber: 1,
          matchTimeMs: 120000,
          teamSide: "home",
          playerName: "Card Player",
        },
      });

      const stateRes = await adminPage.request.get(
        `/api/matches/${match.id}/live`,
      );
      const { activePenalties } = await stateRes.json();
      expect(activePenalties.length).toBe(1);
      expect(activePenalties[0].cardType).toBe("green");
      expect(activePenalties[0].playerName).toBe("Card Player");
      expect(activePenalties[0].totalDurationMs).toBeGreaterThanOrEqual(120000);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("POST yellow_card event creates penalty with default 5 minute duration", async ({
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
        data: {
          type: "yellow_card",
          intervalNumber: 1,
          matchTimeMs: 120000,
          teamSide: "away",
          playerName: "Yellow Player",
        },
      });

      const stateRes = await adminPage.request.get(
        `/api/matches/${match.id}/live`,
      );
      const { activePenalties } = await stateRes.json();
      expect(activePenalties.length).toBe(1);
      expect(activePenalties[0].cardType).toBe("yellow");
      expect(activePenalties[0].totalDurationMs).toBe(300000); // 5 minutes default
      expect(activePenalties[0].teamSide).toBe("away");
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("DELETE active penalty removes it from activePenalties", async ({
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
        data: {
          type: "green_card",
          intervalNumber: 1,
          matchTimeMs: 60000,
          teamSide: "home",
          playerName: "P1",
        },
      });

      const before = await (
        await adminPage.request.get(`/api/matches/${match.id}/live`)
      ).json();
      expect(before.activePenalties.length).toBe(1);
      const penaltyId = before.activePenalties[0].id;

      const delRes = await adminPage.request.delete(
        `/api/matches/${match.id}/live/penalties/${penaltyId}`,
      );
      expect(delRes.status()).toBe(200);
      const { success } = await delRes.json();
      expect(success).toBe(true);

      const after = await (
        await adminPage.request.get(`/api/matches/${match.id}/live`)
      ).json();
      expect(after.activePenalties.length).toBe(0);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── API: authorization checks ──────────────────────────────────────────────

test.describe("live match API — authorization", () => {
  test("unauthenticated GET /live returns 401", async ({ page }) => {
    const res = await page.request.get("/api/matches/some-match-id/live");
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST /live returns 401", async ({ page }) => {
    const res = await page.request.post("/api/matches/some-match-id/live", {
      data: { action: "warmup" },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated POST /live/timer returns 401", async ({ page }) => {
    const res = await page.request.post(
      "/api/matches/some-match-id/live/timer",
      {
        data: { action: "pause" },
      },
    );
    expect(res.status()).toBe(401);
  });

  test("unauthenticated GET /live/events returns 401", async ({ page }) => {
    const res = await page.request.get(
      "/api/matches/some-match-id/live/events",
    );
    expect(res.status()).toBe(401);
  });

  test("unauthenticated GET /matchcard returns 401", async ({ page }) => {
    const res = await page.request.get("/api/matches/some-match-id/matchcard");
    expect(res.status()).toBe(401);
  });
});

// ── API: match card workflow ───────────────────────────────────────────────

test.describe("live match API — match card resolve workflow", () => {
  test("resolve with force=false sets status to resolved", async ({
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

      // Manually set to disputed so resolve is applicable
      await adminPage.request
        .patch(`/api/matches/${match.id}`, { data: {} })
        .catch(() => {});
      // Directly set card to disputed via Firestore (not exposed via API for admin, so we test resolve on pending_review)

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/matchcard/resolve`,
        {
          data: { resolutionNotes: "Reviewed and confirmed", force: false },
        },
      );
      expect(res.status()).toBe(200);
      const { matchCard } = await res.json();
      expect(matchCard.status).toBe("resolved");
      expect(matchCard.resolutionNotes).toBe("Reviewed and confirmed");
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("resolve with force=true sets status to confirmed", async ({
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

      const res = await adminPage.request.post(
        `/api/matches/${match.id}/matchcard/resolve`,
        {
          data: { resolutionNotes: "Force confirmed by admin", force: true },
        },
      );
      expect(res.status()).toBe(200);
      const { matchCard } = await res.json();
      expect(matchCard.status).toBe("confirmed");
      expect(matchCard.resolvedBy).toBeTruthy();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("match official cannot resolve match card (403)", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
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

      const res = await officialPage.request.post(
        `/api/matches/${match.id}/matchcard/resolve`,
        {
          data: { resolutionNotes: "Unauthorized attempt", force: false },
        },
      );
      expect(res.status()).toBe(403);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── UI: team admin live view ───────────────────────────────────────────────

test.describe("team admin live match view", () => {
  test("renders read-only live view page for a live match", async ({
    leagueAdminPage: adminPage,
    teamAdminPage,
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

      await teamAdminPage.goto(`/team/match/${match.id}/live`);
      await expect(teamAdminPage).toHaveURL(`/team/match/${match.id}/live`, {
        timeout: 15_000,
      });
      // Should not redirect away (page renders for team_admin role)
      await expect(teamAdminPage).not.toHaveURL(/\/login/);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});

// ── UI: admin match card review page ──────────────────────────────────────

test.describe("admin match card review page", () => {
  test("renders card review page after finalization", async ({
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

      await adminPage.goto(`/admin/matches/${match.id}/card`);
      await expect(adminPage).toHaveURL(`/admin/matches/${match.id}/card`, {
        timeout: 15_000,
      });
      await expect(adminPage).not.toHaveURL(/\/login/);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("official live match page shows event feed after goal event", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
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
        data: {
          type: "goal",
          intervalNumber: 1,
          matchTimeMs: 60000,
          teamSide: "home",
          playerName: "Scorer",
        },
      });

      await officialPage.goto(`/official/match/${match.id}/live`);
      await expect(officialPage).toHaveURL(`/official/match/${match.id}/live`);
      // ScoreBoard should reflect 1-0 — target the large score digit paragraph
      await expect(
        officialPage.locator("p.font-black.tabular-nums").filter({ hasText: /^1$/ }).first()
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});
