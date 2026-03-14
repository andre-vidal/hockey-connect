export type UserRole = "league_admin" | "match_official" | "team_admin" | "player" | "public";

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
