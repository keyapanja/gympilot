"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import {
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  TRAINING_DAYS_OPTIONS,
} from "@/lib/constants";
import { completeOnboardingAction } from "@/app/(member)/actions";

interface State {
  goal: string;
  experience: string;
  gender: string;
  age: string;
  heightCm: string;
  weightKg: string;
  trainingDays: string;
}

const STEPS = ["Goal", "Experience", "Your body", "Generate"] as const;

export function OnboardingWizard({ initial }: { initial?: Partial<State> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [s, setS] = useState<State>({
    goal: initial?.goal ?? "general_fitness",
    experience: initial?.experience ?? "beginner",
    gender: initial?.gender ?? "other",
    age: initial?.age ?? "",
    heightCm: initial?.heightCm ?? "",
    weightKg: initial?.weightKg ?? "",
    trainingDays: initial?.trainingDays ?? "3",
  });

  function set<K extends keyof State>(key: K, value: State[K]) {
    setS((p) => ({ ...p, [key]: value }));
  }

  const canNext = () => {
    if (step === 2) return s.age && s.heightCm && s.weightKg;
    return true;
  };

  function finish() {
    startTransition(async () => {
      const res = await completeOnboardingAction({
        goal: s.goal,
        experience: s.experience,
        gender: s.gender,
        age: Number(s.age),
        heightCm: Number(s.heightCm),
        weightKg: Number(s.weightKg),
        trainingDays: Number(s.trainingDays),
      });
      if (res.ok) {
        toast.success("Your plan is ready!");
        router.push(res.data.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                i < step && "border-primary bg-primary text-primary-foreground",
                i === step && "border-primary text-primary",
                i > step && "text-muted-foreground",
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1", i < step ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <Step title="What's your primary goal?" subtitle="We'll match a plan built for it.">
              <OptionGrid value={s.goal} onChange={(v) => set("goal", v)} options={GOAL_OPTIONS} />
            </Step>
          )}

          {step === 1 && (
            <Step title="How experienced are you?" subtitle="This sets your training intensity.">
              <OptionGrid value={s.experience} onChange={(v) => set("experience", v)} options={EXPERIENCE_OPTIONS} />
              <div className="mt-6 space-y-2">
                <Label>Training days per week</Label>
                <OptionGrid
                  value={s.trainingDays}
                  onChange={(v) => set("trainingDays", v)}
                  options={TRAINING_DAYS_OPTIONS.map((o) => ({ value: String(o.value), label: `${o.value} days` }))}
                  cols={5}
                />
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="Tell us about your body" subtitle="Used for BMI and plan calibration.">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <OptionGrid value={s.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} cols={3} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Age">
                    <Input type="number" value={s.age} onChange={(e) => set("age", e.target.value)} min={10} max={100} />
                  </Field>
                  <Field label="Height (cm)">
                    <Input type="number" value={s.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
                  </Field>
                  <Field label="Weight (kg)">
                    <Input type="number" value={s.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
                  </Field>
                </div>
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Generate your plan" subtitle="Review and we'll build your personalized workout.">
              <ul className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
                <Review label="Goal" value={GOAL_OPTIONS.find((o) => o.value === s.goal)?.label} />
                <Review label="Experience" value={EXPERIENCE_OPTIONS.find((o) => o.value === s.experience)?.label} />
                <Review label="Training days" value={`${s.trainingDays} / week`} />
                <Review label="Body" value={`${s.age} yrs · ${s.heightCm} cm · ${s.weightKg} kg`} />
              </ul>
            </Step>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0 || pending}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((x) => x + 1)} disabled={!canNext()}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate my plan
          </Button>
        )}
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function OptionGrid({
  value,
  onChange,
  options,
  cols = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  cols?: number;
}) {
  return (
    <div className={cn("grid gap-2", cols === 2 && "sm:grid-cols-2", cols === 3 && "grid-cols-3", cols === 5 && "grid-cols-5")}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
            value === o.value ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Review({ label, value }: { label: string; value?: string }) {
  return (
    <li className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </li>
  );
}
