export type UserRole = "root" | "league_admin" | "match_official" | "club_admin" | "team_admin" | "player" | "public";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  roles: UserRole[];
  /** Set for club_admin and team_admin — the club they belong to */
  clubId?: string | null;
  /** Set for team_admin — the specific team(s) they manage within the club */
  teamIds?: string[];
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

// Phase 3: Player & Team Management

export type PlayerStatus = "active" | "inactive" | "injured" | "suspended";

export type Position =
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "forward"
  | "utility";

export interface Player {
  id: string;
  clubId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string;
  dateOfBirth?: string; // ISO date string
  gender?: Gender;
  nationality?: string;
  position?: Position;
  jerseyNumber?: number;
  photoUrl?: string;
  status: PlayerStatus;
  /** null until the player registers via invite link */
  claimedByUserId: string | null;
  inviteToken?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  gender: Gender;
  ageGroup?: string;
  division?: string;
  leagueId?: string;
  /** Admin user uid scoped to this team */
  teamAdminId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type SquadStatus = "draft" | "submitted" | "approved" | "rejected";

export interface SquadPlayer {
  playerId: string;
  jerseyNumber: number;
  position: Position;
}

export interface Squad {
  id: string;
  teamId: string;
  clubId: string;
  /** Either leagueId or tournamentId must be set */
  leagueId?: string;
  tournamentId?: string;
  season?: string;
  status: SquadStatus;
  players: SquadPlayer[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MatchRosterPlayer {
  playerId: string;
  jerseyNumber: number;
  position: Position;
  isSubstitute: boolean;
}

export interface MatchRoster {
  id: string;
  matchId: string;
  teamId: string;
  clubId: string;
  squadId: string;
  players: MatchRosterPlayer[];
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

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

// Phase 4: Match Scheduling

export type MatchStatus = "scheduled" | "warmup" | "live" | "completed" | "confirmed";

export interface MatchOfficialAssignment {
  officialId: string;
  userId: string;
  displayName: string;
  type: OfficialType;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface Match {
  id: string;
  /** Either leagueId or tournamentId must be set */
  leagueId?: string;
  tournamentId?: string;
  homeTeamId: string;
  homeTeamName: string;
  homeClubId: string;
  awayTeamId: string;
  awayTeamName: string;
  awayClubId: string;
  venue: string;
  scheduledAt: string; // ISO date-time
  status: MatchStatus;
  officials: MatchOfficialAssignment[];
  result?: MatchResult;
  matchConfig: MatchIntervalConfig;
  matchCardConfirmed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
