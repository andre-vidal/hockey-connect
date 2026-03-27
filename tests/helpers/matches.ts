import type { APIRequestContext } from "@playwright/test";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface MatchFixtures {
  league: { id: string; name: string };
  club1: { id: string; name: string };
  club2: { id: string; name: string };
  team1: { id: string; name: string; clubId: string };
  team2: { id: string; name: string; clubId: string };
}

/**
 * Seeds the minimum data needed to create a match: one league, two clubs,
 * one team per club. Requires league_admin credentials on the request context.
 */
export async function seedMatchFixtures(request: APIRequestContext): Promise<MatchFixtures> {
  const leagueRes = await request.post("/api/leagues", {
    data: { name: `League ${uid()}`, country: "Testland", gender: "male" },
  });
  const { league } = await leagueRes.json();

  const club1Res = await request.post("/api/clubs", {
    data: { name: `Club A ${uid()}`, country: "Testland" },
  });
  const { club: club1 } = await club1Res.json();

  const club2Res = await request.post("/api/clubs", {
    data: { name: `Club B ${uid()}`, country: "Testland" },
  });
  const { club: club2 } = await club2Res.json();

  const team1Res = await request.post(`/api/clubs/${club1.id}/teams`, {
    data: { name: "First XI", gender: "male" },
  });
  const { team: team1 } = await team1Res.json();

  const team2Res = await request.post(`/api/clubs/${club2.id}/teams`, {
    data: { name: "First XI", gender: "male" },
  });
  const { team: team2 } = await team2Res.json();

  return { league, club1, club2, team1, team2 };
}

/**
 * Creates a single match using pre-seeded fixture data. Requires league_admin credentials.
 */
export async function seedMatch(
  request: APIRequestContext,
  fixtures: MatchFixtures,
  overrides: Partial<{
    venue: string;
    scheduledAt: string;
    status: string;
  }> = {}
): Promise<{ id: string; [key: string]: unknown }> {
  const { league, club1, club2, team1, team2 } = fixtures;

  const res = await request.post("/api/matches", {
    data: {
      leagueId: league.id,
      homeTeamId: team1.id,
      homeTeamName: `${club1.name} — ${team1.name}`,
      homeClubId: club1.id,
      awayTeamId: team2.id,
      awayTeamName: `${club2.name} — ${team2.name}`,
      awayClubId: club2.id,
      venue: overrides.venue ?? "Test Stadium",
      scheduledAt: overrides.scheduledAt ?? "2026-12-01T14:00:00.000Z",
    },
  });

  const { match } = await res.json();

  if (overrides.status && overrides.status !== "scheduled") {
    await request.patch(`/api/matches/${match.id}`, {
      data: { status: overrides.status },
    });
    return { ...match, status: overrides.status };
  }

  return match;
}

/**
 * Deletes all fixture data created by seedMatchFixtures. Requires league_admin credentials.
 */
export async function cleanupMatchFixtures(
  request: APIRequestContext,
  fixtures: MatchFixtures,
  matchIds: string[] = []
): Promise<void> {
  for (const matchId of matchIds) {
    // Ensure match is scheduled before attempting delete (API rejects non-scheduled)
    await request.patch(`/api/matches/${matchId}`, { data: { status: "scheduled" } }).catch(() => {});
    await request.delete(`/api/matches/${matchId}`).catch(() => {});
  }
  await request.delete(`/api/leagues/${fixtures.league.id}`).catch(() => {});
  await request.delete(`/api/clubs/${fixtures.club1.id}`).catch(() => {});
  await request.delete(`/api/clubs/${fixtures.club2.id}`).catch(() => {});
}
