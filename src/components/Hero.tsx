import Image from "next/image";
import { Suspense } from "react";
import { eventConfig } from "@/config/event";
import { getPublicData } from "@/lib/data";
import { formatEventDate } from "@/lib/settings";
import { Countdown, CountdownSkeleton } from "./Countdown";
import { Snow, Twinkles } from "./Snow";
import familyPhoto from "../../public/images/family.webp";

function SaveTheDatePill({ dateShort }: { dateShort: string }) {
  return (
    <p className="gold-pill inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full px-5 py-2.5 font-display text-lg uppercase tracking-wide sm:text-2xl">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
      <span>Save the date</span>
      <span aria-hidden="true" className="opacity-60">
        |
      </span>
      <span>{dateShort}</span>
    </p>
  );
}

async function LiveHeroBits() {
  const data = await getPublicData();
  return (
    <>
      <SaveTheDatePill dateShort={data.settings.eventDateShort} />
      <div className="mt-6 w-full max-w-md">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold-light">Countdown to Christmas Eve</p>
        <Countdown target={data.settings.countdownTarget} serverNow={Date.now()} />
      </div>
    </>
  );
}

function HeroBitsFallback() {
  return (
    <>
      <SaveTheDatePill dateShort={formatEventDate(eventConfig.eventDate).short} />
      <div className="mt-6 w-full max-w-md">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gold-light">Countdown to Christmas Eve</p>
        <CountdownSkeleton />
      </div>
    </>
  );
}

export function Hero() {
  return (
    <section id="home" aria-labelledby="hero-title" className="bg-fireplace relative isolate overflow-hidden">
      <Snow />
      <Twinkles />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-8 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pb-20 md:pt-12">
        {/* Title block (first on mobile) */}
        <div className="flex flex-col items-center text-center md:order-2">
          <h1 id="hero-title" className="flex flex-col items-center leading-none">
            <span className="font-script text-3xl text-gold-light script-glow sm:text-4xl">The Washingtons&rsquo;</span>
            <span className="mt-1 font-script text-[3.4rem] leading-[1.05] text-white [-webkit-text-stroke:2px_#b0141e] [paint-order:stroke_fill] drop-shadow-[0_4px_0_rgba(110,11,18,0.9)] sm:text-7xl">
              Christmas Eve
            </span>
            <span className="mt-2 font-display text-5xl uppercase tracking-wide text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] sm:text-6xl">
              Pajama
            </span>
            <span className="font-display text-5xl uppercase tracking-wide text-gold-grad drop-shadow-[0_3px_0_rgba(0,0,0,0.5)] sm:text-6xl">
              Game Night
            </span>
          </h1>
          <p className="mt-5 font-script text-5xl text-gold-light script-glow -rotate-2 sm:text-6xl">You&rsquo;re Invited!</p>
          <div className="mt-6 flex w-full flex-col items-center">
            <Suspense fallback={<HeroBitsFallback />}>
              <LiveHeroBits />
            </Suspense>
          </div>
          <div className="mt-7 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row">
            <a href="#rsvp" className="btn btn-red">
              {eventConfig.rsvpSectionTitle.replace(/!$/, "")}
            </a>
            <a href="#who-all" className="btn btn-ghost">
              See who all&rsquo;s coming
            </a>
          </div>
        </div>

        {/* Family photo */}
        <figure className="relative mx-auto w-full max-w-md md:order-1 md:max-w-none">
          <div className="gold-border overflow-hidden rounded-[1.75rem] bg-wine-deep">
            <Image
              src={familyPhoto}
              alt="The Washington family in matching red and black plaid pajamas, smiling together by the Christmas tree with game night snacks"
              priority
              placeholder="blur"
              sizes="(min-width: 768px) 520px, 92vw"
              className="h-auto w-full"
            />
          </div>
          <figcaption className="sr-only">The Washingtons, your hosts.</figcaption>
        </figure>
      </div>
    </section>
  );
}
