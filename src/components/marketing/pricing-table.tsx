import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

export interface PricingPlan {
  key: string;
  name: string;
  priceLabel: string;
  period?: string;
  memberLabel: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    priceLabel: "$29",
    period: "/mo",
    memberLabel: "Up to 10 members",
    features: ["Workout plan engine", "Progress tracking", "BMI insights", "Email invites"],
    cta: "Start free",
  },
  {
    key: "growth",
    name: "Growth",
    priceLabel: "$59",
    period: "/mo",
    memberLabel: "Up to 30 members",
    features: ["Everything in Starter", "Owner analytics", "Member dashboards", "Priority email support"],
    highlighted: true,
    cta: "Start free",
  },
  {
    key: "pro",
    name: "Pro",
    priceLabel: "$99",
    period: "/mo",
    memberLabel: "Up to 50 members",
    features: ["Everything in Growth", "Advanced progress charts", "Bulk member management"],
    cta: "Start free",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    memberLabel: "Custom member limits",
    features: ["Everything in Pro", "Custom limits", "Dedicated onboarding", "SLA"],
    cta: "Contact sales",
  },
];

export function PricingTable() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {PRICING_PLANS.map((plan) => (
        <Card
          key={plan.key}
          className={cn(
            "flex flex-col",
            plan.highlighted && "border-primary shadow-lg ring-1 ring-primary",
          )}
        >
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.highlighted && <Badge>Most popular</Badge>}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{plan.priceLabel}</span>
              {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
            </div>
            <p className="text-sm text-muted-foreground">{plan.memberLabel}</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6">
            <ul className="space-y-2 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant={plan.highlighted ? "default" : "outline"} className="w-full">
              <Link href={plan.key === "enterprise" ? ROUTES.contact : ROUTES.register}>{plan.cta}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
