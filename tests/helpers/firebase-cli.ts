import { execSync } from "child_process";

/**
 * Runs a firebase CLI command against the configured project.
 * Requires `firebase-tools` to be installed globally and the CLI
 * to be authenticated (`firebase login`).
 */
function firebaseCli(args: string): void {
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!project) throw new Error("FIREBASE_PROJECT_ID is not set in .env.test");

  execSync(`firebase ${args} --project ${project} --non-interactive`, {
    stdio: "pipe",
    env: process.env,
  });
}

/**
 * Sets /maintenance/enabled in the Realtime Database.
 *
 * The MaintenanceProvider subscribes to this path via onValue() and
 * performs a client-side router.replace("/maintenance") when true, or
 * router.replace("/") when false and the user is already on /maintenance.
 *
 * `firebase database:set` writes a JSON literal, so passing the boolean
 * `true`/`false` stores it as a boolean (not a string), matching the
 * `snapshot.val() === true` check in MaintenanceProvider.
 */
export function setMaintenanceMode(enabled: boolean): void {
  firebaseCli(`database:set /maintenance/enabled ${String(enabled)}`);
}

/**
 * Convenience wrapper — always call this in afterEach/afterAll hooks
 * to leave the RTDB in a clean state for subsequent test runs.
 */
export function resetMaintenanceMode(): void {
  setMaintenanceMode(false);
}
