"use client";

import { useEffect, useState } from "react";

function parts(target: number, now: number) {
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  return {
    done: diff <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/**
 * Renders real numbers in the server HTML (computed from the server's clock), so there's
 * no flash of zeros. On hydration it renders the same values, then switches to the
 * device clock on the first tick.
 */
export function Countdown({ target, serverNow }: { target: string; serverNow: number }) {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const p = parts(targetMs, now);

  if (p.done) {
    return (
      <p className="font-display text-2xl tracking-wide text-gold-light sm:text-3xl" role="status">
        It&rsquo;s GAME NIGHT. Get in here!
      </p>
    );
  }

  const cells = [
    { v: p.days, l: p.days === 1 ? "Day" : "Days" },
    { v: p.hours, l: p.hours === 1 ? "Hour" : "Hours" },
    { v: p.minutes, l: p.minutes === 1 ? "Minute" : "Minutes" },
    { v: p.seconds, l: p.seconds === 1 ? "Second" : "Seconds" },
  ];

  return (
    <div>
      <p className="sr-only">
        {p.days} days, {p.hours} hours, and {p.minutes} minutes until Christmas Eve game night.
      </p>
      <ol aria-hidden="true" className="grid grid-cols-4 gap-2 sm:gap-3">
        {cells.map((c) => (
          <li key={c.l.replace(/s$/, "")} className="gold-border flex flex-col items-center rounded-2xl bg-wine-deep/85 px-1 py-2.5 sm:py-3">
            <span className="font-display text-3xl tabular-nums leading-none text-white sm:text-4xl">
              {String(c.v).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gold-light sm:text-xs">{c.l}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CountdownSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-4 gap-2 sm:gap-3">
      {["Days", "Hours", "Minutes", "Seconds"].map((l) => (
        <div key={l} className="gold-border flex flex-col items-center rounded-2xl bg-wine-deep/85 px-1 py-2.5 sm:py-3">
          <span className="skeleton block h-8 w-10 sm:h-9" />
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gold-light sm:text-xs">{l}</span>
        </div>
      ))}
    </div>
  );
}
