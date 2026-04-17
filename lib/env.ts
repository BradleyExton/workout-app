const required = (key: string, min: number): string => {
  const value = process.env[key];
  if (!value) throw new Error(`env: ${key} is not set`);
  if (value.length < min) {
    throw new Error(
      `env: ${key} looks truncated (got ${value.length} chars, expected >= ${min})`,
    );
  }
  return value;
};

// Validated at module load. Throws with a clear message if missing/malformed.
export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL", 20);
export const SUPABASE_ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY", 40);

// Server-only. Access throws if called from a client bundle (the key isn't
// shipped there) or if the env var is missing.
export const serverEnv = {
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY", 80);
  },
  allowTestLogin: (): boolean => {
    if (process.env.NODE_ENV === "production") return false;
    const vercelEnv = process.env.VERCEL_ENV;
    if (vercelEnv === "production" || vercelEnv === "preview") return false;
    return process.env.ALLOW_TEST_LOGIN === "true";
  },
};
