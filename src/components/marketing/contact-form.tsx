"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitContact } from "@/app/(public)/actions";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitContact({
        name: String(fd.get("name")),
        email: String(fd.get("email")),
        message: String(fd.get("message")),
      });
      if (res.ok) {
        setSent(true);
        toast.success("Thanks — we'll be in touch!");
      } else {
        toast.error(res.error.message);
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for reaching out. Our team will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@gym.com" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required rows={5} placeholder="Tell us about your gym…" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Send message
      </Button>
    </form>
  );
}
