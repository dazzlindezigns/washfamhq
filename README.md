# The Washingtons' Christmas Eve Pajama Game Night

The invite + RSVP site for **Thursday, December 24, 2026**. It's one page with a sticky anchor nav: Home · Event Details · Who All Over There? · Dish Signup · Games · **Count Me In** (that's the RSVP). There's also a passcode-protected `/admin`.

Built with Next.js 16 (App Router) and Tailwind 4, with Supabase for data and Resend for new-RSVP emails (optional). It deploys on Vercel.

---

## 1. Environment variables

Copy `.env.example` to `.env.local` for local dev. On Vercel, add these under Project → Settings → Environment Variables.

| Variable | Required? | What it's for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public anon key. It can only read the public view + settings |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server-only. RSVP saves, edits, and `/admin` |
| `ADMIN_PASSCODE` | **Yes** | Passcode for `/admin` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical URL for share previews, e.g. `https://gamenight.example.com` (no trailing slash). Falls back to the Vercel production URL |
| `HOST_PHONE` | Recommended | Your number for the "Text Dani" links. Empty = links hidden |
| `ADMIN_SESSION_SECRET` | Optional | Signs the admin cookie. If empty, a key is derived from `ADMIN_PASSCODE` (changing the passcode logs everyone out) |
| `RESEND_API_KEY` | Optional | Turns on the "new RSVP" email |
| `RSVP_NOTIFY_EMAIL` | Optional | Where the alert goes (comma-separate multiple) |
| `RESEND_FROM` | Optional | Sender, e.g. `Game Night <rsvp@yourdomain.com>` (must be a verified Resend domain). Defaults to Resend's test sender |

No secrets are committed. `.env*` is git-ignored except `.env.example`.

> Env vars are read at build time for some static parts (host phone, logo). After you change one on Vercel, **redeploy**.

## 2. Database (run the migrations in order)

1. `supabase/migrations/20261121000000_xmas_game_night.sql`: tables, view, RLS, host card
2. `supabase/migrations/20261122000000_xmas_menu_and_game_ideas.sql`: finger-food categories (Meats, Sides, Chips & Dip, Desserts, Drinks), prize-gift rule, drops the plaid note, and the Game Ideas board
3. `supabase/migrations/20261122010000_xmas_guest_names.sql`: guest names (shown publicly on each family's card) and the serving-utensils dish rule

Open Supabase → **SQL Editor** → paste each file → **Run**. All are idempotent, so running them again is safe. They only touch `xmas_`-prefixed objects and never your other apps' tables. Migration 2 moves any old dish claims onto the new categories (Entrée → Meats; Side/Salad/Fruit → Sides; Dessert → Desserts).

What it creates:

| Object | Purpose |
| --- | --- |
| `xmas_rsvps` | All RSVP data, including phone/email, notes, and the edit token. RLS is on, and anon/authenticated have **no** access |
| `xmas_public_rsvps` (view) | The only thing the public site reads: id, family name, guest names, status, guest count, dish. No contact info |
| `xmas_settings` | One row (`id = 1`) of event settings. Public read-only |
| `xmas_game_ideas` | Game ideas: name, how to play, video links, who shared it, edit token. Locked like RSVPs |
| `xmas_public_game_ideas` (view) | Public read of game ideas, minus the edit token |
| `xmas_rate_limits` + `xmas_rate_limit_hit()` | Rate limiting for the API routes. Service role only |
| `xmas_touch_updated_at()` | `updated_at` trigger |
| `xmas_settings_public_read` | RLS policy: anyone can read settings |

It also seeds one row for **The Washingtons** as the host card (7 adults). Adjust it in `/admin`.

Supabase's advisor may flag `xmas_public_rsvps` as a "security definer view." That's intentional: the view *is* the privacy whitelist, so it has to read the locked table on the public's behalf.

## 3. Deploy

1. Push this repo to GitHub.
2. In Vercel, import the repo (framework: Next.js, default build settings).
3. Add the env vars above, then deploy.
4. Once your domain is connected, set `NEXT_PUBLIC_SITE_URL` to it and redeploy so share previews use it.

Local dev: `npm install`, then `npm run dev`, then open http://localhost:3000.

## 4. Changing event details

There are two layers:

1. **`src/config/event.ts`** holds the defaults: title, date, time, location, attire, dish rule, tone line, dish categories + suggested max, nav/section names, and game checklist.
2. **The `xmas_settings` table** overrides the config. Any non-empty column wins.

The fast way is **`/admin` → Event settings**: set the time, the exact start (drives the countdown), the location line, the address (shows publicly with a Google Maps link), and the per-category limits. Changes show up on the next page load.

- Empty time shows "Time coming soon".
- Empty address shows "At a VRBO. Location to be announced".
- Dish limits are **soft**: at the limit, the tile says "Covered!" and nudges people to emptier categories, but nobody is blocked.
- To rename "Count Me In" (or any nav label), edit `nav` / `rsvpSectionTitle` in `src/config/event.ts`.
- **Logo:** save the WashFam HQ logo as `public/images/washfam-hq-logo.png` and it replaces the text wordmark in the nav and footer automatically.

## 5. Admin (`/admin`)

Go to `/admin` and enter `ADMIN_PASSCODE`. That sets a signed, httpOnly cookie for 14 days. Login attempts are rate-limited.

From there you can:
- See totals: families coming / maybe / can't, people, adults, kids, per-dish-category counts vs. limits
- See every RSVP with phone/email and notes; edit or delete any of them
- See and delete game ideas
- Add a family manually (for the phone-call RSVPs)
- Edit event settings
- **Export CSV** (opens fine in Excel and Google Sheets)

## How the privacy works

- Browsers never talk to Supabase directly. Public pages are rendered on the server with the **anon key**, which can only read `xmas_public_rsvps` + `xmas_settings`.
- RSVP create/edit goes through `/api/rsvp` (zod validation, honeypot field, DB-backed rate limit), which writes with the service-role key.
- Game ideas work the same way: anyone can add ideas with links, and only the device that added one (or `/admin`) can edit or remove it.
- Editing: each RSVP gets a random edit token stored in the guest's browser (localStorage), which unlocks "Update my RSVP" on that device. Without the token, nobody can read or change it.
- Guest names are public on purpose (they show on each family card). Phone, email, and notes are only visible in `/admin` and the CSV.
- The site is set to `noindex`, so it won't show up in search results.

## Live updates

The page renders fresh data on every visit. While it's open, it re-checks every 20 seconds (and when you come back to the tab), so new families and dish claims show up without a refresh.
