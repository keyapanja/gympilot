"use client";

import Link from "next/link";
import { useState } from "react";
import { Dumbbell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { label: "Features", href: ROUTES.features },
  { label: "Pricing", href: ROUTES.pricing },
  { label: "Contact", href: ROUTES.contact },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-4 w-4" />
          </span>
          GymPilot
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" asChild>
            <Link href={ROUTES.login}>Login</Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.register}>Start free</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn("border-t md:hidden", open ? "block" : "hidden")}>
        <div className="container flex flex-col gap-1 py-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2">
            <Button variant="outline" asChild className="flex-1">
              <Link href={ROUTES.login}>Login</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href={ROUTES.register}>Start free</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
