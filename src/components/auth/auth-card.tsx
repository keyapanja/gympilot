import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <Link href={ROUTES.home} className="flex items-center justify-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" />
          </span>
          GymPilot
        </Link>
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
          </CardContent>
        </Card>
        {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
