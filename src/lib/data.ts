import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { getAnonClient } from "./supabase";
import { resolveSettings, type SettingsRow } from "./settings";
import type { PublicData, PublicRsvp } from "./types";

const PUBLIC_COLUMNS = "id,family_name,status,guest_count,dish_category,dish,game,is_host,created_at";

/** Uncached read of everything the public page needs. */
export async function fetchPublicData(): Promise<PublicData> {
  const supabase = getAnonClient();
  if (!supabase) {
    return { ok: false, error: "not_configured", settings: resolveSettings(null), rsvps: [], generatedAt: Date.now() };
  }

  const [settingsRes, rsvpRes] = await Promise.all([
    supabase.from("xmas_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("xmas_public_rsvps").select(PUBLIC_COLUMNS).order("created_at", { ascending: true }),
  ]);

  if (settingsRes.error) console.error("[xmas] settings read failed:", settingsRes.error.message);
  const settings = resolveSettings((settingsRes.data as SettingsRow | null) ?? null);

  if (rsvpRes.error) {
    console.error("[xmas] rsvp view read failed:", rsvpRes.error.message);
    return { ok: false, error: "fetch_failed", settings, rsvps: [], generatedAt: Date.now() };
  }

  return { ok: true, settings, rsvps: (rsvpRes.data ?? []) as PublicRsvp[], generatedAt: Date.now() };
}

/** Per-request, deduped read for Server Components. Always dynamic (fresh every visit). */
export const getPublicData = cache(async () => {
  await connection();
  return fetchPublicData();
});
