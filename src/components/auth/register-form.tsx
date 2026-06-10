"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerOwner } from "@/app/(public)/actions";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName")),
      gymName: String(fd.get("gymName")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      confirmPassword: String(fd.get("confirmPassword")),
    };
    if (payload.password !== payload.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    startTransition(async () => {
      const res = await registerOwner(payload);
      if (res.ok) {
        toast.success("Welcome to GymPilot!");
        router.push(res.data.redirectTo);
        router.refresh();
      } else {
        toast.error(res.error.message);
        setErrors({ form: res.error.message });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Your name</Label>
          <Input id="fullName" name="fullName" required placeholder="Jane Doe" autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gymName">Gym name</Label>
          <Input id="gymName" name="gymName" required placeholder="Iron Works Gym" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@gym.com" autoComplete="email" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
        </div>
      </div>
      {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Starts on the Starter plan (up to 10 members). No credit card required.
      </p>
    </form>
  );
}
