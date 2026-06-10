"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button bound to the parent <form>'s pending state via useFormStatus.
 * Shows a spinner and disables itself while the server action runs.
 */
export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? (pendingText ?? "Please wait…") : children}
    </Button>
  );
}
