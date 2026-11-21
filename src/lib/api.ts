import "server-only";

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const MSG = {
  notConfigured: "RSVPs aren't hooked up yet. Text Dani: the site still needs its database keys.",
  rateLimited: "Whoa, slow down! Too many tries from this device. Give it a few minutes and try again.",
  badJson: "That didn't come through right. Refresh the page and try again.",
  invalid: "A couple things need fixing. Check the highlighted fields.",
  server: "Something glitched on our end. Your info is still here, so try again in a sec.",
  notFound: "I can't find that RSVP anymore. Fill it out fresh and you're good.",
  forbidden: "That RSVP belongs to another device. Text Dani if you need it changed.",
} as const;

export const SELECT_FULL =
  "id,family_name,contact_name,status,adults,kids,kids_ages,dish_category,dish,game,contact,note,is_host,created_at,updated_at";

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Constant-time-ish comparison for tokens. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
