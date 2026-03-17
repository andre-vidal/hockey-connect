import { UserRole } from "@/types";

export const ROLES: Record<UserRole, UserRole> = {
  root: "root",
  league_admin: "league_admin",
  match_official: "match_official",
  club_admin: "club_admin",
  team_admin: "team_admin",
  player: "player",
  public: "public",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  root: "Root",
  league_admin: "League Admin",
  match_official: "Match Official",
  club_admin: "Club Admin",
  team_admin: "Team Admin",
  player: "Player",
  public: "Public",
};

export const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  "/root": ["root"],
  "/admin": ["root", "league_admin"],
  "/official": ["root", "match_official"],
  "/team": ["root", "club_admin", "team_admin"],
  "/player": ["root", "player", "club_admin", "team_admin", "match_official", "league_admin"],
};
