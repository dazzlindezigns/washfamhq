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
  { id: "meats", label: "Meats", plural: "meats", image: "/images/menu/meats.webp", alt: "Meats: glazed wings, meatballs on toothpicks, and sliced sausage" },
  { id: "sides", label: "Sides", plural: "sides", image: "/images/menu/sides.webp", alt: "Sides: a snack board with cheese cubes, meat roses, fruit, crackers, and dip" },
  { id: "chips", label: "Chips & Dip", plural: "chips and dip", image: "/images/menu/chips.webp", alt: "Chips & Dip: tortilla chips, potato chips, and pretzels with queso, ranch, and salsa" },
  { id: "desserts", label: "Desserts", plural: "desserts", image: "/images/menu/desserts.webp", alt: "Desserts: chocolate-dipped strawberries, cupcakes, brownies, and cake pops" },
  { id: "drinks", label: "Drinks", plural: "drinks", image: "/images/menu/drinks.webp", alt: "Drinks: pitchers of punch and lemonade, bottled water on ice, and cups" },
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
  /** Optional extra line under attire. null = nothing shown. */
  attireNote: null as string | null,
  dishRule: "Every family brings a finger-food dish (plus serving utensils for it)",
  /** Shown with the dish rule. */
  giftRule: "Plus one small gift for game prizes",
  /** What the hosts are covering. */
  paperGoods:
    "The Washingtons have the plates, cups, napkins, forks, and spoons covered. Bring your dish in something disposable or easy to clean, plus whatever serving utensils it needs (tongs, serving spoon, etc.), so nobody's stuck washing dishes on Christmas Eve.",
  toneLine: "fun and festive",

  /**
   * Suggested max per dish category. It's a soft limit: when it's reached the tile
   * says "Covered!" and nudges folks elsewhere, but nobody gets blocked.
   * null = no limit.
   */
  categoryLimits: {
    meats: 4,
    sides: 4,
    chips: 3,
    desserts: 4,
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
