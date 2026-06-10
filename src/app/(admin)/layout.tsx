import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("super_admin");
  return (
    <AppShell
      role="super_admin"
      name={session.profile.full_name ?? "Admin"}
      email={session.email}
      workspaceName="Platform Admin"
    >
      {children}
    </AppShell>
  );
}
