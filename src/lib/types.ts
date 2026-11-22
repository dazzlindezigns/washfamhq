import type { DishCategoryId } from "@/config/event";

export type RsvpStatus = "coming" | "maybe" | "cant";

/** A row from the xmas_public_rsvps view. No contact info, ever. */
export type PublicRsvp = {
  id: string;
  family_name: string;
  status: RsvpStatus;
  guest_count: number;
  dish_category: DishCategoryId | null;
  dish: string | null;
  game: string | null;
  is_host: boolean;
  created_at: string;
  /** Public guest names (adults first, then kids). Ages are never public. */
  guest_names: string[];
};

/** A full row from xmas_rsvps (server/admin only). */
export type RsvpRecord = PublicRsvp & {
  edit_token?: string;
  contact_name: string;
  adults: number;
  kids: number;
  kids_ages: string | null;
  guests: { name: string; type: "adult" | "kid"; age?: string | null }[];
  contact: string | null;
  note: string | null;
  updated_at: string;
};

export type ResolvedSettings = {
  title: string;
  eventDate: string; // YYYY-MM-DD
  eventDateLabel: string; // "Thursday, December 24, 2026"
  eventDateShort: string; // "December 24, 2026"
  eventTime: string | null;
  startsAt: string | null;
  countdownTarget: string; // ISO
  locationLabel: string;
  address: string | null;
  mapsUrl: string | null;
  attire: string;
  attireNote: string | null;
  dishRule: string;
  giftRule: string;
  toneLine: string;
  categoryLimits: Record<DishCategoryId, number | null>;
};

export type GameLink = { url: string; label?: string | null };

/** A row from the xmas_public_game_ideas view. */
export type GameIdea = {
  id: string;
  title: string;
  how_to_play: string;
  links: GameLink[];
  shared_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicData = {
  ok: boolean;
  error?: "not_configured" | "fetch_failed";
  settings: ResolvedSettings;
  rsvps: PublicRsvp[];
  /** null = the game ideas couldn't be loaded (the rest of the page still works). */
  ideas: GameIdea[] | null;
  generatedAt: number;
};
