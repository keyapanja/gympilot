import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkMemberToProfile } from "@/lib/services/invites";
import { ROUTES } from "@/lib/constants";

/**
 * Verifies a Supabase email OTP (invite / recovery / magiclink) entirely
 * server-side via `verifyOtp({ token_hash, type })`. This is the SSR-correct
 * flow: the session is written to cookies here, so subsequent server renders
 * see an authenticated user. (The older `?code=` PKCE flow is handled by
 * /auth/callback; the hash/implicit flow can't be read on the server.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        // Best-effort: link an invited member to their gym row + mark active.
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
