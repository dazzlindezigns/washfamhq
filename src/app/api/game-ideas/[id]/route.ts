import { MSG, isUuid, json, safeEqual } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { cleanIdeaInput, gameIdeaSchema, ideaErrorsFrom } from "@/lib/schema";
import { getServiceClient } from "@/lib/supabase";

const IDEA_MSG = {
  notFound: "I can't find that game idea anymore. It may have been removed.",
  forbidden: "That game idea was shared from another device. Text Dani if it needs a change.",
};

async function authorize(req: Request, id: string) {
  const supabase = getServiceClient();
  if (!supabase) return { error: json({ error: MSG.notConfigured }, 503) } as const;
  const token = req.headers.get("x-edit-token") ?? "";
  if (!isUuid(id) || !isUuid(token)) return { error: json({ error: IDEA_MSG.notFound }, 404) } as const;
  const { data, error } = await supabase.from("xmas_game_ideas").select("id,edit_token").eq("id", id).maybeSingle();
  if (error) return { error: json({ error: MSG.server }, 500) } as const;
  if (!data) return { error: json({ error: IDEA_MSG.notFound }, 404) } as const;
  if (!safeEqual(String(data.edit_token), token)) return { error: json({ error: IDEA_MSG.forbidden }, 403) } as const;
  return { supabase } as const;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/game-ideas/[id]">) {
  const { id } = await ctx.params;
  if (!(await rateLimit(req, "idea-update", 30, 600))) return json({ error: MSG.rateLimited }, 429);
  const auth = await authorize(req, id);
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: MSG.badJson }, 400);
  }
  const parsed = gameIdeaSchema.safeParse(cleanIdeaInput(body));
  if (!parsed.success) return json({ error: MSG.invalid, fieldErrors: ideaErrorsFrom(parsed.error) }, 400);
  const d = parsed.data;
  const { error } = await auth.supabase
    .from("xmas_game_ideas")
    .update({
      title: d.title,
      how_to_play: d.howToPlay,
      links: d.links.map((l) => ({ url: l.url, label: l.label ?? null })),
      shared_by: d.sharedBy ?? null,
    })
    .eq("id", id);
  if (error) return json({ error: MSG.server }, 500);
  return json({ id });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/game-ideas/[id]">) {
  const { id } = await ctx.params;
  if (!(await rateLimit(req, "idea-update", 30, 600))) return json({ error: MSG.rateLimited }, 429);
  const auth = await authorize(req, id);
  if ("error" in auth) return auth.error;
  const { error } = await auth.supabase.from("xmas_game_ideas").delete().eq("id", id);
  if (error) return json({ error: MSG.server }, 500);
  return json({ ok: true });
}
