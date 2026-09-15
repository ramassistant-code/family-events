import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { COVER_ERRORS } from "./event-cover";

export function getSupabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  return url || null;
}

export function getSupabaseAdmin():
  | { ok: true; supabase: SupabaseClient; url: string }
  | { ok: false; error: string } {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return { ok: false, error: COVER_ERRORS.notConfigured };
  }
  return {
    ok: true,
    url,
    supabase: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}
