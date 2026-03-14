import { UserRole } from "@/types";

export const ROLES: Record<UserRole, UserRole> = {
  league_admin: "league_admin",
  match_official: "match_official",
  team_admin: "team_admin",
  player: "player",
  public: "public",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  league_admin: "League Admin",
  match_official: "Match Official",
  team_admin: "Team Admin",
  player: "Player",
  public: "Public",
};

export const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  "/admin": ["league_admin"],
  "/official": ["match_official"],
  "/team": ["team_admin"],
  "/player": ["player", "team_admin", "match_official", "league_admin"],
};
