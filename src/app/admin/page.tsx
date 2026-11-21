import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { DISH_CATEGORIES } from "@/config/event";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { SELECT_FULL } from "@/lib/api";
import { resolveSettings, type SettingsRow } from "@/lib/settings";
import { categoryLabel } from "@/lib/summary";
import { getServiceClient } from "@/lib/supabase";
import type { RsvpRecord } from "@/lib/types";
import { logout } from "./actions";
import { DeleteButton, LoginForm, RsvpEditor, SettingsForm } from "./AdminForms";

export const metadata: Metadata = {
  title: "Admin · Game Night RSVPs",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="on-cream min-h-dvh bg-cream px-4 py-8 text-ink">{children}</main>;
}

const statusLabel = { coming: "Coming", maybe: "Maybe", cant: "Can't" } as const;
const statusClass = { coming: "bg-pine text-white", maybe: "bg-maybe text-coal", cant: "bg-ink-soft text-white" } as const;

async function AdminGate() {
  await connection();
  if (!adminConfigured()) {
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-script text-5xl text-wine">Admin</h1>
          <p className="mt-4">
            Set the <code className="rounded bg-white px-1">ADMIN_PASSCODE</code> environment variable to turn on this page.
          </p>
        </div>
      </Shell>
    );
  }
  if (!(await isAdmin())) {
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-script text-5xl text-wine">Host HQ</h1>
          <p className="mt-2">Hosts only. Put in the passcode.</p>
          <LoginForm />
        </div>
      </Shell>
    );
  }
  return <Dashboard />;
}

