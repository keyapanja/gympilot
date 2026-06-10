import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("owner");

  let workspaceName = "Your Gym";
  if (session.gymId) {
    const supabase = await createClient();
    const { data } = await supabase.from("gyms").select("name").eq("id", session.gymId).maybeSingle();
    if (data?.name) workspaceName = data.name;
  }

  return (
    <AppShell
      role="owner"
      name={session.profile.full_name ?? "Owner"}
      email={session.email}
      workspaceName={workspaceName}
    >
      {children}
    </AppShell>
  );
}
