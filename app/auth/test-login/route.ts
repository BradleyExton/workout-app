// DEV ONLY. Mints a session without the magic-link email round-trip.
//
// Gated by `serverEnv.allowTestLogin()`, which requires:
//   - NODE_ENV !== "production"
//   - VERCEL_ENV !== "production" && VERCEL_ENV !== "preview"
//   - ALLOW_TEST_LOGIN === "true"
//
// Uses the service role key (bypasses RLS). Never enable in production:
// doing so makes every account trivially takeoverable by email address alone.

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, serverEnv } from "@/lib/env";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!serverEnv.allowTestLogin()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) {
    return new NextResponse("email query param required", { status: 400 });
  }

  console.warn(`[test-login] minting session for ${email}`);

  const admin = createAdminClient(SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !data.properties?.hashed_token) {
    return new NextResponse(
      `generateLink failed: ${linkError?.message ?? "no token"}`,
      { status: 400 },
    );
  }

  const next = searchParams.get("next") ?? "/";
  const response = NextResponse.redirect(`${origin}${next}`);

  // Write cookies directly onto the redirect response so they survive the
  // 307 — doing this via next/headers cookies() loses them on route handler
  // redirects in Next 16.
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) {
    return new NextResponse(`verifyOtp failed: ${verifyError.message}`, {
      status: 400,
    });
  }

  return response;
};
