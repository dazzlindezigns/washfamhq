import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;

const opts = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

let anon: SupabaseClient | null = null;
let service: SupabaseClient | null = null;

/** Anon client: can only read xmas_public_rsvps + xmas_settings (enforced by RLS/grants). */
export function getAnonClient(): SupabaseClient | null {
  const u = url();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!u || !key) return null;
  anon ??= createClient(u, key, opts);
  return anon;
}

/** Service-role client: server only, used by the API routes and /admin. */
export function getServiceClient(): SupabaseClient | null {
  const u = url();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!u || !key) return null;
  service ??= createClient(u, key, opts);
  return service;
}
