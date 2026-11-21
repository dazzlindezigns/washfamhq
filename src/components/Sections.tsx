import Image from "next/image";
import { Suspense } from "react";
import { eventConfig } from "@/config/event";
import { getPublicData } from "@/lib/data";
import { SectionTitle } from "./SectionTitle";
import { DishTiles, DishTilesSkeleton } from "./live/DishTiles";
import { GamesList, GamesListSkeleton } from "./live/GamesList";
import { GuestCarousel, GuestCarouselSkeleton } from "./live/GuestCarousel";
import { ClaimDishButton } from "./ClaimDishButton";

async function LiveDishTiles() {
  return <DishTiles initial={await getPublicData()} />;
}
async function LiveGuestCarousel() {
  return <GuestCarousel initial={await getPublicData()} />;
}
async function LiveGamesList() {
  return <GamesList initial={await getPublicData()} />;
}

export function DishSignup() {
  return (
    <section id="dishes" aria-labelledby="dishes-title" className="bg-paper on-cream">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20" data-reveal>
        <SectionTitle
          id="dishes-title"
          tone="light"
          kicker="Help us build an amazing spread! Claim your dish so we don't end up with nine desserts and no entrée. (Although… no. We need the entrée.)"
        >
          Dish Signup
        </SectionTitle>
        <div className="mt-8">
          <Suspense fallback={<DishTilesSkeleton />}>
            <LiveDishTiles />
          </Suspense>
        </div>
        <div className="mt-8 flex justify-center">
          <ClaimDishButton />
        </div>
      </div>
    </section>
  );
}

export function WhoAll() {
  return (
    <section id="who-all" aria-labelledby="who-all-title" className="bg-buffalo relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/50" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl py-14 sm:py-20" data-reveal>
        <div className="px-4">
          <SectionTitle id="who-all-title" kicker="See who already said they're coming, what they're bringing, and keep up with the crew.">
            Who All Over There?
          </SectionTitle>
        </div>
        <div className="mt-6">
          <Suspense fallback={<GuestCarouselSkeleton />}>
            <LiveGuestCarousel />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

export function Games() {
  return (
    <section id="games" aria-labelledby="games-title" className="bg-fireplace relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20" data-reveal>
        <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
          <Image
            src="/images/games/left.webp"
            alt="A wooden block tower game next to red dice"
            width={300}
            height={370}
            loading="lazy"
            className="mx-auto hidden w-40 rounded-2xl [mask-image:radial-gradient(closest-side,black_70%,transparent)] lg:block"
          />
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <h2 id="games-title" className="text-center font-script text-6xl leading-none text-gold-light script-glow sm:text-7xl md:text-left">
              Let the Games
              <br />
              Begin!
            </h2>
            <ul className="space-y-2 md:border-l-2 md:border-gold/50 md:pl-8">
              {eventConfig.gameChecklist.map((item) => (
                <li key={item} className="flex items-center gap-3 text-xl font-medium text-white">
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                    <rect x="1" y="1" width="22" height="22" rx="6" fill="#b0141e" stroke="#e9bc55" strokeWidth="1.5" />
                    <path d="M6 12.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Image
            src="/images/games/right.webp"
            alt="Playing cards and colorful game pawns on a game board"
            width={366}
            height={400}
            loading="lazy"
            className="mx-auto w-40 rounded-2xl [mask-image:radial-gradient(closest-side,black_70%,transparent)] lg:w-44"
          />
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <h3 className="text-center font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">Games folks are bringing</h3>
          <p className="mb-5 mt-1 text-center text-cream">Bringing a game? Add it in your RSVP and it shows up here.</p>
          <Suspense fallback={<GamesListSkeleton />}>
            <LiveGamesList />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
