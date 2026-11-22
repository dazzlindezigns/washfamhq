import "server-only";
import { categoryLabel } from "./summary";
import { siteUrl } from "./site";
import type { RsvpRecord } from "./types";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Emails the host when a NEW RSVP comes in. Fully optional:
 * only runs when RESEND_API_KEY and RSVP_NOTIFY_EMAIL are both set.
 */
export async function notifyNewRsvp(r: RsvpRecord) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.RSVP_NOTIFY_EMAIL;
  if (!key || !to) return;
  const from = process.env.RESEND_FROM || "Game Night RSVPs <onboarding@resend.dev>";

  const statusText = r.status === "coming" ? "is COMING" : r.status === "maybe" ? "is a MAYBE" : "can't make it (sending love)";
  const rows: [string, string | null][] = [
    ["Family", r.family_name],
    ["Name", r.contact_name],
    ["Status", r.status],
    ["Adults", String(r.adults)],
    ["Kids", String(r.kids)],
    ["Guests", (r.guests ?? []).map((g) => (g.type === "kid" ? `${g.name} (kid)` : g.name)).join(", ") || null],
    ["Dish", [categoryLabel(r.dish_category), r.dish].filter(Boolean).join(": ") || null],
    ["Contact", r.contact],
    ["Note", r.note],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;color:#2a1712">
      <h2 style="color:#6e0b12">${esc(r.family_name)} ${statusText}!</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .filter(([, v]) => v)
          .map(([k, v]) => `<tr><td style="font-weight:bold;vertical-align:top">${k}</td><td>${esc(v!).replace(/\n/g, "<br>")}</td></tr>`)
          .join("")}
      </table>
      <p><a href="${siteUrl()}/admin">Open the admin page</a></p>
    </div>`;
  const text = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject: `New RSVP: ${r.family_name} ${statusText} (${r.adults + r.kids} ${r.adults + r.kids === 1 ? "person" : "people"})`,
        html,
        text: `${r.family_name} ${statusText}!\n\n${text}\n\n${siteUrl()}/admin`,
      }),
    });
    if (!res.ok) console.error("[xmas] Resend error:", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[xmas] Resend request failed:", e);
  }
}
