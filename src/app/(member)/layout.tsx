import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMember();
  const supabase = await createClient();

  // Resolve the member's gym name for the header.
  const { data: raw } = await supabase
    .from("members")
    .select("gyms(name)")
    .eq("id", session.memberId)
    .maybeSingle();
  const data = raw as unknown as { gyms: { name: string } | { name: string }[] | null } | null;
  const gym = data?.gyms ?? null;
  const gymName = (Array.isArray(gym) ? gym[0]?.name : gym?.name) ?? "GymPilot";

  return (
    <AppShell role="member" name={session.profile.full_name ?? "Member"} email={session.email} workspaceName={gymName}>
      {children}
    </AppShell>
  );
}
