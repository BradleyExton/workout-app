// DEV ONLY. Mints a session without the magic-link email round-trip.
//
// Two guards required:
//   - NODE_ENV !== "production"
//   - ALLOW_TEST_LOGIN === "true"  (explicit opt-in, must be set in .env.local)
//
// Uses the service role key (bypasses RLS). Never enable in production:
// doing so makes every account trivially takeoverable by email address alone.

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";

const isAllowed = (): boolean =>
  process.env.NODE_ENV !== "production" &&
  process.env.ALLOW_TEST_LOGIN === "true";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  if (!isAllowed()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return new NextResponse(
      "SUPABASE_SERVICE_ROLE_KEY not configured in .env.local",
      { status: 500 },
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) {
    return new NextResponse("email query param required", { status: 400 });
  }

  console.warn(`[test-login] minting session for ${email}`);

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

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

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
