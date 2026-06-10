"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  TRAINING_DAYS_OPTIONS,
  WEEKDAYS,
} from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/lib/utils/result";

export interface MemberFormValues {
  fullName: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  goal: string;
  experience: string;
  trainingDays: string;
  preferredDays: string[];
  medicalNotes: string;
  injuries: string;
  generatePlan: boolean;
}

const EMPTY: MemberFormValues = {
  fullName: "",
  email: "",
  phone: "",
  age: "",
  gender: "other",
  heightCm: "",
  weightKg: "",
  goal: "general_fitness",
  experience: "beginner",
  trainingDays: "3",
  preferredDays: [],
  medicalNotes: "",
  injuries: "",
  generatePlan: true,
};

export function MemberForm({
  action,
  initial,
  submitLabel,
  mode,
}: {
  action: (values: MemberFormValues) => Promise<ActionResult<{ memberId: string }>>;
  initial?: Partial<MemberFormValues>;
  submitLabel: string;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [values, setValues] = useState<MemberFormValues>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function set<K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleDay(day: string) {
    setValues((v) => ({
      ...v,
      preferredDays: v.preferredDays.includes(day)
        ? v.preferredDays.filter((d) => d !== day)
        : [...v.preferredDays, day],
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (values.fullName.trim().length < 2) e.fullName = "Enter the member's name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        toast.success(mode === "create" ? "Member added" : "Member updated");
        router.push(`/owner/members/${result.data.memberId}`);
        router.refresh();
      } else {
        toast.error(result.error.message);
        if (result.error.code === "DUPLICATE_MEMBER") {
          setErrors((p) => ({ ...p, email: result.error.message }));
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.fullName} required>
            <Input value={values.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Jane Doe" />
          </Field>
          <Field label="Email" error={errors.email} required>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jane@example.com"
              disabled={mode === "edit"}
            />
          </Field>
          <Field label="Phone">
            <Input value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 1234" />
          </Field>
          <Field label="Age">
            <Input type="number" value={values.age} onChange={(e) => set("age", e.target.value)} min={10} max={100} />
          </Field>
          <Field label="Gender">
            <SelectField value={values.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Height (cm)">
              <Input type="number" step="0.1" value={values.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" step="0.1" value={values.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Fitness goal">
            <SelectField value={values.goal} onChange={(v) => set("goal", v)} options={GOAL_OPTIONS} />
          </Field>
          <Field label="Experience level">
            <SelectField value={values.experience} onChange={(v) => set("experience", v)} options={EXPERIENCE_OPTIONS} />
          </Field>
          <Field label="Training days / week">
            <SelectField
              value={values.trainingDays}
              onChange={(v) => set("trainingDays", v)}
              options={TRAINING_DAYS_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </Field>
          <div className="sm:col-span-3">
            <Label className="mb-2 block">Preferred training days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    values.preferredDays.includes(day)
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health notes (optional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Medical notes">
            <Textarea value={values.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} rows={3} />
          </Field>
          <Field label="Injuries">
            <Textarea value={values.injuries} onChange={(e) => set("injuries", e.target.value)} rows={3} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={values.generatePlan} onCheckedChange={(c) => set("generatePlan", c)} />
          {mode === "create" ? "Generate initial workout plan" : "Regenerate workout plan from these settings"}
        </label>
        <Button type="submit" disabled={pending} size="lg">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
