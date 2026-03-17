/**
 * Centralised page selectors derived from the actual component markup.
 * Keeping them here means a single update propagates to all spec files.
 */

export const login = {
  /** <Input id="email"> */
  emailInput: "#email",
  /** <Input id="password"> */
  passwordInput: "#password",
  /** <Button type="submit">Sign in</Button> */
  submitButton: 'button[type="submit"]',
  /** <Button>Sign in with Google</Button> */
  googleButton: 'button:has-text("Sign in with Google")',
  /** <Button variant="ghost">Continue as guest</Button> */
  guestButton: 'button:has-text("Continue as guest")',
  /** Error div rendered when login fails */
  errorMessage: ".text-red-700",
} as const;

export const register = {
  /** <Input id="displayName"> */
  displayNameInput: "#displayName",
  /** <Input id="email"> */
  emailInput: "#email",
  /** <Input id="password"> */
  passwordInput: "#password",
  /** <Input id="confirmPassword"> */
  confirmPasswordInput: "#confirmPassword",
  /** <Button type="submit">Create account</Button> */
  submitButton: 'button[type="submit"]',
  /** Error div rendered on validation / Firebase errors */
  errorMessage: ".text-red-700",
} as const;

export const maintenance = {
  /** <h1>Under Maintenance</h1> */
  heading: 'h1:has-text("Under Maintenance")',
} as const;

// ── Phase 2 admin selectors ───────────────────────────────────────────────────

export const adminLeagues = {
  newLeagueLink: 'a:has-text("New League")',
  nameInput: "#name",
  countryInput: "#country",
  /** Radix Select trigger for gender */
  genderTrigger: "#gender",
  submitButton: 'button:has-text("Create League")',
  saveButton: 'button:has-text("Save Changes")',
  deleteButton: 'button:has-text("Delete")',
  /** Inside the delete confirmation modal */
  confirmDeleteButton: 'button:has-text("Delete League")',
  newSeasonButton: 'button:has-text("New Season")',
  /** Inside the new season modal */
  seasonNameInput: 'input[placeholder="2026/2027"]',
  createSeasonButton: 'button:has-text("Create Season")',
} as const;

export const adminClubs = {
  newClubLink: 'a:has-text("New Club")',
  nameInput: "#name",
  shortNameInput: "#shortName",
  logoInput: "#logo",
  emailInput: "#email",
  cityInput: "#city",
  countryInput: "#country",
  submitButton: 'button:has-text("Create Club")',
  saveButton: 'button:has-text("Save Changes")',
  deleteButton: 'button:has-text("Delete")',
  confirmDeleteButton: 'button:has-text("Delete Club")',
} as const;

export const adminTournaments = {
  newTournamentLink: 'a:has-text("New Tournament")',
  nameInput: "#name",
  venueInput: "#venue",
  startDateInput: "#startDate",
  endDateInput: "#endDate",
  submitButton: 'button:has-text("Create Tournament")',
  saveButton: 'button:has-text("Save Changes")',
  deleteButton: 'button:has-text("Delete")',
  confirmDeleteButton: 'button:has-text("Delete Tournament")',
} as const;

export const adminOfficials = {
  addOfficialLink: 'a:has-text("Add Official")',
  userSearchInput: "#userSearch",
  /** First button in the user search dropdown (rendered after #userSearch) */
  userSearchFirstResult: "#userSearch + div button, #userSearch ~ div button",
  /** Checkbox label text for official types */
  umpireCheckbox: 'label:has-text("Umpire") input[type="checkbox"]',
  tableOperatorCheckbox:
    'label:has-text("Table Operator") input[type="checkbox"]',
  submitButton: 'button:has-text("Register Official")',
  saveButton: 'button:has-text("Save Changes")',
  deleteButton: 'button:has-text("Delete")',
  confirmDeleteButton: 'button:has-text("Remove Official")',
} as const;

export const adminUsers = {
  inviteButton: 'button:has-text("Invite Club Admin")',
  /** Inside the invite modal */
  inviteEmailInput: "#inviteEmail",
  inviteNameInput: "#inviteName",
  sendInviteButton: 'button:has-text("Send Invitation")',
} as const;

// ── Club admin selectors ──────────────────────────────────────────────────────

export const clubTeams = {
  newTeamLink: 'a:has-text("New Team")',
  nameInput: "#name",
  /** Radix Select trigger for gender */
  genderTrigger: "#gender",
  ageGroupInput: "#ageGroup",
  divisionInput: "#division",
  submitButton: 'button:has-text("Create Team")',
  saveButton: 'button:has-text("Save Changes")',
  /** Destructive button on the edit page */
  deleteButton: 'button:has-text("Delete")',
  /** Inside the delete confirmation dialog */
  confirmDeleteButton: 'button:has-text("Delete Team")',
} as const;

export const clubPlayers = {
  addPlayerLink: 'a:has-text("Add Player")',
  invitePlayerLink: 'a:has-text("Invite Player")',
  firstNameInput: "#firstName",
  lastNameInput: "#lastName",
  emailInput: "#email",
  /** Radix Select trigger for position */
  positionTrigger: "#position",
  /** Radix Select trigger for status (edit page only) */
  statusTrigger: "#status",
  submitButton: 'button:has-text("Add Player")',
  /** Submit button on the invite player form */
  inviteSubmitButton: 'button:has-text("Send Invitation")',
  saveButton: 'button:has-text("Save Changes")',
  /** Destructive button on the edit page — triggers window.confirm() */
  removeButton: 'button:has-text("Remove")',
} as const;

export const clubSquads = {
  newSquadLink: 'a:has-text("New Squad")',
  /** Radix Select trigger for team */
  teamTrigger: "#teamId",
  /** Radix Select trigger for league (shown when League type selected) */
  leagueTrigger: "#leagueId",
  seasonInput: "#season",
  submitButton: 'button:has-text("Create Squad")',
  submitForApprovalButton: 'button:has-text("Submit for Approval")',
} as const;

export const clubUsers = {
  searchInput: 'input[placeholder="Search users..."]',
  /** Edit button (pencil icon) in the Actions column of each row */
  editUserButton: 'button:has(.lucide-pencil)',
  saveButton: 'button:has-text("Save Changes")',
} as const;
