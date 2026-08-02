// Every dead-end screen in the app speaks from here. The PWA has no
// address bar, so each variant must (a) say what happened in plain
// words, (b) promise the user's logged work is safe, and (c) hand them a
// way out.
export const recoveryCopy = {
  retryLabel: "Try again",
  homeLabel: "Back to home",
  referencePrefix: "Ref",
} as const;

export const recoveryVariants = {
  error: {
    kicker: "Something broke",
    title: "THAT\nDIDN'T LOAD",
    body: "Your logged sets are safe on this device and will sync once the app recovers.",
  },
  globalError: {
    kicker: "Something broke",
    title: "THE APP\nCRASHED",
    body: "Your logged sets are safe on this device and will sync once the app recovers.",
  },
  notFound: {
    kicker: "Dead end",
    title: "NOTHING\nHERE",
    body: "That page doesn't exist. It may have been finished, discarded, or moved.",
  },
  offline: {
    kicker: "No signal",
    title: "YOU'RE\nOFFLINE",
    body: "Your in-flight work is saved locally and will sync as soon as you reconnect.",
  },
} as const;
