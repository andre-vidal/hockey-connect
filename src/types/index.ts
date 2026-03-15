export type UserRole = "root" | "league_admin" | "match_official" | "team_admin" | "player" | "public";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  roles: UserRole[];
  clubId?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isAnonymous: boolean;
}

export interface AppSettings {
  id: string;
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface MaintenanceFlag {
  enabled: boolean;
  message?: string;
}

export interface MatchIntervalConfig {
  numberOfIntervals: number;
  intervalDuration: number; // minutes
  halfTimeDuration: number; // minutes
}

export interface WindowConfig {
  isOpen: boolean;
  openDate: string; // ISO string
  closeDate: string; // ISO string
}

export interface SeasonConfig {
  currentSeason: string; // e.g. "2025/2026"
  startDate: string;
  endDate: string;
}

export type LeagueStatus = "active" | "inactive" | "archived";
export type Gender = "male" | "female" | "mixed";

export interface League {
  id: string;
  name: string;
  description?: string;
  country: string;
  division?: string;
  gender: Gender;
  ageGroup?: string;
  matchConfig: MatchIntervalConfig;
  transferWindow: WindowConfig;
  squadSetupWindow: WindowConfig;
  season: SeasonConfig;
  status: LeagueStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type TournamentStatus = "upcoming" | "active" | "completed" | "cancelled";

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  leagueId?: string;
  venue: string;
  startDate: string;
  endDate: string;
  matchConfig: MatchIntervalConfig;
  squadSetupWindow: WindowConfig;
  status: TournamentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Club {
  id: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  foundedYear?: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type OfficialType = "umpire" | "table_operator" | "technical_delegate" | "medical_officer";

export interface MatchOfficial {
  id: string;
  userId: string;
  playerId?: string;
  displayName: string;
  email: string;
  phone?: string;
  officialTypes: OfficialType[];
  certificationLevel?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
