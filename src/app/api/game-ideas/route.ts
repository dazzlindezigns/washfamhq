import { MSG, json } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { cleanIdeaInput, gameIdeaSchema, ideaErrorsFrom } from "@/lib/schema";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: MSG.badJson }, 400);
  }

  // Honeypot: pretend it worked, store nothing.
  const hp = (body as { website?: unknown } | null)?.website;
  if (typeof hp === "string" && hp.trim()) return json({ id: crypto.randomUUID(), editToken: crypto.randomUUID() }, 201);

  const supabase = getServiceClient();
  if (!supabase) return json({ error: MSG.notConfigured }, 503);
  if (!(await rateLimit(req, "idea-create", 15, 600))) return json({ error: MSG.rateLimited }, 429);

  const parsed = gameIdeaSchema.safeParse(cleanIdeaInput(body));
  if (!parsed.success) return json({ error: MSG.invalid, fieldErrors: ideaErrorsFrom(parsed.error) }, 400);
  const d = parsed.data;

  const { data, error } = await supabase
    .from("xmas_game_ideas")
    .insert({
      title: d.title,
      how_to_play: d.howToPlay,
      links: d.links.map((l) => ({ url: l.url, label: l.label ?? null })),
      shared_by: d.sharedBy ?? null,
    })
    .select("id,edit_token")
    .single();
  if (error || !data) {
    console.error("[xmas] game idea insert failed:", error?.message);
    return json({ error: MSG.server }, 500);
  }
  return json({ id: data.id, editToken: data.edit_token }, 201);
}
