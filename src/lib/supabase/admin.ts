import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.types";
import { env } from "@/lib/env";

/**
 * Service-role client. BYPASSES RLS. Use only in trusted server code for
 * privileged operations (member invites, creating auth users, admin tasks).
 * Never import this into client components.
 */
export function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
