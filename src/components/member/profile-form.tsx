"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPERIENCE_OPTIONS, GENDER_OPTIONS, GOAL_OPTIONS, TRAINING_DAYS_OPTIONS } from "@/lib/constants";
import { saveProfileAction } from "@/app/(member)/actions";

export interface ProfileValues {
  goal: string;
  experience: string;
  gender: string;
  age: string;
  heightCm: string;
  weightKg: string;
  trainingDays: string;
  medicalNotes: string;
  injuries: string;
}

export function MemberProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [v, setV] = useState<ProfileValues>(initial);
  const [regenerate, setRegenerate] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setV((p) => ({ ...p, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveProfileAction(
        {
          goal: v.goal,
          experience: v.experience,
          gender: v.gender,
          age: v.age || undefined,
          heightCm: v.heightCm || undefined,
          weightKg: v.weightKg || undefined,
          trainingDays: v.trainingDays,
          medicalNotes: v.medicalNotes,
          injuries: v.injuries,
        },
        regenerate,
      );
      if (res.ok) {
        toast.success(regenerate ? "Profile saved & plan regenerated" : "Profile saved");
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Goal" value={v.goal} onChange={(x) => set("goal", x)} options={GOAL_OPTIONS} />
          <SelectField label="Experience" value={v.experience} onChange={(x) => set("experience", x)} options={EXPERIENCE_OPTIONS} />
          <SelectField
            label="Training days"
            value={v.trainingDays}
            onChange={(x) => set("trainingDays", x)}
            options={TRAINING_DAYS_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Body</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <SelectField label="Gender" value={v.gender} onChange={(x) => set("gender", x)} options={GENDER_OPTIONS} />
          <Field label="Age">
            <Input type="number" value={v.age} onChange={(e) => set("age", e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <Input type="number" value={v.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" value={v.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Medical notes">
            <Textarea value={v.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} rows={3} />
          </Field>
          <Field label="Injuries">
            <Textarea value={v.injuries} onChange={(e) => set("injuries", e.target.value)} rows={3} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={regenerate} onCheckedChange={setRegenerate} />
          Regenerate my workout plan from these settings
        </label>
        <Button type="submit" disabled={pending} size="lg">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </div>
    </form>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
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
    </div>
  );
}
