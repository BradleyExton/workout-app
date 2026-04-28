import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export const createClient = (): SupabaseClient<Database> =>
  createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
