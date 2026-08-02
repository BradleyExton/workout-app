export const installAppRowCopy = {
  kicker: "Install the app",
  body: "Full screen, one tap in, and the log keeps working when the gym wifi doesn't.",
  action: "ADD TO HOME SCREEN",
  stepsHeading: "Two taps",
  // iOS has no programmatic install — the share sheet is the only route.
  stepsIos:
    "Tap the Share button in the browser toolbar, scroll down, then choose “Add to Home Screen”.",
  // Chrome/Edge/Android when the saved prompt is gone or never arrived.
  stepsOther:
    "Open your browser’s menu, then choose “Install app” or “Add to Home screen”. If you can’t see it, the app may already be installed.",
} as const;
