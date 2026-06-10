"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db.types";

/**
 * Browser Supabase client. Used only for auth flows (sign in / sign up /
 * password reset). Tenant data is fetched server-side under RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
