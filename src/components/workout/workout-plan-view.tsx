"use client";

import { useState, useTransition } from "react";
import { Bed, Check, Clock, Dumbbell } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import type { PlanView } from "@/lib/services/workouts";
import type { ActionResult } from "@/lib/utils/result";

/**
 * Interactive plan view for members. Day accordions; exercises can be checked
 * off, persisting via a server action. Read-only when `readOnly` (owner view).
 */
export function WorkoutPlanView({
  plan,
  toggleAction,
  readOnly = false,
}: {
  plan: PlanView;
  toggleAction?: (exerciseId: string, done: boolean) => Promise<ActionResult>;
  readOnly?: boolean;
}) {
  const firstActive = plan.days.find((d) => !d.isRest)?.id;
  return (
    <Accordion type="multiple" defaultValue={firstActive ? [firstActive] : []} className="rounded-2xl border bg-card">
      {plan.days.map((day) => (
        <AccordionItem key={day.id} value={day.id} className="px-4 last:border-b-0">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              {day.isRest ? (
                <Bed className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Dumbbell className="h-4 w-4 text-primary" />
              )}
              <span>{day.title}</span>
              {day.isRest ? (
                <Badge variant="muted">Rest</Badge>
              ) : (
                <Badge variant="secondary">{day.exercises.length} exercises</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {day.isRest ? (
              <p className="px-2 pb-2 text-sm text-muted-foreground">Recovery day — rest and hydrate.</p>
            ) : (
              <ul className="divide-y">
                {day.exercises.map((ex) => (
                  <ExerciseRow key={ex.id} exercise={ex} toggleAction={toggleAction} readOnly={readOnly} />
                ))}
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function ExerciseRow({
  exercise,
  toggleAction,
  readOnly,
}: {
  exercise: PlanView["days"][number]["exercises"][number];
  toggleAction?: (exerciseId: string, done: boolean) => Promise<ActionResult>;
  readOnly: boolean;
}) {
  const [done, setDone] = useState(exercise.completedCount > 0);
  const [, startTransition] = useTransition();

  function toggle(next: boolean) {
    setDone(next);
    if (!toggleAction) return;
    startTransition(async () => {
      const res = await toggleAction(exercise.id, next);
      if (!res.ok) {
        setDone(!next);
        toast.error(res.error.message);
      }
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      {!readOnly && (
        <Checkbox checked={done} onCheckedChange={(c) => toggle(Boolean(c))} aria-label={`Mark ${exercise.name} done`} />
      )}
      {readOnly && (
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border",
            done ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{exercise.name}</p>
        {exercise.notes && <p className="text-xs text-muted-foreground">{exercise.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {exercise.sets} × {exercise.reps}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Clock className="h-3.5 w-3.5" />
          {exercise.restSeconds}s
        </span>
      </div>
    </li>
  );
}
