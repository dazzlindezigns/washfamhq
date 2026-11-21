"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { PublicData } from "./types";

/**
 * Tiny client store for the public data (RSVP cards, dish tiles, games).
 * Server Components send the first snapshot; the LivePoller keeps it fresh.
 */
let current: PublicData | null = null;
const listeners = new Set<() => void>();
let inflight: Promise<PublicData | null> | null = null;

function emit() {
  for (const l of listeners) l();
}

export function seedLiveData(data: PublicData) {
  if (!current || data.generatedAt > current.generatedAt || (!current.ok && data.ok)) {
    current = data;
    emit();
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLiveData(initial: PublicData): PublicData {
  const snap = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  useEffect(() => {
    seedLiveData(initial);
  }, [initial]);
  if (!snap) return initial;
  return snap.generatedAt >= initial.generatedAt || !initial.ok ? snap : initial;
}

/** Store-only hook for components that render before any data arrives (e.g. the RSVP form). */
export function useLiveDataMaybe(): PublicData | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

export function refreshLiveData(): Promise<PublicData | null> {
  if (inflight) return inflight;
  inflight = fetch("/api/public", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as PublicData;
      // Fresh fetches always win.
      current = data.ok || !current ? data : { ...current, generatedAt: data.generatedAt };
      emit();
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/* ---------- Cross-section events ---------- */

export type ClaimDetail = { category?: string };
export const CLAIM_EVENT = "xmas:claim-dish";
export const FOCUS_CARD_EVENT = "xmas:focus-card";
export const EDIT_EVENT = "xmas:edit-rsvp";

export function claimDish(category?: string) {
  window.dispatchEvent(new CustomEvent<ClaimDetail>(CLAIM_EVENT, { detail: { category } }));
}

export function focusCard(id: string) {
  window.dispatchEvent(new CustomEvent<{ id: string }>(FOCUS_CARD_EVENT, { detail: { id } }));
}

/* ---------- "My RSVP" (this device) ---------- */

export type MyRsvp = { id: string; token: string; familyName: string };
const MY_KEY = "xmas-my-rsvp";
const MY_EVENT = "xmas:my-rsvp";

export function readMyRsvp(): MyRsvp | null {
  try {
    const raw = window.localStorage.getItem(MY_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.id === "string" && typeof v.token === "string" ? (v as MyRsvp) : null;
  } catch {
    return null;
  }
}

export function writeMyRsvp(v: MyRsvp | null) {
  try {
    if (v) window.localStorage.setItem(MY_KEY, JSON.stringify(v));
    else window.localStorage.removeItem(MY_KEY);
  } catch {
    /* private mode etc. */
  }
  window.dispatchEvent(new Event(MY_EVENT));
}

let myCache: { raw: string | null; value: MyRsvp | null } = { raw: null, value: null };

function getMySnapshot(): MyRsvp | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(MY_KEY);
  } catch {
    raw = null;
  }
  if (raw !== myCache.raw) myCache = { raw, value: readMyRsvp() };
  return myCache.value;
}

function subscribeMy(cb: () => void) {
  window.addEventListener(MY_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MY_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useMyRsvp(): MyRsvp | null {
  return useSyncExternalStore(subscribeMy, getMySnapshot, () => null);
}
