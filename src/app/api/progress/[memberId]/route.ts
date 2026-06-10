import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listProgress } from "@/lib/services/progress";

/**
 * GET /api/progress/:memberId — progress series for charts.
 * RLS guarantees the caller can only read members they're entitled to
 * (own record, own gym, or super admin); we surface 403 on empty/denied.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  }

  const { memberId } = await params;
  const supabase = await createClient();
  try {
    const data = await listProgress(supabase, memberId);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 });
  }
}
