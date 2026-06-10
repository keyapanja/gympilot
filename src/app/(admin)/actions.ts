"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { updateSubscription } from "@/lib/services/admin";
import { updateSubscriptionSchema } from "@/lib/validations";
import { ok, fail, fromError, type ActionResult } from "@/lib/utils/result";
import { ROUTES } from "@/lib/constants";

export async function updateSubscriptionAction(raw: unknown): Promise<ActionResult> {
  await requireRole("super_admin");
  const parsed = updateSubscriptionSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  try {
    await updateSubscription(supabase, {
      gymId: parsed.data.gymId,
      planKey: parsed.data.planKey,
      status: parsed.data.status,
    });
    revalidatePath(ROUTES.admin.subscriptions);
    revalidatePath(ROUTES.admin.gyms);
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}
