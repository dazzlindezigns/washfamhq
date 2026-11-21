"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during SSR + hydration, true once the client has taken over. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
