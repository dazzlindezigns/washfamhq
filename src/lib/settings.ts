import { DISH_CATEGORY_IDS, eventConfig, type DishCategoryId } from "@/config/event";
import type { ResolvedSettings } from "./types";

/** Raw row shape of xmas_settings. Every column is optional/nullable. */
export type SettingsRow = Partial<{
  title: string | null;
  event_date: string | null;
  event_time: string | null;
  starts_at: string | null;
  location_label: string | null;
  address: string | null;
  maps_url: string | null;
  attire: string | null;
  attire_note: string | null;
  dish_rule: string | null;
  tone_line: string | null;
  category_limits: Record<string, unknown> | null;
}>;

const clean = (v: string | null | undefined) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length ? t : null;
};

export function formatEventDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
  const long = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const short = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return { long, short };
}

export function mapsLinkFor(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function resolveLimits(raw: Record<string, unknown> | null | undefined) {
  const limits = { ...eventConfig.categoryLimits } as Record<DishCategoryId, number | null>;
  if (raw && typeof raw === "object") {
    for (const id of DISH_CATEGORY_IDS) {
      if (!(id in raw)) continue;
      const v = raw[id];
      if (v === null || v === "" || v === 0) limits[id] = null;
      else if (typeof v === "number" && Number.isFinite(v) && v > 0) limits[id] = Math.floor(v);
      else if (typeof v === "string" && /^\d+$/.test(v)) limits[id] = Number(v) || null;
    }
  }
  return limits;
}

/** Merge a DB settings row over the config defaults. */
export function resolveSettings(row: SettingsRow | null | undefined): ResolvedSettings {
  const r = row ?? {};
  const rawDate = clean(r.event_date);
  const eventDate = rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : eventConfig.eventDate;
  const { long, short } = formatEventDate(eventDate);
  const address = clean(r.address) ?? eventConfig.address;
  const startsAt = clean(r.starts_at);
  return {
    title: clean(r.title) ?? eventConfig.title,
    eventDate,
    eventDateLabel: long,
    eventDateShort: short,
    eventTime: clean(r.event_time) ?? eventConfig.eventTime,
    startsAt,
    countdownTarget: startsAt ?? eventConfig.countdownFallback,
    locationLabel: clean(r.location_label) ?? eventConfig.locationLabel,
    address,
    mapsUrl: clean(r.maps_url) ?? eventConfig.mapsUrl ?? (address ? mapsLinkFor(address) : null),
    attire: clean(r.attire) ?? eventConfig.attire,
    attireNote: clean(r.attire_note) ?? eventConfig.attireNote,
    dishRule: clean(r.dish_rule) ?? eventConfig.dishRule,
    toneLine: clean(r.tone_line) ?? eventConfig.toneLine,
    categoryLimits: resolveLimits(r.category_limits),
  };
}
