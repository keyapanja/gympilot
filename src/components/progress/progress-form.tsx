"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/utils/result";
import type { ProgressInput } from "@/lib/validations";

function today(): string {
  // Local date as yyyy-mm-dd (no Date.now needed in render scope here)
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function ProgressForm({ action }: { action: (input: ProgressInput) => Promise<ActionResult> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    recordedOn: today(),
    weightKg: "",
    waistCm: "",
    chestCm: "",
    armsCm: "",
    hipsCm: "",
    note: "",
  });

  function num(v: string): number | undefined {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await action({
        recordedOn: form.recordedOn,
        weightKg: num(form.weightKg),
        waistCm: num(form.waistCm),
        chestCm: num(form.chestCm),
        armsCm: num(form.armsCm),
        hipsCm: num(form.hipsCm),
        note: form.note,
      });
      if (res.ok) {
        toast.success("Progress saved");
        setOpen(false);
        setForm((f) => ({ ...f, weightKg: "", waistCm: "", chestCm: "", armsCm: "", hipsCm: "", note: "" }));
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Log entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log progress</DialogTitle>
          <DialogDescription>Record today&apos;s weight and measurements. One entry per day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.recordedOn}
              max={today()}
              onChange={(e) => setForm((f) => ({ ...f, recordedOn: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Weight (kg)" value={form.weightKg} onChange={(v) => setForm((f) => ({ ...f, weightKg: v }))} />
            <NumField label="Waist (cm)" value={form.waistCm} onChange={(v) => setForm((f) => ({ ...f, waistCm: v }))} />
            <NumField label="Chest (cm)" value={form.chestCm} onChange={(v) => setForm((f) => ({ ...f, chestCm: v }))} />
            <NumField label="Arms (cm)" value={form.armsCm} onChange={(v) => setForm((f) => ({ ...f, armsCm: v }))} />
            <NumField label="Hips (cm)" value={form.hipsCm} onChange={(v) => setForm((f) => ({ ...f, hipsCm: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={280} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" step="0.1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
