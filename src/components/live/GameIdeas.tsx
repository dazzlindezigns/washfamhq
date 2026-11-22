"use client";

import { useId, useState } from "react";
import { forgetMyIdea, refreshLiveData, rememberMyIdea, useLiveData, useMyIdeas } from "@/lib/live-store";
import { MAX_GAME_LINKS } from "@/lib/schema";
import type { GameIdea, PublicData } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { DataError } from "./LiveBits";

const NAME_KEY = "xmas-idea-name";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function linkName(url: string, label?: string | null) {
  if (label) return label;
  const h = hostOf(url);
  if (/youtube\.com|youtu\.be/.test(h)) return "YouTube video";
  if (/tiktok\.com/.test(h)) return "TikTok video";
  if (/instagram\.com/.test(h)) return "Instagram video";
  if (/facebook\.com|fb\.watch/.test(h)) return "Facebook video";
  return h;
}

/* ---------------- Card ---------------- */

function IdeaCard({ idea, mine, onEdit }: { idea: GameIdea; mine: { token: string } | null; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const long = idea.how_to_play.length > 260 || idea.how_to_play.split("\n").length > 5;

  async function remove() {
    if (!mine || !window.confirm(`Remove "${idea.title}" from the game ideas?`)) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/game-ideas/${idea.id}`, { method: "DELETE", headers: { "x-edit-token": mine.token } }).catch(() => null);
    setBusy(false);
    if (!res || (!res.ok && res.status !== 404)) {
      setErr("Couldn't remove it right now. Try again in a sec.");
      return;
    }
    forgetMyIdea(idea.id);
    await refreshLiveData();
  }

  return (
    <article id={`idea-${idea.id}`} className="flex flex-col rounded-[var(--radius-card)] border-2 border-gold/70 bg-black/30 p-5 text-cream">
      <div className="flex items-start justify-between gap-3">
        <h4 className="break-words font-display text-2xl uppercase tracking-wide text-gold-light">{idea.title}</h4>
        {mine ? <span className="shrink-0 rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold uppercase text-coal">Yours</span> : null}
      </div>
      {idea.shared_by ? <p className="text-sm text-cream/90">Shared by {idea.shared_by}</p> : null}

      <h5 className="mt-3 text-sm font-semibold uppercase tracking-wider text-gold-light">How to play</h5>
      <p className={`mt-1 whitespace-pre-line break-words leading-relaxed text-white ${long && !open ? "line-clamp-5" : ""}`}>{idea.how_to_play}</p>
      {long ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 min-h-11 self-start font-semibold text-gold-light underline underline-offset-4">
          {open ? "Show less" : "Read the whole thing"}
        </button>
      ) : null}

      {idea.links.length > 0 ? (
        <>
          <h5 className="mt-3 text-sm font-semibold uppercase tracking-wider text-gold-light">Watch how it&rsquo;s played</h5>
          <ul className="mt-2 flex flex-wrap gap-2">
            {idea.links.map((l, i) => (
              <li key={`${l.url}-${i}`}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-gold/70 bg-wine-deep px-4 text-sm font-semibold text-white hover:bg-wine"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="max-w-[14rem] truncate">{linkName(l.url, l.label)}</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {mine ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gold/30 pt-3">
          <button type="button" onClick={onEdit} className="min-h-11 rounded-full border-2 border-gold/70 px-4 text-sm font-semibold text-gold-light hover:bg-white/10">
            Edit
          </button>
          <button type="button" onClick={remove} disabled={busy} className="min-h-11 rounded-full border-2 border-white/40 px-4 text-sm font-semibold text-cream hover:bg-white/10 disabled:opacity-50">
            {busy ? "Removing…" : "Remove"}
          </button>
          {err ? (
            <p role="alert" className="w-full text-sm font-semibold text-gold-light">
              {err}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/* ---------------- Editor ---------------- */

type LinkRow = { url: string; label: string };
type Draft = { title: string; howToPlay: string; links: LinkRow[]; sharedBy: string; website: string };

function emptyDraft(): Draft {
  let name = "";
  try {
    name = window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    /* ignore */
  }
  return { title: "", howToPlay: "", links: [{ url: "", label: "" }], sharedBy: name, website: "" };
}

function IdeaEditor({
  editing,
  onClose,
}: {
  editing: { idea: GameIdea; token: string } | null;
  onClose: (savedId?: string) => void;
}) {
  const uid = useId();
  const [draft, setDraft] = useState<Draft>(() =>
    editing
      ? {
          title: editing.idea.title,
          howToPlay: editing.idea.how_to_play,
          links: editing.idea.links.length ? editing.idea.links.map((l) => ({ url: l.url, label: l.label ?? "" })) : [{ url: "", label: "" }],
          sharedBy: editing.idea.shared_by ?? "",
          website: "",
        }
      : emptyDraft(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setLink = (i: number, patch: Partial<LinkRow>) =>
    setDraft((d) => ({ ...d, links: d.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addLink = () => setDraft((d) => (d.links.length >= MAX_GAME_LINKS ? d : { ...d, links: [...d.links, { url: "", label: "" }] }));
  const removeLink = (i: number) =>
    setDraft((d) => ({ ...d, links: d.links.length === 1 ? [{ url: "", label: "" }] : d.links.filter((_, j) => j !== i) }));

  // Server errors index only the non-empty links, so map them back to the rows on screen.
  const filledIdx = draft.links.map((l, i) => (l.url.trim() ? i : -1)).filter((i) => i >= 0);
  const linkErr = (rowIdx: number) => {
    const n = filledIdx.indexOf(rowIdx);
    return n >= 0 ? errors[`links.${n}.url`] ?? errors[`links.${n}.label`] : undefined;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const local: Record<string, string> = {};
    if (!draft.title.trim()) local.title = "What's the game called?";
    if (!draft.howToPlay.trim()) local.howToPlay = "Tell us how to play. Short and sweet is fine.";
    if (Object.keys(local).length) {
      setErrors(local);
      document.getElementById(`${uid}-${local.title ? "title" : "howToPlay"}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/game-ideas/${editing.idea.id}` : "/api/game-ideas", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json", ...(editing ? { "x-edit-token": editing.token } : {}) },
        body: JSON.stringify(draft),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.fieldErrors) setErrors(body.fieldErrors);
        setFormError(body?.error ?? "Something glitched. Your idea is still here, so try again in a sec.");
        return;
      }
      if (!editing && body.id && body.editToken) rememberMyIdea({ id: body.id, token: body.editToken });
      try {
        if (draft.sharedBy.trim()) window.localStorage.setItem(NAME_KEY, draft.sharedBy.trim());
      } catch {
        /* ignore */
      }
      await refreshLiveData();
      if (editing) {
        onClose(editing.idea.id);
      } else {
        setSaved(true);
        setDraft({ ...emptyDraft(), sharedBy: draft.sharedBy });
      }
    } catch {
      setFormError("Your signal dropped the ball. Your idea is still here, so try again in a sec.");
    } finally {
      setSaving(false);
    }
  }

  const label = "block font-semibold text-ink";
  const errCls = "mt-1.5 text-sm font-semibold text-plaid";

  return (
    <div className="on-cream rounded-[var(--radius-card)] border-2 border-gold-deep bg-white p-5 text-ink shadow-xl sm:p-7">
      <h4 className="font-display text-2xl uppercase tracking-wide text-wine">{editing ? "Edit your game idea" : "Share a game idea"}</h4>

      {saved ? (
        <p role="status" className="pop-in mt-3 rounded-xl bg-pine/10 px-4 py-3 font-semibold text-pine-deep">
          Added to the board! Got another one? Go ahead, the form&rsquo;s ready.
        </p>
      ) : null}
      {formError ? (
        <p role="alert" className="mt-3 rounded-xl border-2 border-plaid/40 bg-plaid/5 px-4 py-3 font-semibold text-plaid">
          {formError}
        </p>
      ) : null}

      <form onSubmit={submit} noValidate className="mt-4 space-y-5">
        <div>
          <label htmlFor={`${uid}-title`} className={label}>
            Game name <span className="text-plaid">*</span>
          </label>
          <input
            id={`${uid}-title`}
            className="field mt-1.5"
            value={draft.title}
            onChange={(e) => {
              set("title", e.target.value);
              setSaved(false);
            }}
            placeholder="Family Feud, Pictionary, Saran Wrap Ball…"
            maxLength={80}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? `${uid}-title-err` : undefined}
          />
          {errors.title ? (
            <p id={`${uid}-title-err`} className={errCls}>
              {errors.title}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`${uid}-howToPlay`} className={label}>
            How do you play? <span className="text-plaid">*</span>
          </label>
          <textarea
            id={`${uid}-howToPlay`}
            className="field mt-1.5 min-h-32"
            value={draft.howToPlay}
            onChange={(e) => set("howToPlay", e.target.value)}
            placeholder="Teams, rules, what you need, how somebody wins…"
            maxLength={2000}
            rows={5}
            aria-invalid={!!errors.howToPlay}
            aria-describedby={`${uid}-howToPlay-hint${errors.howToPlay ? ` ${uid}-howToPlay-err` : ""}`}
          />
          <p id={`${uid}-howToPlay-hint`} className="mt-1 text-sm text-ink-soft">
            Explain it like you&rsquo;re telling your auntie who&rsquo;s never played.
          </p>
          {errors.howToPlay ? (
            <p id={`${uid}-howToPlay-err`} className={errCls}>
              {errors.howToPlay}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className={label}>
            Video links <span className="font-normal text-ink-soft">(optional, add as many as you want)</span>
          </legend>
          <p className="mt-1 text-sm text-ink-soft">YouTube, TikTok, Instagram, whatever shows how it&rsquo;s played.</p>
          <ul className="mt-2 space-y-3">
            {draft.links.map((l, i) => {
              const e = linkErr(i);
              return (
                <li key={i} className="rounded-2xl border-2 border-[#e3d3b1] bg-cream/60 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <label htmlFor={`${uid}-link-${i}`} className="sr-only">
                        Link {i + 1}
                      </label>
                      <input
                        id={`${uid}-link-${i}`}
                        className="field"
                        type="url"
                        inputMode="url"
                        value={l.url}
                        onChange={(ev) => setLink(i, { url: ev.target.value })}
                        placeholder="https://youtube.com/…"
                        maxLength={500}
                        aria-invalid={!!e}
                        aria-describedby={e ? `${uid}-link-${i}-err` : undefined}
                      />
                      <label htmlFor={`${uid}-linklabel-${i}`} className="sr-only">
                        Name for link {i + 1} (optional)
                      </label>
                      <input
                        id={`${uid}-linklabel-${i}`}
                        className="field !min-h-11 text-sm"
                        value={l.label}
                        onChange={(ev) => setLink(i, { label: ev.target.value })}
                        placeholder="Name it (optional), like “Rules in 2 minutes”"
                        maxLength={60}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="flex h-[52px] w-11 shrink-0 items-center justify-center rounded-xl border-2 border-wine/50 text-wine hover:bg-wine/5"
                    >
                      <span className="sr-only">Remove link {i + 1}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                  {e ? (
                    <p id={`${uid}-link-${i}-err`} className={errCls}>
                      {e}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {draft.links.length < MAX_GAME_LINKS ? (
            <button type="button" onClick={addLink} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-wine px-4 font-semibold text-wine hover:bg-wine/5">
              <span aria-hidden="true">+</span> Add another link
            </button>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">That&rsquo;s {MAX_GAME_LINKS} links. Plenty!</p>
          )}
        </fieldset>

        <div>
          <label htmlFor={`${uid}-sharedBy`} className={label}>
            Your name <span className="font-normal text-ink-soft">(optional, so we know who to thank)</span>
          </label>
          <input
            id={`${uid}-sharedBy`}
            className="field mt-1.5"
            value={draft.sharedBy}
            onChange={(e) => set("sharedBy", e.target.value)}
            placeholder="Cousin Tasha"
            maxLength={80}
            autoComplete="name"
          />
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${uid}-website`}>Leave this empty</label>
          <input id={`${uid}-website`} tabIndex={-1} autoComplete="off" value={draft.website} onChange={(e) => set("website", e.target.value)} />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => onClose()} className="btn btn-ghost-ink">
            {saved ? "Done" : "Cancel"}
          </button>
          <button type="submit" className="btn btn-red sm:min-w-56" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add to the board"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Board ---------------- */

export function GameIdeas({ initial }: { initial: PublicData }) {
  const data = useLiveData(initial);
  const mine = useMyIdeas();
  const hydrated = useHydrated();
  const [editor, setEditor] = useState<null | "new" | string>(null);

  if (data.ideas === null) return <DataError what="game ideas board" />;
  const ideas = data.ideas;
  const tokenFor = (id: string) => mine.find((m) => m.id === id) ?? null;
  const editingIdea = editor && editor !== "new" ? ideas.find((i) => i.id === editor) : null;
  const editingToken = editingIdea ? tokenFor(editingIdea.id) : null;

  const close = (savedId?: string) => {
    setEditor(null);
    const target = savedId ? `idea-${savedId}` : "game-ideas-title";
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ block: "nearest" }), 50);
  };

  return (
    <div>
      {editor === null ? (
        <div className="flex justify-center">
          <button type="button" className="btn btn-gold" onClick={() => setEditor("new")} disabled={!hydrated}>
            + Share a game idea
          </button>
        </div>
      ) : editor === "new" ? (
        <IdeaEditor key="new" editing={null} onClose={close} />
      ) : editingIdea && editingToken ? (
        <IdeaEditor key={editingIdea.id} editing={{ idea: editingIdea, token: editingToken.token }} onClose={close} />
      ) : null}

      {ideas.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-gold/60 bg-black/25 px-5 py-4 text-center text-cream">
          No game ideas yet. Got one that always has the whole family hollering? Put it on the board.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <IdeaCard idea={idea} mine={tokenFor(idea.id)} onEdit={() => setEditor(idea.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GameIdeasSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading game ideas">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="skeleton h-44 w-full !rounded-[var(--radius-card)]" />
      ))}
    </div>
  );
}
