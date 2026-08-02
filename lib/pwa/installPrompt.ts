"use client";

// The install offer, held in module scope so more than one screen can make it.
//
// `beforeinstallprompt` fires once per page load, on whatever route happens to
// be mounted when the browser decides the app is installable — in practice
// home. Stashing the event in a component's state means it dies at the next
// client-side navigation, so the Profile re-entry point would have nothing
// left to fire. Module scope survives navigation; the window listeners are
// registered once, on first read.
//
// Three states matter to callers:
//   - installed: running standalone (or `appinstalled` just fired) — there is
//     nothing left to offer.
//   - available: a saved native prompt is ready to fire.
//   - neither: no programmatic install (iOS Safari always, Chrome once the
//     event has been consumed or never fired) — the only honest answer is
//     manual instructions, which differ by platform.

import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatform = "ios" | "other";

export type InstallOffer = {
  installed: boolean;
  available: boolean;
  platform: InstallPlatform;
};

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

const SERVER_OFFER: InstallOffer = {
  installed: false,
  available: false,
  platform: "other",
};

let deferred: BeforeInstallPromptEvent | null = null;
let offer: InstallOffer = SERVER_OFFER;
let wired = false;
const listeners = new Set<() => void>();

const isStandaloneDisplay = (): boolean => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
};

// iOS has no programmatic install on any browser — every engine there is
// WebKit — so the share-sheet instruction is the answer for all of them.
const isIos = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
};

const publish = (next: InstallOffer): void => {
  if (
    next.installed === offer.installed &&
    next.available === offer.available &&
    next.platform === offer.platform
  ) {
    return;
  }
  offer = next;
  for (const listener of listeners) listener();
};

const wire = (): void => {
  if (wired || typeof window === "undefined") return;
  wired = true;
  // Assigned rather than published: this is the first read, nobody is
  // subscribed yet, and notifying during a render would be a React error.
  offer = {
    installed: isStandaloneDisplay(),
    available: false,
    platform: isIos() ? "ios" : "other",
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    // Suppress the browser's own mini-infobar; the app decides where the
    // offer appears, and it has to still be there on the Profile screen.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    publish({ ...offer, available: true });
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    publish({ ...offer, installed: true, available: false });
  });
};

const subscribe = (onChange: () => void): (() => void) => {
  wire();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const getSnapshot = (): InstallOffer => {
  wire();
  return offer;
};

const getServerSnapshot = (): InstallOffer => SERVER_OFFER;

export const useInstallOffer = (): InstallOffer =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

// Fires the saved native prompt. The event is single-use: whatever the user
// chooses, it can't be fired again, so it's dropped either way and callers
// fall back to instructions from then on.
export const promptInstall = async (): Promise<InstallOutcome> => {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  publish({ ...offer, available: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
};
