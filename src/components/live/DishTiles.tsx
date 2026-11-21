"use client";

import Image from "next/image";
import { claimDish, useLiveData } from "@/lib/live-store";
import { dishTiles, openCategories } from "@/lib/summary";
import type { PublicData } from "@/lib/types";
import { DataError } from "./LiveBits";

const MAX_NAMES = 4;

export function DishTiles({ initial }: { initial: PublicData }) {
  const data = useLiveData(initial);
  if (!data.ok) return <DataError tone="light" what="dish list" />;

  const tiles = dishTiles(data.rsvps, data.settings);
  const totalClaims = tiles.reduce((n, t) => n + t.count, 0);

  return (
    <>
      {totalClaims === 0 ? (
        <p className="mx-auto mb-6 max-w-xl rounded-2xl border-2 border-dashed border-gold-deep/70 bg-white/60 px-4 py-3 text-center text-ink">
          Nobody&rsquo;s claimed a dish yet. First pick gets bragging rights (and the best category).
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {tiles.map((t) => {
          const alternatives = t.covered ? openCategories(tiles, t.id).slice(0, 2) : [];
          return (
            <li
              key={t.id}
              className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border-2 border-gold-deep bg-white shadow-[0_10px_24px_-14px_rgba(60,20,10,0.6)]"
            >
              <div className="relative aspect-[2/1] w-full bg-cream-deep">
                <Image src={t.image} alt={t.alt} fill sizes="(min-width: 1024px) 360px, 48vw" className="object-cover" />
                {t.covered ? (
                  <span className="absolute right-2 top-2 rotate-3 rounded-full bg-pine px-3 py-1 font-display text-sm uppercase tracking-wide text-white shadow-lg">
                    Covered!
                  </span>
                ) : null}
              </div>
              <div className="bg-wine px-3 py-1.5 text-center">
                <h3 className="font-display text-xl uppercase tracking-wide text-white">{t.label}</h3>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-sm font-semibold text-wine">
                  {t.count === 0 ? "Be the first!" : `${t.count} claimed`}
                  {t.limit ? <span className="font-normal text-ink-soft"> &middot; we need about {t.limit}</span> : null}
                </p>
                {t.claims.length > 0 ? (
                  <ul className="space-y-1 text-sm leading-snug text-ink">
                    {t.claims.slice(0, MAX_NAMES).map((c) => (
                      <li key={c.id} className="break-words">
                        <span className="font-semibold">{c.family}</span>
                        {c.dish ? <>: {c.dish}</> : null}
                        {c.status === "maybe" ? <span className="text-ink-soft"> (maybe)</span> : null}
                      </li>
                    ))}
                    {t.claims.length > MAX_NAMES ? <li className="text-ink-soft">+ {t.claims.length - MAX_NAMES} more</li> : null}
                  </ul>
                ) : null}
                {t.covered ? (
                  <p className="text-sm text-pine-deep">
                    We&rsquo;re good on {t.plural}!
                    {alternatives.length ? (
                      <>
                        {" "}
                        Try{" "}
                        {alternatives.map((a, i) => (
                          <span key={a.id}>
                            {i > 0 ? " or " : ""}
                            <button type="button" onClick={() => claimDish(a.id)} className="font-semibold underline underline-offset-2">
                              {a.label}
                            </button>
                          </span>
                        ))}
                        ?
                      </>
                    ) : null}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => claimDish(t.id)}
                  className={`btn mt-auto w-full !min-h-11 !px-2 !text-base ${t.covered ? "btn-ghost-ink" : "btn-red"}`}
                >
                  {t.covered ? "Bring one anyway" : `Claim ${t.label}`}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function DishTilesSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Loading the dish list">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-[var(--radius-card)] border-2 border-gold-deep/50 bg-white">
          <div className="skeleton-ink aspect-[2/1] !rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton-ink h-5 w-2/3" />
            <div className="skeleton-ink h-4 w-full" />
            <div className="skeleton-ink h-11 w-full !rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
