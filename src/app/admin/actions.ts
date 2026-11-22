"use server";

import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { DISH_CATEGORY_IDS, type DishCategoryId } from "@/config/event";
import { ADMIN_COOKIE, checkPasscode, isAdmin, makeSessionValue } from "@/lib/admin-auth";
import { fieldErrorsFrom, rsvpSchema, toDbRow } from "@/lib/schema";
import { getServiceClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export type ActionState = { ok?: boolean; message?: string } | null;

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Not signed in");
  const supabase = getServiceClient();
  if (!supabase) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return supabase;
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const h = await headers();
  const fakeReq = new Request("http://local/admin", { headers: h });
  if (!(await rateLimit(fakeReq, "admin-login", 10, 900))) {
    return { message: "Too many tries. Take a breath and try again in 15 minutes." };
  }
  const code = String(formData.get("passcode") ?? "");
  if (!checkPasscode(code)) return { message: "That's not it. Try again." };
  const { value, maxAge } = makeSessionValue();
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  refresh();
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  refresh();
}

export async function saveRsvp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const raw = Object.fromEntries(formData.entries());
    const parsed = rsvpSchema.safeParse({ ...raw, website: "" });
    // Admin can save even if a "coming" family hasn't picked a dish yet.
    const relaxed = parsed.success
      ? parsed.data
      : (() => {
          const errs = fieldErrorsFrom(parsed.error);
          const blocking = Object.keys(errs).filter((k) => k !== "dishCategory" && k !== "dish");
          if (blocking.length) throw new Error(errs[blocking[0] as keyof typeof errs]);
          return null;
        })();
    const row = relaxed
      ? toDbRow(relaxed)
      : {
          family_name: String(raw.familyName).trim(),
          contact_name: String(raw.contactName).trim(),
          status: String(raw.status),
          adults: Number(raw.adults) || 0,
          kids: Number(raw.kids) || 0,
          kids_ages: String(raw.kidsAges ?? "").trim() || null,
          dish_category: DISH_CATEGORY_IDS.includes(raw.dishCategory as DishCategoryId) ? String(raw.dishCategory) : null,
          dish: String(raw.dish ?? "").trim() || null,
          game: String(raw.game ?? "").trim() || null,
          contact: String(raw.contact ?? "").trim() || null,
          note: String(raw.note ?? "").trim() || null,
        };
    if (id) {
      const { error } = await supabase.from("xmas_rsvps").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("xmas_rsvps").insert(row);
      if (error) throw new Error(error.message);
    }
    refresh();
    return { ok: true, message: "Saved." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Couldn't save." };
  }
}

export async function deleteRsvp(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabase.from("xmas_rsvps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

const text = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v.length ? v : null;
};

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const supabase = await requireAdmin();
    const limits: Record<string, number | null> = {};
    for (const id of DISH_CATEGORY_IDS) {
      const v = String(formData.get(`limit_${id}`) ?? "").trim();
      const n = Number(v);
      limits[id] = v === "" || !Number.isFinite(n) || n <= 0 ? null : Math.floor(n);
    }
    // The browser converts the local date/time to an ISO timestamp (see SettingsForm).
    const iso = text(formData, "starts_at_iso");
    const startsAt = iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toISOString() : null;
    const row = {
      id: 1,
      event_time: text(formData, "event_time"),
      starts_at: startsAt,
      location_label: text(formData, "location_label"),
      address: text(formData, "address"),
      maps_url: text(formData, "maps_url"),
      category_limits: limits,
    };
    if (row.maps_url && !/^https:\/\//i.test(row.maps_url)) {
      return { message: "Maps link should start with https://" };
    }
    const { error } = await supabase.from("xmas_settings").upsert(row, { onConflict: "id" });
    if (error) throw new Error(error.message);
    refresh();
    return { ok: true, message: "Settings saved. The site updates right away." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Couldn't save settings." };
  }
}

export async function deleteGameIdea(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabase.from("xmas_game_ideas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
