"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { login } from "@/app/(public)/actions";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = { email: String(fd.get("email")), password: String(fd.get("password")) };

    startTransition(async () => {
      const res = await login(payload);
      if (res.ok) {
        const next = params.get("next");
        router.push(next || res.data.redirectTo);
        router.refresh();
      } else {
        setError(res.error.message);
        toast.error(res.error.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {params.get("confirm") && (
        <p className="rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          Check your email to confirm your account, then sign in.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@gym.com" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href={ROUTES.login + "/forgot"} className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
