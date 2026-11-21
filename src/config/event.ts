/**
 * EVENT CONFIG: the one place for event facts.
 *
 * How it works:
 *  - These are the defaults.
 *  - Anything you set in the `xmas_settings` table (or from /admin → Event settings)
 *    overrides the matching value here. Leave a setting empty in the table and the
 *    value from this file is used.
 *  - Secrets and contact info (host phone, admin passcode) live in env vars, not here.
 */

export const DISH_CATEGORIES = [
  { id: "entree", label: "Entrée", plural: "entrées", image: "/images/food/entree.webp", alt: "Roasted turkey with vegetables" },
  { id: "side", label: "Side Dish", plural: "sides", image: "/images/food/side.webp", alt: "A big bowl of baked mac and cheese" },
  { id: "salad", label: "Salad", plural: "salads", image: "/images/food/salad.webp", alt: "A colorful tossed salad" },
  { id: "dessert", label: "Dessert", plural: "desserts", image: "/images/food/dessert.webp", alt: "A glazed bundt cake topped with berries" },
  { id: "fruit", label: "Fruit", plural: "fruit trays", image: "/images/food/fruit.webp", alt: "A bowl of mixed fresh fruit" },
  { id: "drinks", label: "Drinks", plural: "drinks", image: "/images/food/drinks.webp", alt: "Glasses of red holiday punch" },
] as const;

export type DishCategoryId = (typeof DISH_CATEGORIES)[number]["id"];
export const DISH_CATEGORY_IDS = DISH_CATEGORIES.map((c) => c.id) as [DishCategoryId, ...DishCategoryId[]];

export const eventConfig = {
  title: "The Washingtons' Christmas Eve Pajama Game Night",
  shortTitle: "Christmas Eve Pajama Game Night",
  hostFamily: "The Washingtons",
  hostName: "Dani",

  /** Event date (YYYY-MM-DD). */
  eventDate: "2026-12-24",
  /** Shown as-is. null = "Time coming soon". */
  eventTime: null as string | null,
  /**
   * Countdown target when no exact start time is set in settings.
   * Midnight at the start of Christmas Eve, US Central time. Change the offset if needed
   * (Eastern -05:00, Central -06:00, Mountain -07:00, Pacific -08:00).
   */
  countdownFallback: "2026-12-24T00:00:00-06:00",

  locationLabel: "At a VRBO. Location to be announced",
  /** null until booked. When set, the address shows with a Google Maps link. */
  address: null as string | null,
  mapsUrl: null as string | null,

  attire: "Christmas pajamas (required)",
  attireNote: "Plaid matching encouraged",
  dishRule: "Every family brings a dish",
  toneLine: "fun, festive, and faith-filled",

  /**
   * Suggested max per dish category. It's a soft limit: when it's reached the tile
   * says "Covered!" and nudges folks elsewhere, but nobody gets blocked.
   * null = no limit.
   */
  categoryLimits: {
    entree: 4,
    side: 6,
    salad: 3,
    dessert: 4,
    fruit: 2,
    drinks: 3,
  } as Record<DishCategoryId, number | null>,

  /**
   * Nav + section names. Rename sections here without touching components.
   * The RSVP section is called "Count Me In!" so it doesn't feel like a twin of "Who All Over There?".
   */
  nav: {
    home: "Home",
    details: "Event Details",
    whoAll: "Who All Over There?",
    dishes: "Dish Signup",
    games: "Games",
    rsvp: "Count Me In",
  },
  rsvpSectionTitle: "Count Me In!",

  gameChecklist: ["Family Games", "Team Challenges", "Friendly Competition", "Big Laughs", "Holiday Vibes"],
} as const;

export type EventConfig = typeof eventConfig;
