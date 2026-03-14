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
