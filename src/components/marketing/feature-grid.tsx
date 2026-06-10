import { Activity, BarChart3, Dumbbell, HeartPulse, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Users,
    title: "Member management",
    body: "Add members, capture fitness profiles, and manage your roster from one workspace.",
  },
  {
    icon: Dumbbell,
    title: "Rule-based workout engine",
    body: "Plans are assigned automatically from goal, experience, gender and training days — no AI guesswork.",
  },
  {
    icon: BarChart3,
    title: "Progress tracking",
    body: "Members log weight and body measurements; charts make progress visible and motivating.",
  },
  {
    icon: HeartPulse,
    title: "BMI insights",
    body: "Automatic BMI scoring as a supporting metric, while fitness goals stay the focus.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & isolated",
    body: "Multi-tenant architecture with row-level security keeps every gym's data private.",
  },
  {
    icon: Activity,
    title: "Owner analytics",
    body: "See active members, signups, and progress activity at a glance on your dashboard.",
  },
] as const;

export function FeatureGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f) => (
        <Card key={f.title}>
          <CardContent className="space-y-3 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
