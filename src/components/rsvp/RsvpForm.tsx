"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { DISH_CATEGORIES, type DishCategoryId } from "@/config/event";
import {
  CLAIM_EVENT,
  focusCard,
  refreshLiveData,
  useLiveDataMaybe,
  useMyRsvp,
  writeMyRsvp,
  type ClaimDetail,
} from "@/lib/live-store";
import { FIELD_STEP, fieldErrorsFrom, rsvpSchema, type FieldName } from "@/lib/schema";
import { dishTiles, openCategories } from "@/lib/summary";
import type { RsvpStatus } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { Confetti } from "./Confetti";

type FormState = {
  familyName: string;
  contactName: string;
  status: RsvpStatus | "";
  adults: number;
  kids: number;
  kidsAges: string;
  dishCategory: DishCategoryId | "";
  dish: string;
  game: string;
  contact: string;
  note: string;
  website: string;
};

const EMPTY: FormState = {
  familyName: "",
  contactName: "",
  status: "",
  adults: 1,
  kids: 0,
  kidsAges: "",
  dishCategory: "",
  dish: "",
  game: "",
  contact: "",
  note: "",
  website: "",
};

const STEP_TITLES = ["Who y'all are", "The dish", "Last thing"];

type Errors = Partial<Record<FieldName, string>>;
type Phase = "form" | "success";

function stepsFor(status: FormState["status"]) {
  return status === "cant" ? [0, 2] : [0, 1, 2];
}

