import { MSG, SELECT_FULL, isUuid, json, safeEqual } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsFrom, rsvpSchema, toDbRow } from "@/lib/schema";
import { getServiceClient } from "@/lib/supabase";

/** Loads the full row only for the device holding the edit token. */
async function authorize(req: Request, id: string) {
  const supabase = getServiceClient();
  if (!supabase) return { error: json({ error: MSG.notConfigured }, 503) } as const;
  const token = req.headers.get("x-edit-token") ?? "";
  if (!isUuid(id) || !isUuid(token)) return { error: json({ error: MSG.notFound }, 404) } as const;

  const { data, error } = await supabase.from("xmas_rsvps").select("id,edit_token,is_host").eq("id", id).maybeSingle();
  if (error) {
    console.error("[xmas] lookup failed:", error.message);
    return { error: json({ error: MSG.server }, 500) } as const;
  }
  if (!data) return { error: json({ error: MSG.notFound }, 404) } as const;
  if (!safeEqual(String(data.edit_token), token)) return { error: json({ error: MSG.forbidden }, 403) } as const;
  return { supabase } as const;
}

export async function GET(req: Request, ctx: RouteContext<"/api/rsvp/[id]">) {
  const { id } = await ctx.params;
  if (!(await rateLimit(req, "rsvp-read", 60, 600))) return json({ error: MSG.rateLimited }, 429);
  const auth = await authorize(req, id);
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase.from("xmas_rsvps").select(SELECT_FULL).eq("id", id).single();
  if (error || !data) return json({ error: MSG.server }, 500);
  return json({ rsvp: data });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/rsvp/[id]">) {
  const { id } = await ctx.params;
  if (!(await rateLimit(req, "rsvp-update", 30, 600))) return json({ error: MSG.rateLimited }, 429);
  const auth = await authorize(req, id);
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: MSG.badJson }, 400);
  }
  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) return json({ error: MSG.invalid, fieldErrors: fieldErrorsFrom(parsed.error) }, 400);

  const { error } = await auth.supabase.from("xmas_rsvps").update(toDbRow(parsed.data)).eq("id", id);
  if (error) {
    console.error("[xmas] update failed:", error.message);
    return json({ error: MSG.server }, 500);
  }
  return json({ id });
}
