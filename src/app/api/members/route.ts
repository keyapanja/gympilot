import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listMembers } from "@/lib/services/members";

/** GET /api/members — owner's members (RLS-scoped). Supports ?q= and ?status=. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }
  if (session.role !== "owner" || !session.gymId) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Owner access required" } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const supabase = await createClient();
  const members = await listMembers(supabase, session.gymId, {
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ data: members });
}
