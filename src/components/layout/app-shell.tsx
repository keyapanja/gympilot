import Link from "next/link";
import { Dumbbell, Menu } from "lucide-react";
import type { ReactNode } from "react";
import type { UserRole } from "@/types/db.types";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { roleHome } from "@/lib/auth/session";

interface AppShellProps {
  role: UserRole;
  name: string;
  email: string;
  workspaceName: string;
  children: ReactNode;
}

/** Authenticated app frame: fixed sidebar (desktop) + topbar + mobile sheet nav. */
export function AppShell({ role, name, email, workspaceName, children }: AppShellProps) {
  const home = roleHome(role);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Link href={home} className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            GymPilot
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SidebarNav role={role} />
        </div>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <p className="truncate font-medium text-foreground">{workspaceName}</p>
          <p className="capitalize">{role.replace("_", " ")}</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <MobileNav role={role} workspaceName={workspaceName} trigger={
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            } />
            <span className="truncate text-sm font-medium text-muted-foreground sm:text-base">{workspaceName}</span>
          </div>
          <UserMenu name={name} email={email} />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