export function RsvpForm({ hostName, hostSms }: { hostName: string; hostSms: string | null }) {
  const uid = useId();
  const live = useLiveDataMaybe();
  const my = useMyRsvp();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<{ id: string; token: string } | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const hydrated = useHydrated();
  const [lastSaved, setLastSaved] = useState<{ status: RsvpStatus; edited: boolean } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusStep = useRef(false);

  const steps = stepsFor(form.status);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const isLastStep = step === 2;

  const tiles = useMemo(() => (live?.ok ? dishTiles(live.rsvps, live.settings) : null), [live]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as FieldName]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goTo = useCallback((s: number) => {
    shouldFocusStep.current = true;
    setStep(s);
  }, []);

  useEffect(() => {
    if (!shouldFocusStep.current) return;
    shouldFocusStep.current = false;
    stepHeadingRef.current?.focus({ preventScroll: true });
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.6) {
      rootRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [step, phase]);

  const loadForEdit = useCallback(
    async (target: { id: string; token: string }) => {
      setLoadingEdit(true);
      setFormError(null);
      try {
        const res = await fetch(`/api/rsvp/${target.id}`, { headers: { "x-edit-token": target.token }, cache: "no-store" });
        if (res.status === 404) {
          writeMyRsvp(null);
          setFormError("Hmm, I can't find that RSVP anymore. Go ahead and fill it out fresh.");
          setMode("create");
          setEditTarget(null);
          setForm(EMPTY);
          setPhase("form");
          goTo(0);
          return;
        }
        if (!res.ok) throw new Error();
        const { rsvp } = await res.json();
        setForm({
          familyName: rsvp.family_name ?? "",
          contactName: rsvp.contact_name ?? "",
          status: rsvp.status ?? "",
          adults: rsvp.adults ?? 1,
          kids: rsvp.kids ?? 0,
          kidsAges: rsvp.kids_ages ?? "",
          dishCategory: rsvp.dish_category ?? "",
          dish: rsvp.dish ?? "",
          game: rsvp.game ?? "",
          contact: rsvp.contact ?? "",
          note: rsvp.note ?? "",
          website: "",
        });
        setMode("edit");
        setEditTarget(target);
        setErrors({});
        setPhase("form");
        goTo(0);
      } catch {
        setPhase("form");
        setFormError("Couldn't pull up your RSVP right now. Check your signal and try again.");
      } finally {
        setLoadingEdit(false);
      }
    },
    [goTo],
  );

  // "Claim a dish" from anywhere on the page opens the form at the dish step.
  useEffect(() => {
    const onClaim = (e: Event) => {
      const category = (e as CustomEvent<ClaimDetail>).detail?.category as DishCategoryId | undefined;
      setForm((f) => ({
        ...f,
        status: f.status === "" || f.status === "cant" ? "coming" : f.status,
        dishCategory: category ?? f.dishCategory,
      }));
      if (category) setErrors((er) => ({ ...er, dishCategory: undefined }));
      setPhase("form");
      shouldFocusStep.current = true;
      setStep(1);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("rsvp")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setTimeout(() => document.getElementById(`${uid}-dish`)?.focus({ preventScroll: true }), reduce ? 50 : 600);
    };
    window.addEventListener(CLAIM_EVENT, onClaim);
    return () => window.removeEventListener(CLAIM_EVENT, onClaim);
  }, [uid]);

  function validate(fieldsOnStep?: number) {
    const result = rsvpSchema.safeParse(form);
    if (result.success) return { ok: true as const, data: result.data, errs: {} as Errors };
    const all = fieldErrorsFrom(result.error);
    const errs: Errors = {};
    for (const [k, v] of Object.entries(all) as [FieldName, string][]) {
      if (fieldsOnStep === undefined || FIELD_STEP[k] === fieldsOnStep) errs[k] = v;
    }
    return { ok: Object.keys(errs).length === 0, data: null, errs };
  }

  function focusFirstError(errs: Errors) {
    const order: FieldName[] = ["familyName", "contactName", "status", "adults", "kids", "kidsAges", "dishCategory", "dish", "game", "contact", "note"];
    const first = order.find((k) => errs[k]);
    if (!first) return;
    setTimeout(() => {
      const el = document.getElementById(`${uid}-${first}`) as HTMLElement | null;
      el?.focus();
    }, 30);
  }

  function next() {
    const v = validate(step);
    if (!v.ok) {
      setErrors((e) => ({ ...e, ...v.errs }));
      focusFirstError(v.errs);
      return;
    }
    const nextStep = steps[stepIndex + 1];
    if (nextStep !== undefined) goTo(nextStep);
  }

  function back() {
    const prev = steps[stepIndex - 1];
    if (prev !== undefined) goTo(prev);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!isLastStep) {
      next();
      return;
    }
    const v = validate();
    if (!v.ok || !v.data) {
      setErrors(v.errs);
      const firstStep = Math.min(...Object.keys(v.errs).map((k) => FIELD_STEP[k as FieldName]));
      if (firstStep !== step) {
        setFormError(firstStep === 0 ? "Hold up, I still need a couple things up top." : "Almost! Fix the dish part first.");
        goTo(firstStep);
      }
      focusFirstError(v.errs);
      return;
    }

    setSubmitting(true);
    try {
      const editing = mode === "edit" && editTarget;
      const res = await fetch(editing ? `/api/rsvp/${editTarget.id}` : "/api/rsvp", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json", ...(editing ? { "x-edit-token": editTarget.token } : {}) },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.fieldErrors) {
          setErrors(body.fieldErrors);
          focusFirstError(body.fieldErrors);
        }
        if (res.status === 404 && editing) writeMyRsvp(null);
        setFormError(body?.error ?? "Something glitched on our end. Your info is still here, so try again in a sec.");
        return;
      }
      const id: string = body.id ?? editTarget?.id;
      const token: string = body.editToken ?? editTarget?.token;
      if (id && token) {
        writeMyRsvp({ id, token, familyName: form.familyName.trim() });
        setEditTarget({ id, token });
      }
      setLastSaved({ status: form.status as RsvpStatus, edited: mode === "edit" });
      setMode("edit");
      setPhase("success");
      shouldFocusStep.current = true;
      await refreshLiveData();
      if (form.status !== "cant" && id) setTimeout(() => focusCard(id), 2200);
    } catch {
      setFormError("Your signal (or our server) dropped the ball. Your info is still here, so try again in a sec.");
    } finally {
      setSubmitting(false);
    }
  }

  function startFresh() {
    setForm(EMPTY);
    setMode("create");
    setEditTarget(null);
    setErrors({});
    setFormError(null);
    setPhase("form");
    goTo(0);
  }

  const err = (k: FieldName) => errors[k];
  const describedBy = (k: FieldName, hint?: boolean) =>
    [hint ? `${uid}-${k}-hint` : null, err(k) ? `${uid}-${k}-err` : null].filter(Boolean).join(" ") || undefined;
  const errorText = (k: FieldName) =>
    err(k) ? (
      <p id={`${uid}-${k}-err`} className="mt-1.5 text-sm font-semibold text-plaid">
        {err(k)}
      </p>
    ) : null;

  /* ---------------- Success ---------------- */
  if (phase === "success" && lastSaved) {
    const s = lastSaved.status;
    return (
      <div ref={rootRef} className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-gold-deep bg-white p-6 text-center shadow-xl sm:p-10" role="status">
        <Confetti />
        <h3 ref={stepHeadingRef} tabIndex={-1} className="pop-in font-script text-5xl text-wine sm:text-6xl">
          {s === "cant" ? "Love received!" : lastSaved.edited ? "Updated! You're set." : "You're on the list!"}
        </h3>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink">
          {s === "coming" && "Can't wait to see y'all on Christmas Eve. PJs on, dish in hand, game face ready."}
          {s === "maybe" && "We penciled you in. Come back and lock it in when you know. We're rooting for a yes!"}
          {s === "cant" && "We'll miss you something serious. Thank you for sending love, and Merry Christmas!"}
        </p>
        {s !== "cant" ? <p className="mt-2 text-ink-soft">Taking you to your card in a sec&hellip;</p> : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" className="btn btn-red" onClick={() => editTarget && loadForEdit(editTarget)} disabled={loadingEdit}>
            {loadingEdit ? "Pulling it up…" : "Update my RSVP"}
          </button>
          {s !== "cant" ? (
            <a href="#who-all" className="btn btn-ghost-ink" onClick={() => editTarget && focusCard(editTarget.id)}>
              See who all&rsquo;s coming
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  /* ---------------- Form ---------------- */
  const coveredPick = tiles && form.dishCategory ? tiles.find((t) => t.id === form.dishCategory && t.covered) : null;
  const nudges = coveredPick && tiles ? openCategories(tiles, coveredPick.id).slice(0, 2) : [];
  const submitLabel =
    mode === "edit" ? "Save my changes" : form.status === "cant" ? "Send my love" : form.status === "maybe" ? "Pencil me in" : "Count me in!";

  return (
    <div ref={rootRef} className="rounded-[var(--radius-card)] border-2 border-gold-deep bg-white shadow-xl">
      {/* Returning visitor */}
      {my && mode === "create" ? (
        <div className="flex flex-col items-center gap-3 rounded-t-[calc(var(--radius-card)-2px)] bg-cream-deep px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-ink">
            <span className="font-semibold">Welcome back{my.familyName ? `, ${my.familyName}` : ""}!</span> You already RSVP&rsquo;d on this
            device.
          </p>
          <button type="button" className="btn btn-red !min-h-11 shrink-0 !text-base" disabled={loadingEdit} onClick={() => loadForEdit(my)}>
            {loadingEdit ? "Pulling it up…" : "Update my RSVP"}
          </button>
        </div>
      ) : null}
      {mode === "edit" ? (
        <div className="flex flex-col items-center gap-2 rounded-t-[calc(var(--radius-card)-2px)] bg-cream-deep px-5 py-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="font-semibold text-ink">Editing your RSVP. Change whatever you need.</p>
          <button type="button" onClick={startFresh} className="min-h-11 text-sm font-semibold text-wine underline underline-offset-4">
            RSVP for a different family instead
          </button>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="p-5 sm:p-8" aria-describedby={formError ? `${uid}-form-err` : undefined}>
        {/* Progress */}
        <ol className="mb-6 flex items-center gap-2" aria-label="RSVP steps">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                aria-current={s === step ? "step" : undefined}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm ${
                  i < stepIndex ? "bg-pine text-white" : s === step ? "bg-plaid text-white ring-2 ring-gold" : "bg-cream-deep text-ink-soft"
                }`}
              >
                {i + 1}
                <span className="sr-only">
                  {": "}
                  {STEP_TITLES[s]}
                  {i < stepIndex ? " (done)" : ""}
                </span>
              </span>
              {i < steps.length - 1 ? <span aria-hidden="true" className={`h-1 flex-1 rounded ${i < stepIndex ? "bg-pine" : "bg-cream-deep"}`} /> : null}
            </li>
          ))}
        </ol>

        <h3 ref={stepHeadingRef} tabIndex={-1} className="font-display text-3xl uppercase tracking-wide text-wine">
          <span className="sr-only">
            Step {stepIndex + 1} of {steps.length}:{" "}
          </span>
          {STEP_TITLES[step]}
        </h3>

        {formError ? (
          <p id={`${uid}-form-err`} role="alert" className="mt-4 rounded-xl border-2 border-plaid/40 bg-plaid/5 px-4 py-3 font-semibold text-plaid">
            {formError}
          </p>
        ) : null}

        {/* ---------- Step 1: who ---------- */}
        <div hidden={step !== 0} className="mt-5 space-y-5">
          <div>
            <label htmlFor={`${uid}-familyName`} className="block font-semibold text-ink">
              Family or group name <span className="text-plaid">*</span>
            </label>
            <input
              id={`${uid}-familyName`}
              className="field mt-1.5"
              value={form.familyName}
              onChange={(e) => set("familyName", e.target.value)}
              placeholder="The Johnson Crew"
              autoComplete="family-name"
              maxLength={80}
              aria-invalid={!!err("familyName")}
              aria-describedby={describedBy("familyName", true)}
              required
            />
            <p id={`${uid}-familyName-hint`} className="mt-1 text-sm text-ink-soft">
              This is what shows on your card in &ldquo;Who All Over There?&rdquo;
            </p>
            {errorText("familyName")}
          </div>

          <div>
            <label htmlFor={`${uid}-contactName`} className="block font-semibold text-ink">
              Your name <span className="text-plaid">*</span>
            </label>
            <input
              id={`${uid}-contactName`}
              className="field mt-1.5"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="First name is fine"
              autoComplete="given-name"
              maxLength={80}
              aria-invalid={!!err("contactName")}
              aria-describedby={describedBy("contactName")}
              required
            />
            {errorText("contactName")}
          </div>

          <fieldset>
            <legend className="font-semibold text-ink">
              So&hellip; are you coming? <span className="text-plaid">*</span>
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3" id={`${uid}-status`} tabIndex={-1}>
              {(
                [
                  { v: "coming", t: "Coming!", s: "Wouldn't miss it", cls: "peer-checked:border-pine peer-checked:bg-pine peer-checked:text-white" },
                  { v: "maybe", t: "Maybe", s: "Working on it", cls: "peer-checked:border-gold-deep peer-checked:bg-maybe peer-checked:text-coal" },
                  { v: "cant", t: "Can't make it", s: "Sending love", cls: "peer-checked:border-wine peer-checked:bg-wine peer-checked:text-white" },
                ] as const
              ).map((o) => (
                <label key={o.v} className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={o.v}
                    checked={form.status === o.v}
                    onChange={() => set("status", o.v)}
                    className="peer sr-only"
                    aria-describedby={describedBy("status")}
                  />
                  <span
                    className={`flex min-h-16 flex-col justify-center rounded-2xl border-2 border-[#c9ae7d] bg-[#fffdf8] px-4 py-2.5 text-ink transition-colors peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine ${o.cls}`}
                  >
                    <span className="font-display text-xl uppercase tracking-wide">{o.t}</span>
                    <span className="text-sm opacity-90">{o.s}</span>
                  </span>
                </label>
              ))}
            </div>
            {errorText("status")}
          </fieldset>

          {form.status !== "cant" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Stepper id={`${uid}-adults`} label="Adults" value={form.adults} onChange={(v) => set("adults", v)} error={err("adults")} errorId={`${uid}-adults-err`} />
              <Stepper id={`${uid}-kids`} label="Kids" value={form.kids} onChange={(v) => set("kids", v)} error={err("kids")} errorId={`${uid}-kids-err`} />
            </div>
          ) : null}

          {form.status !== "cant" && form.kids > 0 ? (
            <div>
              <label htmlFor={`${uid}-kidsAges`} className="block font-semibold text-ink">
                Kids&rsquo; ages <span className="font-normal text-ink-soft">(optional)</span>
              </label>
              <input
                id={`${uid}-kidsAges`}
                className="field mt-1.5"
                value={form.kidsAges}
                onChange={(e) => set("kidsAges", e.target.value)}
                placeholder="e.g. 4, 9, and 13"
                maxLength={120}
                aria-invalid={!!err("kidsAges")}
                aria-describedby={describedBy("kidsAges", true)}
              />
              <p id={`${uid}-kidsAges-hint`} className="mt-1 text-sm text-ink-soft">
                Helps us plan games and snacks for the little (and not so little) ones.
              </p>
              {errorText("kidsAges")}
            </div>
          ) : null}
        </div>

        {/* ---------- Step 2: dish + game ---------- */}
        <div hidden={step !== 1} className="mt-5 space-y-5">
          <ul className="space-y-1 rounded-2xl bg-cream-deep/70 px-4 py-3 text-sm text-ink">
            <li>
              <strong>Finger foods only.</strong> Think grab-and-go, no knife and fork required.
            </li>
            <li>Bring it in something disposable or easy to clean. We&rsquo;ve got the plates, cups, and napkins.</li>
            <li>
              <strong>Plus one small gift</strong> per family for the game prize table.
            </li>
          </ul>
          <fieldset>
            <legend className="font-semibold text-ink">
              Pick a dish category {form.status === "coming" ? <span className="text-plaid">*</span> : <span className="font-normal text-ink-soft">(optional for maybes)</span>}
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" id={`${uid}-dishCategory`} tabIndex={-1}>
              {DISH_CATEGORIES.map((c) => {
                const t = tiles?.find((x) => x.id === c.id);
                return (
                  <label key={c.id} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="dishCategory"
                      value={c.id}
                      checked={form.dishCategory === c.id}
                      onChange={() => set("dishCategory", c.id)}
                      className="peer sr-only"
                      aria-describedby={describedBy("dishCategory")}
                    />
                    <span className="flex min-h-16 flex-col justify-center rounded-2xl border-2 border-[#c9ae7d] bg-[#fffdf8] px-3 py-2 text-ink transition-colors peer-checked:border-plaid peer-checked:bg-plaid peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine">
                      <span className="font-display text-lg uppercase tracking-wide">{c.label}</span>
                      <span className="text-xs opacity-90">
                        {t ? (t.covered ? "Covered!" : t.count === 0 ? "Nobody yet" : `${t.count} claimed`) : " "}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errorText("dishCategory")}
            {coveredPick ? (
              <p className="mt-2 rounded-xl bg-pine/10 px-3 py-2 text-sm text-pine-deep" role="status">
                Heads up: we&rsquo;re covered on {coveredPick.plural}.{" "}
                {nudges.length ? <>{nudges.map((n) => n.label).join(" or ")} could use some love. </> : null}
                You can still bring it, though. Nobody&rsquo;s mad at extra.
              </p>
            ) : null}
          </fieldset>

          <div>
            <label htmlFor={`${uid}-dish`} className="block font-semibold text-ink">
              What are you bringing? {form.status === "coming" ? <span className="text-plaid">*</span> : <span className="font-normal text-ink-soft">(optional)</span>}
            </label>
            <input
              id={`${uid}-dish`}
              className="field mt-1.5"
              value={form.dish}
              onChange={(e) => set("dish", e.target.value)}
              placeholder="Wings, meatballs, spinach dip, cake pops…"
              maxLength={120}
              aria-invalid={!!err("dish")}
              aria-describedby={describedBy("dish")}
            />
            {errorText("dish")}
          </div>

        </div>

        {/* ---------- Step 3: contact + note ---------- */}
        <div hidden={step !== 2} className="mt-5 space-y-5">
          <div>
            <label htmlFor={`${uid}-contact`} className="block font-semibold text-ink">
              Phone or email <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              id={`${uid}-contact`}
              className="field mt-1.5"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
              placeholder="So I can reach you if plans change"
              autoComplete="tel"
              maxLength={160}
              aria-invalid={!!err("contact")}
              aria-describedby={describedBy("contact", true)}
            />
            <p id={`${uid}-contact-hint`} className="mt-1 text-sm text-ink-soft">
              Only {hostName} sees this. It never shows on the site.
            </p>
            {errorText("contact")}
          </div>

          <div>
            <label htmlFor={`${uid}-note`} className="block font-semibold text-ink">
              Anything else? <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <textarea
              id={`${uid}-note`}
              className="field mt-1.5 min-h-28"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Allergies, arrival time, a word of encouragement, your PJ color…"
              maxLength={1000}
              rows={3}
              aria-invalid={!!err("note")}
              aria-describedby={describedBy("note", true)}
            />
            <p id={`${uid}-note-hint`} className="mt-1 text-sm text-ink-soft">
              Private. Just between you and {hostName}.
            </p>
            {errorText("note")}
          </div>

          {/* Honeypot: hidden from people and screen readers */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${uid}-website`}>Leave this empty</label>
            <input id={`${uid}-website`} tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>

        {/* ---------- Nav buttons ---------- */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <button type="button" onClick={back} className="btn btn-ghost-ink">
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-red sm:min-w-56" disabled={submitting || !hydrated}>
            {submitting ? "Saving…" : isLastStep ? submitLabel : "Next"}
          </button>
        </div>

        {hostSms ? (
          <p className="mt-6 text-center text-sm text-ink-soft">
            Stuck?{" "}
            <a href={hostSms} className="font-semibold text-wine underline underline-offset-4">
              Text {hostName}
            </a>{" "}
            and it&rsquo;ll get fixed.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Stepper({
  id,
  label,
  value,
  onChange,
  error,
  errorId,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  errorId: string;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(40, Number.isFinite(n) ? Math.floor(n) : 0));
  const one = label === "Adults" ? "adult" : "kid";
  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <button
          type="button"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border-2 border-wine text-2xl font-bold text-wine disabled:opacity-40"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= 0}
          aria-label={`One less ${one}`}
          aria-controls={id}
        >
          &minus;
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={40}
          className="field text-center text-lg font-semibold"
          value={value}
          onChange={(e) => onChange(clamp(e.target.value === "" ? 0 : Number(e.target.value)))}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border-2 border-wine bg-wine text-2xl font-bold text-white disabled:opacity-40"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= 40}
          aria-label={`One more ${one}`}
          aria-controls={id}
        >
          +
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-semibold text-plaid">
          {error}
        </p>
      ) : null}
    </div>
  );
}
