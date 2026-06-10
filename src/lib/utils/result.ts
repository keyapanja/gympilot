/**
 * Lightweight Result type for server actions and services. Keeps error
 * handling explicit and serializable across the server/client boundary.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

/** Map a thrown Postgres/Supabase error to a friendly action error. */
export function fromError(err: unknown): ActionResult<never> {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("MEMBER_LIMIT_EXCEEDED")) {
    return fail("MEMBER_LIMIT_EXCEEDED", "You've reached your plan's member limit. Upgrade to add more members.");
  }
  if (message.includes("duplicate key") && message.includes("members_gym_id_email")) {
    return fail("DUPLICATE_MEMBER", "A member with this email already exists in your gym.");
  }
  if (message.includes("duplicate key")) {
    return fail("DUPLICATE", "That record already exists.");
  }
  return fail("UNKNOWN", message || "Something went wrong. Please try again.");
}
