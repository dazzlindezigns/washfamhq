"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FOCUS_CARD_EVENT, useLiveData, useMyRsvp } from "@/lib/live-store";
import { categoryLabel, headcount, plural, visibleFamilies } from "@/lib/summary";
import type { PublicData, PublicRsvp } from "@/lib/types";
import { DataError } from "./LiveBits";

function PeopleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden="true" fill="currentColor">
      <circle cx="24" cy="8" r="6.5" />
      <circle cx="10" cy="11" r="5" />
      <circle cx="38" cy="11" r="5" />
      <path d="M12 31c0-7 5.4-12 12-12s12 5 12 12z" />
      <path d="M0 31c0-5.5 4.3-9.5 10-9.5 2.2 0 4.2.6 5.8 1.7A15.4 15.4 0 0010.7 31z" />
      <path d="M48 31c0-5.5-4.3-9.5-10-9.5-2.2 0-4.2.6-5.8 1.7A15.4 15.4 0 0137.3 31z" />
    </svg>
  );
}

function StatusBadge({ status }: { status: PublicRsvp["status"] }) {
  if (status === "coming") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/80 bg-pine px-3 py-1 text-sm font-bold text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
        Coming!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/80 bg-maybe px-3 py-1 text-sm font-bold text-coal">
      <span aria-hidden="true">?</span> Maybe
    </span>
  );
}

function FamilyCard({ r, mine, highlight }: { r: PublicRsvp; mine: boolean; highlight: boolean }) {
  const cat = categoryLabel(r.dish_category);
  const bringing = r.is_host && !r.dish && !cat ? "Hosting duties (and all the love)" : [cat, r.dish].filter(Boolean).join(": ") || "TBD";
  return (
    <article
      id={`family-${r.id}`}
      aria-label={`${r.family_name}: ${r.status === "coming" ? "coming" : "maybe"}`}
      className={`gold-border relative flex h-full flex-col items-center rounded-[var(--radius-card)] bg-gradient-to-b from-plaid to-wine-deep px-4 pb-5 pt-4 text-center text-white ${
        highlight ? "card-highlight" : ""
      }`}
    >
      {r.is_host ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-coal shadow">
          Your hosts
        </span>
      ) : mine ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-coal shadow">
          That&rsquo;s you!
        </span>
      ) : null}
      <PeopleIcon className="mt-2 h-8 w-12 text-white/90" />
      <h3 className="mt-1 break-words font-script text-3xl leading-tight text-gold-light">{r.family_name}</h3>
      <div className="mt-2">
        <StatusBadge status={r.status} />
      </div>
      <dl className="mt-3 space-y-1 text-[15px]">
        <div>
          <dt className="inline font-semibold">Guests: </dt>
          <dd className="inline">{r.guest_count}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Bringing: </dt>
          <dd className="inline break-words">{bringing}</dd>
        </div>
      </dl>
    </article>
  );
}

export function GuestCarousel({ initial }: { initial: PublicData }) {
  const data = useLiveData(initial);
  const my = useMyRsvp();
  const scroller = useRef<HTMLUListElement>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  const families = data.ok ? visibleFamilies(data.rsvps) : [];

  useEffect(() => {
    updateEdges();
  }, [families.length, updateEdges]);

  useEffect(() => {
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      const tryScroll = (attempt = 0) => {
        const card = document.getElementById(`family-${id}`);
        const el = scroller.current;
        if (!card || !el) {
          if (attempt < 10) setTimeout(() => tryScroll(attempt + 1), 300);
          return;
        }
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("who-all")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        const li = card.parentElement as HTMLElement;
        el.scrollTo({ left: li.offsetLeft - el.offsetLeft - 16, behavior: reduce ? "auto" : "smooth" });
        setHighlightId(id);
        setTimeout(() => setHighlightId(null), 3600);
      };
      tryScroll();
    };
    window.addEventListener(FOCUS_CARD_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_CARD_EVENT, onFocus);
  }, []);

  if (!data.ok) return <DataError what="guest list" />;

  const h = headcount(data.rsvps);
  const scrollByCard = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? (card as HTMLElement).offsetWidth + 16 : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };
  const onlyHosts = families.every((f) => f.is_host);

  return (
    <div>
      <p className="text-center font-display text-2xl uppercase tracking-wide text-white sm:text-3xl" aria-live="polite">
        {plural(h.comingFamilies, "family", "families")} <span className="text-gold" aria-hidden="true">&bull;</span>{" "}
        {plural(h.comingPeople, "person", "people")} outside
      </p>
      {h.maybeFamilies > 0 || h.cantFamilies > 0 ? (
        <p className="mt-1 text-center text-cream">
          {h.maybeFamilies > 0 ? `+ ${plural(h.maybeFamilies, "maybe", "maybes")} (${plural(h.maybePeople, "person", "people")})` : ""}
          {h.maybeFamilies > 0 && h.cantFamilies > 0 ? " · " : ""}
          {h.cantFamilies > 0 ? `${plural(h.cantFamilies, "family", "families")} sending love` : ""}
        </p>
      ) : null}

      {families.length === 0 || onlyHosts ? (
        <p className="mx-auto mt-6 max-w-xl rounded-2xl border-2 border-dashed border-gold/60 bg-black/25 px-5 py-4 text-center text-cream">
          {families.length === 0 ? "Nobody's on the list yet." : "So far it's just us hosts."} Don&rsquo;t make us play Spades by
          ourselves.{" "}
          <a href="#rsvp" className="font-semibold text-gold-light underline underline-offset-4">
            Be the first family on the board
          </a>
          .
        </p>
      ) : null}

      {families.length > 0 ? (
        <div className="relative mt-6">
          <ul
            ref={scroller}
            onScroll={updateEdges}
            tabIndex={0}
            aria-label="Families who RSVP'd. Swipe or scroll sideways to see more."
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-4 md:px-14"
          >
            {families.map((r) => (
              <li key={r.id} className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[calc((100%-3rem)/4)]">
                <FamilyCard r={r} mine={my?.id === r.id} highlight={highlightId === r.id} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={edges.start}
            className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gold bg-coal/80 text-white disabled:opacity-30 md:flex"
          >
            <span className="sr-only">Previous families</span>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={edges.end}
            className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gold bg-coal/80 text-white disabled:opacity-30 md:flex"
          >
            <span className="sr-only">More families</span>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {families.length > 1 ? (
            <p className="mt-1 text-center text-sm text-cream/90 md:hidden" aria-hidden="true">
              Swipe to see everybody &rarr;
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function GuestCarouselSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the guest list">
      <div className="skeleton mx-auto h-8 w-72" />
      <div className="mt-6 flex gap-4 overflow-hidden px-4 pt-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="gold-border h-60 w-[78%] shrink-0 rounded-[var(--radius-card)] bg-wine-deep/60 p-5 sm:w-[45%] lg:w-[calc((100%-3rem)/4)]">
            <div className="skeleton mx-auto h-8 w-12" />
            <div className="skeleton mx-auto mt-3 h-7 w-3/4" />
            <div className="skeleton mx-auto mt-3 h-7 w-24 !rounded-full" />
            <div className="skeleton mx-auto mt-4 h-4 w-20" />
            <div className="skeleton mx-auto mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
