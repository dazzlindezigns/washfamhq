"use client";

import { useLiveData } from "@/lib/live-store";
import { gamesBeingBrought } from "@/lib/summary";
import type { PublicData } from "@/lib/types";
import { DataError } from "./LiveBits";

export function GamesList({ initial }: { initial: PublicData }) {
  const data = useLiveData(initial);
  if (!data.ok) return <DataError what="game list" />;
  const games = gamesBeingBrought(data.rsvps);
  if (games.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-gold/60 bg-black/25 px-5 py-4 text-cream">
        No games claimed yet. Got Uno, Spades, Taboo, or something we&rsquo;ve never heard of? Add it to your RSVP and
        bring your best trash talk.
      </p>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {games.map((g) => (
        <li key={g.id} className="flex items-start gap-3 rounded-xl border border-gold/40 bg-black/25 px-4 py-3 text-cream">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0 text-gold">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
            <circle cx="8" cy="8" r="1.8" fill="#4a070c" />
            <circle cx="16" cy="16" r="1.8" fill="#4a070c" />
            <circle cx="12" cy="12" r="1.8" fill="#4a070c" />
          </svg>
          <span>
            <span className="font-semibold text-white">{g.game}</span>
            <span className="block text-sm text-cream/90">
              from {g.family}
              {g.status === "maybe" ? " (maybe)" : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GamesListSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-busy="true" aria-label="Loading the game list">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="skeleton h-16 w-full" />
      ))}
    </div>
  );
}
