"use client";

import { useActionState, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { DISH_CATEGORIES } from "@/config/event";
import type { RsvpRecord } from "@/lib/types";
import { deleteGameIdea, deleteRsvp, login, saveRsvp, saveSettings, type ActionState } from "./actions";

const input = "mt-1 w-full rounded-lg border-2 border-[#c9ae7d] bg-white px-3 py-2 text-base text-ink focus:border-wine focus:outline-none";
const label = "block text-sm font-semibold text-ink";

function Msg({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm font-semibold ${state.ok ? "text-pine-deep" : "text-plaid"}`}>
      {state.message}
    </p>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mx-auto mt-6 max-w-sm space-y-3">
      <label htmlFor="passcode" className={label}>
        Passcode
      </label>
      <input id="passcode" name="passcode" type="password" autoComplete="current-password" required className={input} autoFocus />
      <button type="submit" className="btn btn-red w-full" disabled={pending}>
        {pending ? "Checking…" : "Let me in"}
      </button>
      <Msg state={state} />
    </form>
  );
}

type SettingsProps = {
  eventTime: string | null;
  startsAt: string | null;
  locationLabel: string | null;
  address: string | null;
  mapsUrl: string | null;
  limits: Record<string, number | null>;
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsForm(p: SettingsProps) {
  const [state, action, pending] = useActionState(saveSettings, null);
  // Shown in the admin's local time, computed only on the client (avoids server/client time zone mismatch).
  const hydrated = useHydrated();
  const [edited, setStartsLocal] = useState<string | null>(null);
  const startsLocal = edited ?? (hydrated ? toLocalInput(p.startsAt) : "");
  const iso = startsLocal ? new Date(startsLocal).toISOString() : "";

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="event_time" className={label}>
          Time (as shown on the site)
        </label>
        <input id="event_time" name="event_time" defaultValue={p.eventTime ?? ""} placeholder="e.g. 6:00 PM until we fall asleep" className={input} />
        <p className="mt-1 text-xs text-ink-soft">Empty = &ldquo;Time coming soon&rdquo;.</p>
      </div>
      <div>
        <label htmlFor="starts_at" className={label}>
          Exact start (for the countdown)
        </label>
        <input id="starts_at" type="datetime-local" value={startsLocal} onChange={(e) => setStartsLocal(e.target.value)} className={input} />
        <input type="hidden" name="starts_at_iso" value={iso} />
        <p className="mt-1 text-xs text-ink-soft">Your local time. Empty = counts down to the start of Christmas Eve.</p>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="location_label" className={label}>
          Location line
        </label>
        <input id="location_label" name="location_label" defaultValue={p.locationLabel ?? ""} placeholder="At a VRBO. Location to be announced" className={input} />
      </div>
      <div>
        <label htmlFor="address" className={label}>
          Address
        </label>
        <input id="address" name="address" defaultValue={p.address ?? ""} placeholder="Empty until it's booked" className={input} />
        <p className="mt-1 text-xs text-ink-soft">When set, it shows publicly with a Maps link.</p>
      </div>
      <div>
        <label htmlFor="maps_url" className={label}>
          Maps link (optional)
        </label>
        <input id="maps_url" name="maps_url" type="url" defaultValue={p.mapsUrl ?? ""} placeholder="Auto-made from the address if empty" className={input} />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>Suggested max per dish category (empty = no limit)</legend>
        <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {DISH_CATEGORIES.map((c) => (
            <div key={c.id}>
              <label htmlFor={`limit_${c.id}`} className="block text-xs font-semibold text-ink-soft">
                {c.label}
              </label>
              <input
                id={`limit_${c.id}`}
                name={`limit_${c.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                defaultValue={p.limits[c.id] ?? ""}
                className={input}
              />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <button type="submit" className="btn btn-red" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function RsvpEditor({ r }: { r?: RsvpRecord }) {
  const [state, action, pending] = useActionState(saveRsvp, null);
  const k = r?.id ?? "new";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={r?.id ?? ""} />
      <div>
        <label htmlFor={`fam-${k}`} className={label}>
          Family name
        </label>
        <input id={`fam-${k}`} name="familyName" defaultValue={r?.family_name ?? ""} required className={input} />
      </div>
      <div>
        <label htmlFor={`name-${k}`} className={label}>
          Contact name
        </label>
        <input id={`name-${k}`} name="contactName" defaultValue={r?.contact_name ?? ""} required className={input} />
      </div>
      <div>
        <label htmlFor={`status-${k}`} className={label}>
          Status
        </label>
        <select id={`status-${k}`} name="status" defaultValue={r?.status ?? "coming"} className={input}>
          <option value="coming">Coming</option>
          <option value="maybe">Maybe</option>
          <option value="cant">Can&rsquo;t make it</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`adults-${k}`} className={label}>
            Adults
          </label>
          <input id={`adults-${k}`} name="adults" type="number" min={0} max={40} defaultValue={r?.adults ?? 1} className={input} />
        </div>
        <div>
          <label htmlFor={`kids-${k}`} className={label}>
            Kids
          </label>
          <input id={`kids-${k}`} name="kids" type="number" min={0} max={40} defaultValue={r?.kids ?? 0} className={input} />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`adultnames-${k}`} className={label}>
          Adult names <span className="font-normal text-ink-soft">(one per line)</span>
        </label>
        <textarea
          id={`adultnames-${k}`}
          name="adultNamesText"
          rows={3}
          defaultValue={(r?.guests ?? []).filter((g) => g.type === "adult").map((g) => g.name).join("\n")}
          className={input}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`kidnames-${k}`} className={label}>
          Kid names <span className="font-normal text-ink-soft">(one per line)</span>
        </label>
        <textarea
          id={`kidnames-${k}`}
          name="kidNamesText"
          rows={3}
          defaultValue={(r?.guests ?? [])
            .filter((g) => g.type === "kid")
            .map((g) => g.name)
            .join("\n")}
          className={input}
        />
        <p className="mt-1 text-xs text-ink-soft">If you type names, the Adults/Kids numbers update to match.</p>
      </div>
      <div>
        <label htmlFor={`cat-${k}`} className={label}>
          Dish category
        </label>
        <select id={`cat-${k}`} name="dishCategory" defaultValue={r?.dish_category ?? ""} className={input}>
          <option value="">None</option>
          {DISH_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`dish-${k}`} className={label}>
          Dish
        </label>
        <input id={`dish-${k}`} name="dish" defaultValue={r?.dish ?? ""} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`contact-${k}`} className={label}>
          Phone / email
        </label>
        <input id={`contact-${k}`} name="contact" defaultValue={r?.contact ?? ""} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`note-${k}`} className={label}>
          Note
        </label>
        <input id={`note-${k}`} name="note" defaultValue={r?.note ?? ""} className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" className="btn btn-red !min-h-11 !text-base" disabled={pending}>
          {pending ? "Saving…" : r ? "Save changes" : "Add family"}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function DeleteButton({ id, name, kind = "rsvp" }: { id: string; name: string; kind?: "rsvp" | "idea" }) {
  return (
    <form
      action={kind === "idea" ? deleteGameIdea : deleteRsvp}
      onSubmit={(e) => {
        const msg = kind === "idea" ? `Delete the game idea "${name}"?` : `Delete ${name}'s RSVP? This can't be undone.`;
        if (!window.confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="min-h-11 rounded-lg border-2 border-plaid px-3 text-sm font-semibold text-plaid hover:bg-plaid hover:text-white">
        Delete
      </button>
    </form>
  );
}
