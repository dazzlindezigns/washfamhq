import { z } from "zod";
import { DISH_CATEGORY_IDS } from "@/config/event";

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalText = (max: number, tooLong: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, tooLong).optional());

export function looksLikePhoneOrEmail(v: string) {
  const s = v.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return true;
  const digits = s.replace(/\D/g, "");
  return /^[\d\s()+.\-]+$/.test(s) && digits.length >= 7 && digits.length <= 15;
}

const guestName = z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().trim().max(60, "Keep each name under 60 characters."));

const count = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : v),
    z.coerce
      .number({ error: `Put a number for ${label}.` })
      .int(`Whole people only for ${label}, please.`)
      .min(0, `${label} can't be negative. Nice try.`)
      .max(40, `40+ ${label}?! Text Dani, we need a bigger VRBO.`),
  );

export const rsvpSchema = z
  .object({
    familyName: z
      .string({ error: "Hold up, what's the family (or crew) name?" })
      .trim()
      .min(1, "Hold up, what's the family (or crew) name?")
      .max(80, "Keep the family name under 80 characters, superstar."),
    contactName: z
      .string({ error: "Who's filling this out? Put your name in." })
      .trim()
      .min(1, "Who's filling this out? Put your name in.")
      .max(80, "Keep your name under 80 characters."),
    status: z.enum(["coming", "maybe", "cant"], { error: "Pick one: Coming, Maybe, or sending love." }),
    adults: count("adults"),
    kids: count("kids"),
    kidsAges: optionalText(120, "Keep the kids' ages short and sweet (120 characters)."),
    /** One name per adult (same order as the "Adults" count). */
    adultNames: z.array(guestName).max(40).default([]),
    /** One entry per kid: name + optional age. */
    kidGuests: z
      .array(
        z.object({
          name: guestName,
          age: z.preprocess(blankToUndefined, z.string().trim().max(10, "Keep the age short, like 7 or 18 mo.").optional()),
        }),
      )
      .max(40)
      .default([]),
    dishCategory: z.preprocess(
      blankToUndefined,
      z.enum(DISH_CATEGORY_IDS, { error: "Pick a dish category." }).optional(),
    ),
    dish: optionalText(120, "Keep the dish description under 120 characters."),
    game: optionalText(120, "Keep the game name under 120 characters."),
    contact: optionalText(160, "That's a long phone/email. Double-check it?").refine(
      (v) => v === undefined || looksLikePhoneOrEmail(v),
      "That phone or email looks a little off. Double-check it?",
    ),
    note: optionalText(1000, "Love the enthusiasm, but keep the note under 1,000 characters."),
    /** Honeypot. Real people never see or fill this. */
    website: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.status !== "cant" && d.adults + d.kids < 1) {
      ctx.addIssue({ code: "custom", path: ["adults"], message: "Somebody has to come! Add at least one person." });
    }
    if (d.status !== "cant") {
      for (let i = 0; i < d.adults; i++) {
        if (!d.adultNames[i]) {
          ctx.addIssue({ code: "custom", path: ["adultNames", i], message: `Who's adult #${i + 1}? Put their name in.` });
        }
      }
      for (let i = 0; i < d.kids; i++) {
        if (!d.kidGuests[i]?.name) {
          ctx.addIssue({ code: "custom", path: ["kidGuests", i, "name"], message: `What's kid #${i + 1}'s name?` });
        }
      }
    }
    if (d.status === "coming") {
      if (!d.dishCategory) {
        ctx.addIssue({ code: "custom", path: ["dishCategory"], message: "You're coming, so pick a dish category. Every family brings a dish!" });
      }
      if (!d.dish) {
        ctx.addIssue({ code: "custom", path: ["dish"], message: "Tell us what you're bringing (even if it's just “Grandma's famous something”)." });
      }
    }
  });

export type RsvpInput = z.input<typeof rsvpSchema>;
export type RsvpParsed = z.output<typeof rsvpSchema>;

