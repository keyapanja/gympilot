import "server-only";
import type { DB } from "./types";
import type { ProgressInput } from "@/lib/validations";
import type { Tables } from "@/types/db.types";

export type ProgressEntry = Tables<"progress_entries">;

/** Full progress history for a member, oldest → newest (chart-friendly). */
export async function listProgress(db: DB, memberId: string): Promise<ProgressEntry[]> {
  const { data, error } = await db
    .from("progress_entries")
    .select("*")
    .eq("member_id", memberId)
    .order("recorded_on", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Upsert a progress entry for a date (one row per member per day). */
export async function upsertProgress(db: DB, memberId: string, input: ProgressInput) {
  const { error } = await db.from("progress_entries").upsert(
    {
      member_id: memberId,
      recorded_on: input.recordedOn,
      weight_kg: input.weightKg ?? null,
      waist_cm: input.waistCm ?? null,
      chest_cm: input.chestCm ?? null,
      arms_cm: input.armsCm ?? null,
      hips_cm: input.hipsCm ?? null,
      note: input.note || null,
    },
    { onConflict: "member_id,recorded_on" },
  );
  if (error) throw error;
}

export async function deleteProgress(db: DB, memberId: string, entryId: string) {
  const { error } = await db.from("progress_entries").delete().eq("id", entryId).eq("member_id", memberId);
  if (error) throw error;
}

/** Latest weight + delta vs first record, for dashboard summaries. */
export async function progressSummary(db: DB, memberId: string) {
  const history = await listProgress(db, memberId);
  const weights = history.filter((h) => h.weight_kg != null);
  if (weights.length === 0) return { latest: null, change: null, points: history.length };
  const first = weights[0]!.weight_kg!;
  const last = weights[weights.length - 1]!.weight_kg!;
  return { latest: last, change: Math.round((last - first) * 10) / 10, points: history.length };
}
