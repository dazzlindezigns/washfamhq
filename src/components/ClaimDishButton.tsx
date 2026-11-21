"use client";

import { claimDish } from "@/lib/live-store";

export function ClaimDishButton() {
  return (
    <button type="button" className="btn btn-red !px-8 !text-xl" onClick={() => claimDish()}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M7 3v8a2 2 0 01-2 2M7 3v8a2 2 0 002 2M7 13v8M5 3v6M9 3v6M17 3c-2 2-2 6 0 8v10" />
      </svg>
      Claim a dish
    </button>
  );
}