async function Dashboard() {
  const supabase = getServiceClient();
  if (!supabase) {
    return (
      <Shell>
        <p className="mx-auto max-w-lg text-center">
          Missing <code>NEXT_PUBLIC_SUPABASE_URL</code> or <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      </Shell>
    );
  }
  const [rsvpRes, settingsRes] = await Promise.all([
    supabase.from("xmas_rsvps").select(SELECT_FULL).order("created_at", { ascending: true }),
    supabase.from("xmas_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (rsvpRes.error) {
    return (
      <Shell>
        <p className="mx-auto max-w-lg text-center text-plaid">Couldn&rsquo;t load RSVPs: {rsvpRes.error.message}</p>
      </Shell>
    );
  }
  const rsvps = (rsvpRes.data ?? []) as RsvpRecord[];
  const row = (settingsRes.data ?? null) as SettingsRow | null;
  const settings = resolveSettings(row);

  const coming = rsvps.filter((r) => r.status === "coming");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const cant = rsvps.filter((r) => r.status === "cant");
  const sum = (list: RsvpRecord[], k: "adults" | "kids") => list.reduce((n, r) => n + (r[k] || 0), 0);
  const perCat = DISH_CATEGORIES.map((c) => ({
    ...c,
    count: rsvps.filter((r) => r.status !== "cant" && r.dish_category === c.id).length,
    limit: settings.categoryLimits[c.id],
  }));

  const stat = (l: string, v: React.ReactNode, sub?: string) => (
    <div className="rounded-xl border-2 border-gold-deep/60 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{l}</p>
      <p className="font-display text-3xl text-wine">{v}</p>
      {sub ? <p className="text-xs text-ink-soft">{sub}</p> : null}
    </div>
  );

  return (
    <Shell>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-script text-5xl text-wine">Host HQ</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="btn btn-ghost-ink !min-h-11 !text-base">
              View site
            </Link>
            <a href="/admin/export" className="btn btn-red !min-h-11 !text-base">
              Export CSV
            </a>
            <form action={logout}>
              <button type="submit" className="btn btn-ghost-ink !min-h-11 !text-base">
                Log out
              </button>
            </form>
          </div>
        </header>

        <section aria-labelledby="totals" className="mt-6">
          <h2 id="totals" className="font-display text-2xl uppercase text-ink">
            Totals
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {stat("Families coming", coming.length, `${maybe.length} maybe · ${cant.length} can't`)}
            {stat("People coming", sum(coming, "adults") + sum(coming, "kids"))}
            {stat("Adults", sum(coming, "adults"), `+${sum(maybe, "adults")} maybe`)}
            {stat("Kids", sum(coming, "kids"), `+${sum(maybe, "kids")} maybe`)}
            {stat("Total RSVPs", rsvps.length)}
            {stat("Bringing games", rsvps.filter((r) => r.status !== "cant" && r.game).length)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {perCat.map((c) => (
              <div key={c.id} className={`rounded-xl border-2 p-3 ${c.limit && c.count >= c.limit ? "border-pine bg-pine/10" : "border-gold-deep/60 bg-white"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{c.label}</p>
                <p className="font-display text-2xl text-wine">
                  {c.count}
                  {c.limit ? <span className="text-base text-ink-soft"> / {c.limit}</span> : null}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="settings-h" className="mt-10 rounded-2xl border-2 border-gold-deep/60 bg-white p-5">
          <h2 id="settings-h" className="font-display text-2xl uppercase text-ink">
            Event settings
          </h2>
          <p className="mb-4 text-sm text-ink-soft">Empty fields fall back to src/config/event.ts.</p>
          <SettingsForm
            eventTime={row?.event_time ?? null}
            startsAt={row?.starts_at ?? null}
            locationLabel={row?.location_label ?? null}
            address={row?.address ?? null}
            mapsUrl={row?.maps_url ?? null}
            limits={settings.categoryLimits}
          />
        </section>

        <section aria-labelledby="list-h" className="mt-10">
          <h2 id="list-h" className="font-display text-2xl uppercase text-ink">
            RSVPs ({rsvps.length})
          </h2>
          {rsvps.length === 0 ? <p className="mt-3">No RSVPs yet.</p> : null}
          <ul className="mt-3 space-y-3">
            {rsvps.map((r) => (
              <li key={r.id} className="rounded-2xl border-2 border-gold-deep/50 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">
                      {r.family_name}{" "}
                      <span className={`ml-1 rounded-full px-2 py-0.5 align-middle text-xs font-bold ${statusClass[r.status]}`}>{statusLabel[r.status]}</span>
                      {r.is_host ? <span className="ml-1 rounded-full bg-gold px-2 py-0.5 align-middle text-xs font-bold text-coal">Host</span> : null}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {r.contact_name} · {r.adults} adult{r.adults === 1 ? "" : "s"}, {r.kids} kid{r.kids === 1 ? "" : "s"}
                      {r.kids_ages ? ` (ages ${r.kids_ages})` : ""}
                    </p>
                    <p className="text-sm">
                      <strong>Dish:</strong> {[categoryLabel(r.dish_category), r.dish].filter(Boolean).join(": ") || "none"}
                      {r.game ? (
                        <>
                          {" "}
                          · <strong>Game:</strong> {r.game}
                        </>
                      ) : null}
                    </p>
                    {r.contact ? (
                      <p className="text-sm">
                        <strong>Contact:</strong>{" "}
                        <a className="text-wine underline" href={r.contact.includes("@") ? `mailto:${r.contact}` : `sms:${r.contact.replace(/[^\d+]/g, "")}`}>
                          {r.contact}
                        </a>
                      </p>
                    ) : null}
                    {r.note ? (
                      <p className="whitespace-pre-wrap text-sm">
                        <strong>Note:</strong> {r.note}
                      </p>
                    ) : null}
                    <p className="text-xs text-ink-soft">
                      RSVP&rsquo;d {new Date(r.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" })} CT
                      {r.updated_at && r.updated_at !== r.created_at ? " · edited" : ""}
                    </p>
                  </div>
                  <DeleteButton id={r.id} name={r.family_name} />
                </div>
                <details className="mt-3">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-wine underline underline-offset-4">Edit</summary>
                  <div className="mt-3">
                    <RsvpEditor r={r} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="add-h" className="mt-10 rounded-2xl border-2 border-dashed border-gold-deep/60 bg-white p-5">
          <details>
            <summary id="add-h" className="inline-flex min-h-11 cursor-pointer items-center font-display text-2xl uppercase text-ink">
              + Add a family manually
            </summary>
            <p className="mb-3 text-sm text-ink-soft">For the folks who RSVP by phone call (you know who you are).</p>
            <RsvpEditor />
          </details>
        </section>
      </div>
    </Shell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-center">Loading Host HQ&hellip;</p>
        </Shell>
      }
    >
      <AdminGate />
    </Suspense>
  );
}
