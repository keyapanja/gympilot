import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db.types";

/** A typed Supabase client (either RLS-scoped server client or admin client). */
export type DB = SupabaseClient<Database>;
