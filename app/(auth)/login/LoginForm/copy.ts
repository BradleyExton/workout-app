export const loginCopy = {
  kicker: "Workout",
  heading: "Log in",
  subheading: "Sign in with your Google account to continue.",
  submit: "Sign in with Google",
  submitting: "Redirecting…",
} as const;

// Every way sign-in can fail, keyed by the code the app uses internally.
// `auth` and `denied` are the codes /auth/callback redirects back with;
// `start` and `timeout` are raised on this screen. Nothing here is ever
// built from the query string — an unrecognised ?error= value falls back
// to `unknown` rather than being rendered.
//
// Each message says what happened and what to do about it. "Something
// went wrong" tells a user nothing they can act on.
export const loginErrors = {
  auth: "Google sent you back, but the session didn't stick. Tap sign in to try again.",
  denied:
    "Sign-in was cancelled. Tap sign in and pick a Google account to continue.",
  start:
    "Couldn't reach Google to start sign-in. Check your connection, then try again.",
  timeout:
    "Google never opened. Allow pop-ups and redirects for this site, then tap sign in again.",
  unknown: "Sign-in didn't go through. Tap sign in to try again.",
} as const;

export type LoginErrorCode = keyof typeof loginErrors;
