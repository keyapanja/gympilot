"use client";

import { useState, type ReactNode } from "react";
import { Dumbbell } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";
import type { UserRole } from "@/types/db.types";

export function MobileNav({
  role,
  workspaceName,
  trigger,
}: {
  role: UserRole;
  workspaceName: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="flex h-16 items-center justify-start border-b px-6">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            GymPilot
          </SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <SidebarNav role={role} onNavigate={() => setOpen(false)} />
        </div>
        <div className="absolute bottom-0 w-full border-t p-4 text-xs text-muted-foreground">
          {workspaceName}
        </div>
      </SheetContent>
    </Sheet>
  );
}
