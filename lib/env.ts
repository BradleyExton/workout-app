// Dynamic `process.env[key]` lookups aren't inlined into the client
// bundle — Turbopack/webpack only replace static `process.env.FOO`
// references. So every NEXT_PUBLIC_* var must be read statically.
const validate = (key: string, value: string | undefined, min: number): string => {
  if (!value) throw new Error(`env: ${key} is not set`);
  if (value.length < min) {
    throw new Error(
      `env: ${key} looks truncated (got ${value.length} chars, expected >= ${min})`,
    );
  }
  return value;
};

export const SUPABASE_URL = validate(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  20,
);
export const SUPABASE_ANON_KEY = validate(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  40,
);

// Server-only. Access throws if called from a client bundle (the key isn't
// shipped there) or if the env var is missing.
export const serverEnv = {
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return validate(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      80,
    );
  },
  allowTestLogin: (): boolean => {
    if (process.env.NODE_ENV === "production") return false;
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production" || vercelEnv === "preview") return false;
    return process.env.ALLOW_TEST_LOGIN === "true";
  },
};
