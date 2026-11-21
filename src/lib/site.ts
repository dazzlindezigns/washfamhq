/** Canonical site URL. Set NEXT_PUBLIC_SITE_URL once the domain is picked. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Host phone/text number from HOST_PHONE (optional). */
export function hostPhone(): { display: string; tel: string; sms: string } | null {
  const raw = process.env.HOST_PHONE?.trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 7) return null;
  return { display: raw, tel: `tel:${digits}`, sms: `sms:${digits}` };
}

export const SHARE_TITLE = "You're Invited: The Washingtons' Christmas Eve Pajama Game Night";
export const SHARE_DESCRIPTION =
  "Christmas Eve, Thursday Dec 24, 2026. Pajamas required, every family brings a dish, and game faces on. RSVP, claim your dish, and see who all is coming.";
