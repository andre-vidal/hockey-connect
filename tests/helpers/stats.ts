import type { APIRequestContext } from "@playwright/test";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Seeds a player under a club. Requires league_admin credentials.
 */
export async function seedPlayer(
  request: APIRequestContext,
  clubId: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    position: string;
    jerseyNumber: number;
    status: string;
  }> = {}
): Promise<{ id: string; [key: string]: unknown }> {
  const res = await request.post(`/api/clubs/${clubId}/players`, {
    data: {
      firstName: overrides.firstName ?? `First${uid()}`,
      lastName: overrides.lastName ?? `Last${uid()}`,
      email: `player-${uid()}@test.com`,
      position: overrides.position ?? "midfielder",
      jerseyNumber: overrides.jerseyNumber ?? 10,
      status: overrides.status ?? "active",
    },
  });
  const data = await res.json();
  return data.player;
}

/**
 * Deletes players from a club. Silently ignores errors.
 */
export async function cleanupPlayers(
  request: APIRequestContext,
  clubId: string,
  playerIds: string[]
): Promise<void> {
  await Promise.all(
    playerIds.map((id) =>
      request.delete(`/api/clubs/${clubId}/players/${id}`).catch(() => {})
    )
  );
}

/**
 * Seeds a club with a specified number of active players.
 */
export async function seedClubWithPlayers(
  request: APIRequestContext,
  count = 3
): Promise<{ clubId: string; playerIds: string[] }> {
  const clubRes = await request.post("/api/clubs", {
    data: { name: `StatsClub ${uid()}`, country: "Testland" },
  });
  const { club } = await clubRes.json();

  const players = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      seedPlayer(request, club.id, {
        firstName: `Player${i + 1}`,
        lastName: `Test${uid()}`,
        jerseyNumber: i + 1,
      })
    )
  );

  return {
    clubId: club.id,
    playerIds: players.map((p) => p.id as string),
  };
}

/**
 * Cleans up a club and all of its players.
 */
export async function cleanupClubWithPlayers(
  request: APIRequestContext,
  clubId: string,
  playerIds: string[]
): Promise<void> {
  await cleanupPlayers(request, clubId, playerIds);
  await request.delete(`/api/clubs/${clubId}`).catch(() => {});
}
