import { Activity, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GOAL_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import type { BmiCategory } from "@/lib/utils/bmi";
import type { FitnessGoal } from "@/types/db.types";

export function GoalCard({ goal }: { goal: FitnessGoal }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4" /> Current goal
        </div>
        <p className="text-xl font-bold">{GOAL_LABELS[goal]}</p>
      </CardContent>
    </Card>
  );
}

const BMI_TONE: Record<BmiCategory, "warning" | "success" | "danger"> = {
  Underweight: "warning",
  Normal: "success",
  Overweight: "warning",
  Obese: "danger",
};

export function BmiCard({ bmi, category }: { bmi: number | null; category: BmiCategory | null }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" /> BMI overview
        </div>
        {bmi != null && category ? (
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold">{bmi}</p>
            <Badge variant={BMI_TONE[category]}>{category}</Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add height &amp; weight to see BMI</p>
        )}
        <p className="text-xs text-muted-foreground">Supporting metric — your goal comes first.</p>
      </CardContent>
    </Card>
  );
}

export function CompletionCard({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" /> Workout completion
        </div>
        <p className="text-xl font-bold">
          {completed}/{total}
          <span className="ml-2 text-sm font-normal text-muted-foreground">exercises</span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full bg-primary transition-all")} style={{ width: `${pct}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
