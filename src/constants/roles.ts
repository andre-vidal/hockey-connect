import { UserRole } from "@/types";

export const ROLES: Record<UserRole, UserRole> = {
  root: "root",
  league_admin: "league_admin",
  match_official: "match_official",
  team_admin: "team_admin",
  player: "player",
  public: "public",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  root: "Root",
  league_admin: "League Admin",
  match_official: "Match Official",
  team_admin: "Team Admin",
  player: "Player",
  public: "Public",
};

export const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  "/root": ["root"],
  "/admin": ["root", "league_admin"],
  "/official": ["root", "match_official"],
  "/team": ["root", "team_admin"],
  "/player": ["root", "player", "team_admin", "match_official", "league_admin"],
};
