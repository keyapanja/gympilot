import "server-only";
import type { DB } from "./types";
import { slugify } from "@/lib/utils/format";
import type { GymSettingsInput } from "@/lib/validations";

/**
 * Create a gym workspace for a freshly-registered owner, plus a Starter
 * subscription. Uses the admin client so it works during sign-up before the
 * owner's session cookie round-trips. Idempotent on owner_id.
 */
export async function createGymForOwner(
  admin: DB,
  params: { ownerId: string; gymName: string; contactEmail: string },
) {
  // Already has a gym? Return it.
  const { data: existing } = await admin.from("gyms").select("id").eq("owner_id", params.ownerId).maybeSingle();
  if (existing) return { gymId: existing.id };

  // Unique slug (name + short random suffix).
  const base = slugify(params.gymName) || "gym";
  const suffix = params.ownerId.slice(0, 6);
  const slug = `${base}-${suffix}`;

  const { data: gym, error } = await admin
    .from("gyms")
    .insert({
      owner_id: params.ownerId,
      name: params.gymName,
      slug,
      contact_email: params.contactEmail,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Stamp the owner's profile with gym_id + role.
  await admin.from("profiles").update({ gym_id: gym.id, role: "owner" }).eq("id", params.ownerId);

  // Default subscription: Starter, trialing.
  const { data: plan } = await admin.from("plans").select("id, member_limit").eq("key", "starter").single();
  await admin.from("subscriptions").insert({
    gym_id: gym.id,
    plan_id: plan!.id,
    status: "trialing",
    member_limit: plan!.member_limit,
  });

  return { gymId: gym.id };
}

/** Gym + current subscription + plan, for the settings page. */
export async function getGymWithSubscription(db: DB, gymId: string) {
  const { data: gym, error } = await db.from("gyms").select("*").eq("id", gymId).single();
  if (error) throw error;

  const { data: sub } = await db
    .from("subscriptions")
    .select("*, plans(key, name, member_limit, price_cents)")
    .eq("gym_id", gymId)
    .maybeSingle();

  const subscription = sub as unknown as
    | {
        status: string;
        member_limit: number;
        plans: { key: string; name: string; member_limit: number; price_cents: number } | null;
      }
    | null;

  return { gym, subscription };
}

export async function updateGymSettings(db: DB, gymId: string, input: GymSettingsInput) {
  const { error } = await db
    .from("gyms")
    .update({
      name: input.name,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone || null,
      logo_url: input.logoUrl || null,
    })
    .eq("id", gymId);
  if (error) throw error;
}