export type FieldName = keyof RsvpParsed;

/** Error keys: a field name, or a nested path like "adultNames.1" / "kidGuests.0.name". */
export type FormErrors = Record<string, string | undefined>;

export const errorStep = (key: string) => FIELD_STEP[key.split(".")[0] as FieldName] ?? 0;

/** Which form step each field lives on (used to jump to the right step on errors). */
export const FIELD_STEP: Record<FieldName, number> = {
  familyName: 0,
  contactName: 0,
  status: 0,
  adults: 0,
  kids: 0,
  kidsAges: 0,
  adultNames: 0,
  kidGuests: 0,
  dishCategory: 1,
  dish: 1,
  game: 1,
  contact: 2,
  note: 2,
  website: 2,
};

export function fieldErrorsFrom(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export type Guest = { name: string; type: "adult" | "kid"; age?: string | null };

export function guestsFrom(d: Pick<RsvpParsed, "status" | "adults" | "kids" | "adultNames" | "kidGuests">): Guest[] {
  if (d.status === "cant") return [];
  const adults = d.adultNames.slice(0, d.adults).filter(Boolean).map((name) => ({ name, type: "adult" as const }));
  const kids = d.kidGuests
    .slice(0, d.kids)
    .filter((k) => k.name)
    .map((k) => ({ name: k.name, type: "kid" as const, age: k.age ?? null }));
  return [...adults, ...kids];
}

/** Convert parsed input to DB columns. */
export function toDbRow(d: RsvpParsed) {
  const cant = d.status === "cant";
  const guests = guestsFrom(d);
  return {
    guests,
    family_name: d.familyName,
    contact_name: d.contactName,
    status: d.status,
    adults: cant ? 0 : d.adults,
    kids: cant ? 0 : d.kids,
    kids_ages: null,
    dish_category: cant ? null : (d.dishCategory ?? null),
    dish: cant ? null : (d.dish ?? null),
    game: cant ? null : (d.game ?? null),
    contact: d.contact ?? null,
    note: d.note ?? null,
  };
}

/* ---------------- Game ideas ---------------- */

export const MAX_GAME_LINKS = 8;

function normalizeUrl(raw: string) {
  const s = raw.trim();
  if (!s) return s;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

const linkSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500, "That link is too long. Try the share link from YouTube or TikTok instead.")
    .transform(normalizeUrl)
    .refine((v) => isHttpUrl(v), "That link doesn't look right. Paste the whole thing (like https://youtube.com/...)."),
  label: z.preprocess(blankToUndefined, z.string().trim().max(60, "Keep the link name under 60 characters.").optional()),
});

export const gameIdeaSchema = z.object({
  title: z
    .string({ error: "What's the game called?" })
    .trim()
    .min(1, "What's the game called?")
    .max(80, "Keep the game name under 80 characters."),
  howToPlay: z
    .string({ error: "Tell us how to play. Short and sweet is fine." })
    .trim()
    .min(1, "Tell us how to play. Short and sweet is fine.")
    .max(2000, "Love the detail, but keep it under 2,000 characters."),
  links: z
    .array(linkSchema)
    .max(MAX_GAME_LINKS, `That's plenty! ${MAX_GAME_LINKS} links max.`)
    .default([]),
  sharedBy: z.preprocess(blankToUndefined, z.string().trim().max(80, "Keep your name under 80 characters.").optional()),
  website: z.string().optional(),
});

export type GameIdeaInput = z.input<typeof gameIdeaSchema>;

/** Drop rows where the person left the link box empty, before validating. */
export function cleanIdeaInput(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const b = body as Record<string, unknown>;
  const links = Array.isArray(b.links)
    ? b.links.filter((l) => l && typeof l === "object" && typeof (l as { url?: unknown }).url === "string" && (l as { url: string }).url.trim())
    : [];
  return { ...b, links };
}

export function ideaErrorsFrom(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
