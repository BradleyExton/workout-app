// Client-generated UUIDs. Our Postgres schema treats `id uuid primary key
// default gen_random_uuid()` — the default only fires when the client
// doesn't supply an id, so sending a client-generated UUID on insert is
// accepted as-is. That lets us reference a row locally (in Dexie, in the
// UI) before the Supabase round-trip completes.

export const newId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / jsdom in tests. Not cryptographically
  // strong but adequate for a local-only id that will be validated by
  // Postgres on sync.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
