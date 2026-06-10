import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkMemberToProfile } from "@/lib/services/invites";
import { ROUTES } from "@/lib/constants";

/**
 * Auth redirect target for email links (invite / recovery / confirmation).
 * Exchanges the code for a session, links invited members to their gym row,
 * then forwards to `next` (defaults to set-password).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        // Best-effort link of invited member → profile; ignore failures.
        try {
          await linkMemberToProfile(user.id, user.email);
        } catch {
          /* noop */
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${ROUTES.login}?error=auth`);
}
