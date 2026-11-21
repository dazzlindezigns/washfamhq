import { after } from "next/server";
import { MSG, SELECT_FULL, json } from "@/lib/api";
import { notifyNewRsvp } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsFrom, rsvpSchema, toDbRow } from "@/lib/schema";
import { getServiceClient } from "@/lib/supabase";
import type { RsvpRecord } from "@/lib/types";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: MSG.badJson }, 400);
  }

  // Honeypot: bots fill every field. Pretend it worked and store nothing.
  if (body && typeof body === "object" && typeof (body as { website?: unknown }).website === "string" && (body as { website: string }).website.trim()) {
    return json({ id: crypto.randomUUID(), editToken: crypto.randomUUID() }, 201);
  }

  const supabase = getServiceClient();
  if (!supabase) return json({ error: MSG.notConfigured }, 503);

  if (!(await rateLimit(req, "rsvp-create", 8, 600))) return json({ error: MSG.rateLimited }, 429);

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) return json({ error: MSG.invalid, fieldErrors: fieldErrorsFrom(parsed.error) }, 400);

  const { data, error } = await supabase
    .from("xmas_rsvps")
    .insert({ ...toDbRow(parsed.data), is_host: false })
    .select(`${SELECT_FULL},edit_token`)
    .single();

  if (error || !data) {
    console.error("[xmas] insert failed:", error?.message);
    return json({ error: MSG.server }, 500);
  }

  const record = data as RsvpRecord & { edit_token: string };
  after(() => notifyNewRsvp(record));

  return json({ id: record.id, editToken: record.edit_token }, 201);
}
