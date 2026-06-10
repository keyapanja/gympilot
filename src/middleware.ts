import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Refreshes the auth session on every request and gates the role-scoped route
 * groups. Fine-grained data access is still enforced by Postgres RLS; this is
 * the first, coarse line of defense for navigation.
 */
const ROLE_PREFIXES: { prefix: string; role: string }[] = [
  { prefix: "/owner", role: "owner" },
  { prefix: "/member", role: "member" },
  { prefix: "/admin", role: "super_admin" },
];

const ROLE_HOME: Record<string, string> = {
  owner: "/owner/dashboard",
  member: "/member/dashboard",
  super_admin: "/admin/dashboard",
};

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const guarded = ROLE_PREFIXES.find((r) => pathname.startsWith(r.prefix));
  if (!guarded) return response;

  // Not signed in → login (preserving intended destination).
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in → check role matches the area.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role;
  if (role && role !== guarded.role) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image optimization files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
