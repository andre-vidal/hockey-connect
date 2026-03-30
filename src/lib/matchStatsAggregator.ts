import { adminDb } from "@/lib/firebase/admin";
import type { MatchCard, MatchCardEvent, PlayerMatchStats, TeamMatchStats, MatchStats } from "@/types";

function emptyPlayerStats(playerId: string, playerName: string, teamId: string, teamSide: "home" | "away"): PlayerMatchStats {
  return {
    playerId, playerName, teamId, teamSide,
    goals: 0, assists: 0, penaltyCorners: 0, penaltyStrokes: 0,
    greenCards: 0, yellowCards: 0, redCards: 0, saves: 0,
    tackles: 0, interceptions: 0, circleEntries: 0, shotsOnGoal: 0,
    shotsOffGoal: 0, freeHits: 0, longCorners: 0, turnovers: 0,
    aerials: 0, minutesPlayed: 0,
  };
}

function emptyTeamStats(teamId: string, teamSide: "home" | "away"): TeamMatchStats {
  return {
    teamId, teamSide, goals: 0, penaltyCorners: 0, penaltyStrokes: 0,
    shotsOnGoal: 0, shotsOffGoal: 0, greenCards: 0, yellowCards: 0, redCards: 0,
    circleEntries: 0, freeHits: 0, longCorners: 0, turnovers: 0,
  };
}

export async function aggregateAndSaveStats(matchCard: MatchCard & { id: string }): Promise<void> {
  const now = new Date().toISOString();
  const playerMap = new Map<string, PlayerMatchStats>();
  const homeTeamStats = emptyTeamStats(matchCard.homeTeamId, "home");
  const awayTeamStats = emptyTeamStats(matchCard.awayTeamId, "away");

  function getOrCreatePlayer(event: MatchCardEvent): PlayerMatchStats | null {
    if (!event.playerId) return null;
    const key = event.playerId;
    if (!playerMap.has(key)) {
      playerMap.set(key, emptyPlayerStats(
        event.playerId,
        event.playerName ?? "",
        event.teamId ?? "",
        event.teamSide ?? "home"
      ));
    }
    return playerMap.get(key)!;
  }

  function teamStats(side: "home" | "away"): TeamMatchStats {
    return side === "home" ? homeTeamStats : awayTeamStats;
  }

  for (const ev of matchCard.events) {
    const side = ev.teamSide ?? "home";
    const ts = teamStats(side);
    const ps = getOrCreatePlayer(ev);

    switch (ev.type) {
      case "goal":
        ts.goals++;
        if (ps) ps.goals++;
        break;
      case "penalty_corner":
        ts.penaltyCorners++;
        if (ps) ps.penaltyCorners++;
        break;
      case "penalty_stroke":
        ts.penaltyStrokes++;
        if (ps) ps.penaltyStrokes++;
        break;
      case "shot_on_goal":
        ts.shotsOnGoal++;
        if (ps) ps.shotsOnGoal++;
        break;
      case "shot_off_goal":
        ts.shotsOffGoal++;
        if (ps) ps.shotsOffGoal++;
        break;
      case "green_card":
        ts.greenCards++;
        if (ps) ps.greenCards++;
        break;
      case "yellow_card":
        ts.yellowCards++;
        if (ps) ps.yellowCards++;
        break;
      case "red_card":
        ts.redCards++;
        if (ps) ps.redCards++;
        break;
      case "circle_entry":
        ts.circleEntries++;
        if (ps) ps.circleEntries++;
        break;
      case "free_hit":
        ts.freeHits++;
        if (ps) ps.freeHits++;
        break;
      case "long_corner":
        ts.longCorners++;
        if (ps) ps.longCorners++;
        break;
      case "turnover":
        ts.turnovers++;
        if (ps) ps.turnovers++;
        break;
      case "tackle":
        if (ps) ps.tackles++;
        break;
      case "interception":
        if (ps) ps.interceptions++;
        break;
      case "aerial":
        if (ps) ps.aerials++;
        break;
    }
  }

  const matchStats: Omit<MatchStats, "id"> = {
    matchId: matchCard.matchId,
    homeTeamStats,
    awayTeamStats,
    playerStats: Array.from(playerMap.values()),
    createdAt: now,
    updatedAt: now,
  };

  // Get leagueId/tournamentId from match
  const matchDoc = await adminDb.collection("matches").doc(matchCard.matchId).get();
  if (matchDoc.exists) {
    const md = matchDoc.data()!;
    if (md.leagueId) (matchStats as MatchStats).leagueId = md.leagueId;
    if (md.tournamentId) (matchStats as MatchStats).tournamentId = md.tournamentId;
  }

  await adminDb.collection("matchStats").doc(matchCard.matchId).set(matchStats);

  // Update league standings if leagueId present
  const leagueId = (matchStats as MatchStats).leagueId;
  if (leagueId) {
    const homeGoals = matchCard.finalScore.home;
    const awayGoals = matchCard.finalScore.away;

    const homeWin = homeGoals > awayGoals;
    const awayWin = awayGoals > homeGoals;
    const draw = homeGoals === awayGoals;

    await updateStandings(leagueId, matchCard.homeTeamId, homeWin, draw, homeGoals, awayGoals);
    await updateStandings(leagueId, matchCard.awayTeamId, awayWin, draw, awayGoals, homeGoals);
  }
}

async function updateStandings(
  leagueId: string, teamId: string,
  win: boolean, draw: boolean,
  goalsFor: number, goalsAgainst: number
): Promise<void> {
  const docId = `${leagueId}_${teamId}`;
  const ref = adminDb.collection("leagueStandings").doc(docId);
  const snap = await ref.get();

  const points = win ? 3 : draw ? 1 : 0;

  if (!snap.exists) {
    await ref.set({
      leagueId, teamId,
      played: 1,
      won: win ? 1 : 0,
      drawn: draw ? 1 : 0,
      lost: (!win && !draw) ? 1 : 0,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const d = snap.data()!;
    await ref.update({
      played: (d.played ?? 0) + 1,
      won: (d.won ?? 0) + (win ? 1 : 0),
      drawn: (d.drawn ?? 0) + (draw ? 1 : 0),
      lost: (d.lost ?? 0) + ((!win && !draw) ? 1 : 0),
      goalsFor: (d.goalsFor ?? 0) + goalsFor,
      goalsAgainst: (d.goalsAgainst ?? 0) + goalsAgainst,
      goalDifference: (d.goalDifference ?? 0) + (goalsFor - goalsAgainst),
      points: (d.points ?? 0) + points,
      updatedAt: new Date().toISOString(),
    });
  }
}
