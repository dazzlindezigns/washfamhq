"use client";

import { useEffect, useState } from "react";
import { eventConfig } from "@/config/event";

const LINKS = [
  { href: "#home", label: eventConfig.nav.home },
  { href: "#details", label: eventConfig.nav.details },
  { href: "#who-all", label: eventConfig.nav.whoAll },
  { href: "#dishes", label: eventConfig.nav.dishes },
  { href: "#games", label: eventConfig.nav.games },
];

export function SiteNav({ brand }: { brand: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#home");

  // Highlight the section in view.
  useEffect(() => {
    const ids = [...LINKS.map((l) => l.href), "#rsvp"];
    const els = ids.map((id) => document.querySelector(id)).filter(Boolean) as Element[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-gold/40 bg-coal/92 backdrop-blur supports-[backdrop-filter]:bg-coal/80">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-coal"
      >
        Skip to the good stuff
      </a>
      <nav aria-label="Main" className="mx-auto flex h-[var(--nav-h)] max-w-6xl items-center justify-between gap-3 px-4">
        <a href="#home" className="shrink-0 rounded-lg">
          {brand}
          <span className="sr-only"> (back to top)</span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                aria-current={active === l.href ? "true" : undefined}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active === l.href ? "bg-plaid text-white" : "text-cream/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#rsvp" className="btn btn-red !min-h-[44px] !px-4 !text-base">
            {eventConfig.nav.rsvp}
          </a>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-gold/60 text-cream lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      <div id="mobile-menu" hidden={!open} className="border-t border-gold/30 bg-coal lg:hidden">
        <ul className="mx-auto grid max-w-6xl gap-1 px-4 py-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-4 text-lg font-medium text-cream hover:bg-white/10"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#rsvp" onClick={() => setOpen(false)} className="btn btn-red mt-1 w-full">
              {eventConfig.nav.rsvp}
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
