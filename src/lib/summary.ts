import { DISH_CATEGORIES, type DishCategoryId } from "@/config/event";
import type { PublicRsvp, ResolvedSettings } from "./types";

export type DishClaim = { id: string; family: string; dish: string | null; status: PublicRsvp["status"] };

export type DishTile = {
  id: DishCategoryId;
  label: string;
  plural: string;
  image: string;
  alt: string;
  claims: DishClaim[];
  count: number;
  limit: number | null;
  covered: boolean;
};

const statusRank = { coming: 0, maybe: 1, cant: 2 } as const;

/** Cards shown in "Who All Over There?": hosts first, then Coming, then Maybe. */
export function visibleFamilies(rsvps: PublicRsvp[]) {
  return rsvps
    .filter((r) => r.status === "coming" || r.status === "maybe")
    .sort((a, b) => {
      if (a.is_host !== b.is_host) return a.is_host ? -1 : 1;
      if (a.status !== b.status) return statusRank[a.status] - statusRank[b.status];
      return a.created_at.localeCompare(b.created_at);
    });
}

export function headcount(rsvps: PublicRsvp[]) {
  const coming = rsvps.filter((r) => r.status === "coming");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const cant = rsvps.filter((r) => r.status === "cant");
  const sum = (list: PublicRsvp[]) => list.reduce((n, r) => n + (r.guest_count || 0), 0);
  return {
    comingFamilies: coming.length,
    comingPeople: sum(coming),
    maybeFamilies: maybe.length,
    maybePeople: sum(maybe),
    cantFamilies: cant.length,
  };
}

export function dishTiles(rsvps: PublicRsvp[], settings: ResolvedSettings): DishTile[] {
  const active = rsvps.filter((r) => (r.status === "coming" || r.status === "maybe") && r.dish_category);
  return DISH_CATEGORIES.map((c) => {
    const claims = active
      .filter((r) => r.dish_category === c.id)
      .sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.created_at.localeCompare(b.created_at))
      .map((r) => ({ id: r.id, family: r.family_name, dish: r.dish, status: r.status }));
    const limit = settings.categoryLimits[c.id] ?? null;
    return {
      id: c.id,
      label: c.label,
      plural: c.plural,
      image: c.image,
      alt: c.alt,
      claims,
      count: claims.length,
      limit,
      covered: limit !== null && claims.length >= limit,
    };
  });
}

/** Categories that still have room, emptiest first (for the "try this instead" nudge). */
export function openCategories(tiles: DishTile[], exclude?: DishCategoryId) {
  return tiles
    .filter((t) => !t.covered && t.id !== exclude)
    .sort((a, b) => {
      const fa = a.limit ? a.count / a.limit : a.count / 10;
      const fb = b.limit ? b.count / b.limit : b.count / 10;
      return fa - fb;
    });
}

export function gamesBeingBrought(rsvps: PublicRsvp[]) {
  return rsvps
    .filter((r) => r.status !== "cant" && r.game && r.game.trim())
    .map((r) => ({ id: r.id, family: r.family_name, game: r.game as string, status: r.status }));
}

export function categoryLabel(id: DishCategoryId | null | undefined) {
  return DISH_CATEGORIES.find((c) => c.id === id)?.label ?? null;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
