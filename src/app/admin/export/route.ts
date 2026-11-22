import { isAdmin } from "@/lib/admin-auth";
import { SELECT_FULL } from "@/lib/api";
import { categoryLabel } from "@/lib/summary";
import { getServiceClient } from "@/lib/supabase";
import type { RsvpRecord } from "@/lib/types";

function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  const supabase = getServiceClient();
  if (!supabase) return new Response("Database not configured", { status: 503 });

  const { data, error } = await supabase.from("xmas_rsvps").select(SELECT_FULL).order("created_at", { ascending: true });
  if (error) return new Response(`Export failed: ${error.message}`, { status: 500 });

  const header = ["Family", "Contact name", "Status", "Adults", "Kids", "Kids' ages", "Dish category", "Dish", "Phone/email", "Note", "Host", "RSVP'd at", "Updated at"];
  const lines = (data as RsvpRecord[]).map((r) =>
    [
      r.family_name,
      r.contact_name,
      r.status,
      r.adults,
      r.kids,
      r.kids_ages,
      categoryLabel(r.dish_category),
      r.dish,
      r.contact,
      r.note,
      r.is_host ? "yes" : "",
      r.created_at,
      r.updated_at,
    ]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="game-night-rsvps-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
