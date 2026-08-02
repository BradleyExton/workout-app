// Where the tab bar renders — the single fact both the bar and every fixed
// CTA zone are built on.
//
// It used to be two hardcoded lists: this one, and a `bottom-[3.5rem]`
// clearance baked into three separate styles.ts files. /workout and /cardio
// hide the bar but kept reserving space for it, leaving a dead band under
// the primary CTA. One predicate, two consumers (TabBar and
// components/ui/CtaZone) means they can't drift again.

export const TAB_BAR_HIDDEN_PREFIXES = ["/workout", "/cardio"] as const;

export const isTabBarVisible = (pathname: string): boolean =>
  !TAB_BAR_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
