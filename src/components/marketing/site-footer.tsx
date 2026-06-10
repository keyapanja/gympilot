import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { ROUTES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link href={ROUTES.home} className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            GymPilot
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Personalized workout guidance for every gym member.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Link href={ROUTES.features} className="text-muted-foreground hover:text-foreground">Features</Link>
          <Link href={ROUTES.pricing} className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href={ROUTES.contact} className="text-muted-foreground hover:text-foreground">Contact</Link>
          <Link href={ROUTES.login} className="text-muted-foreground hover:text-foreground">Login</Link>
        </div>
      </div>
      <div className="border-t py-4">
        <div className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} GymPilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
