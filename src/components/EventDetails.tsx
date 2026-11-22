import { Suspense } from "react";
import { eventConfig } from "@/config/event";
import { getPublicData } from "@/lib/data";
import { hostPhone } from "@/lib/site";
import type { ResolvedSettings } from "@/lib/types";
import { SectionTitle } from "./SectionTitle";

const Icon = {
  when: (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3">
      <rect x="6" y="10" width="36" height="32" rx="4" />
      <path d="M6 19h36M15 5v9M33 5v9" strokeLinecap="round" />
      <path d="M13 26h5M21.5 26h5M30 26h5M13 33h5M21.5 33h5" strokeLinecap="round" />
    </svg>
  ),
  where: (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
      <path d="M5 23L24 7l19 16" strokeLinecap="round" />
      <path d="M10 19v22h28V19" />
      <path d="M24 37s-7-4.6-7-9.2a4 4 0 017-2.4 4 4 0 017 2.4C31 32.4 24 37 24 37z" fill="currentColor" stroke="none" />
    </svg>
  ),
  attire: (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
      <path d="M17 6l7 6 7-6 10 6-4 9-5-2v23H16V19l-5 2-4-9z" />
      <path d="M24 12v30M16 26h16M16 34h16" strokeOpacity=".6" />
    </svg>
  ),
  bring: (
    <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 34h36M9 34a15 15 0 0130 0" />
      <path d="M24 15v4M20 10c0-2 2-2 2-4M26 10c0-2 2-2 2-4" />
      <path d="M4 39h40" />
    </svg>
  ),
};

function Column({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-3 py-5 text-center sm:py-6">
      <span className="text-gold">{icon}</span>
      <h3 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">{label}</h3>
      <div className="mt-1 text-base leading-snug text-cream">{children}</div>
    </div>
  );
}

function DetailsCard({ s, live }: { s: ResolvedSettings; live: boolean }) {
  const phone = hostPhone();
  return (
    <>
      <div className="gold-border grid divide-y divide-gold/30 rounded-[var(--radius-card)] bg-wine-deep/95 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <Column icon={Icon.when} label="When">
          <p className="font-semibold">Christmas Eve</p>
          <p>{s.eventDateLabel}</p>
          <p className="mt-1 text-gold-light">{live ? (s.eventTime ?? "Time coming soon") : <span className="skeleton inline-block h-4 w-32 align-middle" />}</p>
        </Column>
        <Column icon={Icon.where} label="Where">
          {!live ? (
            <span className="skeleton mt-1 inline-block h-4 w-36" />
          ) : s.address ? (
            <>
              <p className="font-semibold">{/to be announced/i.test(s.locationLabel) ? "The VRBO" : s.locationLabel}</p>
              <p>{s.address}</p>
              {s.mapsUrl ? (
                <a
                  href={s.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-semibold text-gold-light underline underline-offset-4 hover:text-white"
                >
                  Open in Maps<span className="sr-only"> (opens in a new tab)</span> &rarr;
                </a>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-semibold">{s.locationLabel}</p>
              <p className="mt-1 text-sm text-gold-light">Address drops right here once it&rsquo;s booked.</p>
            </>
          )}
        </Column>
        <Column icon={Icon.attire} label="Attire">
          <p className="font-semibold">{s.attire}</p>
          {s.attireNote ? <p className="text-gold-light">{s.attireNote}</p> : null}
        </Column>
        <Column icon={Icon.bring} label="Bring">
          <p className="font-semibold">{s.dishRule}</p>
          <p className="text-gold-light">{s.giftRule}</p>
          <p className="mt-1 text-sm">Plates, cups, napkins, forks &amp; spoons are on us.</p>
          <a href="#dishes" className="mt-2 inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-gold-light underline underline-offset-4 hover:text-white">
            Claim yours &rarr;
          </a>
        </Column>
      </div>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center text-cream sm:flex-row">
        <a href="/images/flyer.jpg" download="Washingtons-Christmas-Eve-Game-Night-flyer.jpg" className="btn btn-ghost">
          Save the flyer
        </a>
        {phone ? (
          <a href={phone.sms} className="btn btn-ghost">
            Questions? Text {eventConfig.hostName}
          </a>
        ) : null}
      </div>
    </>
  );
}

async function LiveDetails() {
  const data = await getPublicData();
  return <DetailsCard s={data.settings} live />;
}

export function EventDetails({ fallbackSettings }: { fallbackSettings: ResolvedSettings }) {
  return (
    <section id="details" aria-labelledby="details-title" className="bg-buffalo-soft relative">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20" data-reveal>
        <SectionTitle id="details-title" kicker="Here's the rundown. Screenshot it, save it, tell your cousins.">
          Event Details
        </SectionTitle>
        <div className="mt-8">
          <Suspense fallback={<DetailsCard s={fallbackSettings} live={false} />}>
            <LiveDetails />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
