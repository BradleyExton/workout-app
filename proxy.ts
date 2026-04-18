import type { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export const proxy = (request: NextRequest): Promise<NextResponse> =>
  updateSession(request);

// Exclude PWA shell assets (sw.js, manifest, icons dir) so service-worker
// fetches and the manifest poll don't pay the session-refresh round trip
// on every page load — they're public, not auth-scoped.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
