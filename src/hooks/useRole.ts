import { useAuth } from "@/providers/AuthProvider";
import { UserRole } from "@/types";

export function useRole() {
  const { roles, hasRole, hasAnyRole, loading } = useAuth();

  const isLeagueAdmin = hasRole("league_admin");
  const isMatchOfficial = hasRole("match_official");
  const isTeamAdmin = hasRole("team_admin");
  const isPlayer = hasRole("player");

  const primaryRole: UserRole = isLeagueAdmin
    ? "league_admin"
    : isMatchOfficial
    ? "match_official"
    : isTeamAdmin
    ? "team_admin"
    : isPlayer
    ? "player"
    : "public";

  return {
    roles,
    primaryRole,
    isLeagueAdmin,
    isMatchOfficial,
    isTeamAdmin,
    isPlayer,
    hasRole,
    hasAnyRole,
    loading,
  };
}
