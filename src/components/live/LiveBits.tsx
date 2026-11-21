"use client";

import { useEffect, useState } from "react";
import { refreshLiveData } from "@/lib/live-store";

/** Keeps the cards and tiles fresh: every 20s while the tab is visible, and on focus. */
export function LivePoller({ intervalMs = 20000 }: { intervalMs?: number }) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") void refreshLiveData();
      }, intervalMs);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshLiveData();
    };
    start();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [intervalMs]);
  return null;
}

export function DataError({ tone = "dark", what }: { tone?: "dark" | "light"; what: string }) {
  const [busy, setBusy] = useState(false);
  const [failedAgain, setFailedAgain] = useState(false);
  return (
    <div
      role="alert"
      className={`mx-auto max-w-lg rounded-2xl border-2 p-6 text-center ${
        tone === "dark" ? "border-gold/60 bg-black/30 text-cream" : "border-wine/40 bg-white/70 text-ink"
      }`}
    >
      <p className="font-script text-3xl">Well, that&rsquo;s awkward.</p>
      <p className="mt-2">
        The {what} is being shy right now. {failedAgain ? "Still shy. Give it a minute and try again." : "Give it another try?"}
      </p>
      <button
        type="button"
        className={`btn mt-4 ${tone === "dark" ? "btn-gold" : "btn-red"}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await refreshLiveData();
          setBusy(false);
          setFailedAgain(!res || !res.ok);
        }}
      >
        {busy ? "Trying…" : "Try again"}
      </button>
    </div>
  );
}
