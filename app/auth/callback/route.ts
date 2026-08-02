import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Back to /login with a code it knows how to talk about. Backing out of
  // Google's consent screen arrives here as error=access_denied — a choice,
  // not a fault, and the login screen shouldn't accuse the user of breaking
  // something. Everything else is a genuine failure to finish sign-in.
  const reason =
    searchParams.get("error") === "access_denied" ? "denied" : "auth";

  return NextResponse.redirect(`${origin}/login?error=${reason}`);
};
