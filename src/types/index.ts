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

// Phase 5: Live Match Engine

export type LiveMatchStatus = "warmup" | "live" | "stoppage" | "interval_break" | "completed";

export type MatchEventType =
  | "goal"
  | "green_card"
  | "yellow_card"
  | "red_card"
  | "penalty_corner"
  | "penalty_stroke"
  | "substitution"
  | "stoppage_start"
  | "stoppage_end"
  | "interval_end"
  | "match_end"
  | "shot_on_goal"
  | "shot_off_goal"
  | "free_hit"
  | "long_corner"
  | "turnover"
  | "aerial"
  | "tackle"
  | "interception"
  | "circle_entry";

export type CardType = "green" | "yellow" | "red";
export type StoppageReason = "penalty_corner" | "injury" | "video_referral" | "other";

export interface LiveMatchEvent {
  id: string;
  type: MatchEventType;
  intervalNumber: number;
  matchTimeMs: number;
  teamId?: string;
  teamSide?: "home" | "away";
  playerId?: string;
  playerName?: string;
  playerJersey?: number;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  cardType?: CardType;
  penaltyDurationMs?: number;
  stoppageReason?: StoppageReason;
  stoppageDurationMs?: number;
  notes?: string;
  createdAt: number; // ms timestamp
  createdBy: string;
  editedAt?: number;
  editedBy?: string;
}

export interface ActivePenalty {
  id: string;
  playerId: string;
  playerName: string;
  playerJersey?: number;
  teamId: string;
  teamSide: "home" | "away";
  cardType: "green" | "yellow";
  totalDurationMs: number;
  elapsedMs: number;
  startedAt: number | null;
  isRunning: boolean;
  eventId: string;
}

export interface LiveMatchState {
  status: LiveMatchStatus;
  currentInterval: number;
  intervalElapsedMs: number;
  intervalStartedAt: number | null;
  isRunning: boolean;
  stoppageStartedAt: number | null;
  stoppageReason: StoppageReason | null;
  score: { home: number; away: number };
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}

export interface LiveMatchData {
  state: LiveMatchState | null;
  events: LiveMatchEvent[];
  activePenalties: ActivePenalty[];
}

export type MatchCardStatus = "pending_review" | "confirmed" | "disputed" | "resolved";

export interface MatchCardEvent {
  eventId: string;
  type: MatchEventType;
  intervalNumber: number;
  matchTimeMs: number;
  teamId?: string;
  teamSide?: "home" | "away";
  playerId?: string;
  playerName?: string;
  playerJersey?: number;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  cardType?: CardType;
  stoppageDurationMs?: number;
  notes?: string;
  disputed?: boolean;
  disputeComment?: string;
}

export interface MatchCard {
  id: string; // = matchId
  matchId: string;
  homeTeamId: string;
  homeTeamName: string;
  homeClubId: string;
  awayTeamId: string;
  awayTeamName: string;
  awayClubId: string;
  finalScore: { home: number; away: number };
  events: MatchCardEvent[];
  status: MatchCardStatus;
  homeTeamConfirmedAt?: string;
  homeTeamConfirmedBy?: string;
  awayTeamConfirmedAt?: string;
  awayTeamConfirmedBy?: string;
  disputedAt?: string;
  disputedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamSide: "home" | "away";
  goals: number;
  assists: number;
  penaltyCorners: number;
  penaltyStrokes: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  tackles: number;
  interceptions: number;
  circleEntries: number;
  shotsOnGoal: number;
  shotsOffGoal: number;
  freeHits: number;
  longCorners: number;
  turnovers: number;
  aerials: number;
  minutesPlayed: number;
}

export interface TeamMatchStats {
  teamId: string;
  teamSide: "home" | "away";
  goals: number;
  penaltyCorners: number;
  penaltyStrokes: number;
  shotsOnGoal: number;
  shotsOffGoal: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  circleEntries: number;
  freeHits: number;
  longCorners: number;
  turnovers: number;
}

export interface MatchStats {
  id: string; // = matchId
  matchId: string;
  leagueId?: string;
  tournamentId?: string;
  homeTeamStats: TeamMatchStats;
  awayTeamStats: TeamMatchStats;
  playerStats: PlayerMatchStats[];
  createdAt: string;
  updatedAt: string;
}

// Phase 7: Public Stats & League Tables

export interface LeagueStanding {
  id: string; // = `${leagueId}_${teamId}`
  leagueId: string;
  teamId: string;
  teamName?: string;
  clubId?: string;
  clubName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Last 5 match results: 'W', 'D', 'L' */
  form?: string[];
  updatedAt: string;
}

export interface PlayerSeasonStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName?: string;
  clubId?: string;
  clubName?: string;
  leagueId?: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  penaltyCorners: number;
  penaltyStrokes: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  tackles: number;
  interceptions: number;
  circleEntries: number;
  shotsOnGoal: number;
  shotsOffGoal: number;
  freeHits: number;
  longCorners: number;
  turnovers: number;
  aerials: number;
  minutesPlayed: number;
}

// Phase 6: Articles & CMS

export type ArticleStatus = "draft" | "published" | "archived";

export interface Article {
  id: string;
  title: string;
  slug: string;
  /** TipTap JSON document */
  content: Record<string, unknown>;
  excerpt: string;
  headerImageUrl: string | null;
  headerImagePath: string | null;
  status: ArticleStatus;
  /** Roles that can read this article. Include "public" for unauthenticated access. */
  visibility: UserRole[];
  authorId: string;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
