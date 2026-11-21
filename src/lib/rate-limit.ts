import "server-only";
import { createHash } from "node:crypto";
import { getServiceClient } from "./supabase";

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Store only a salted hash of the IP, never the IP itself. */
function bucketKey(scope: string, ip: string) {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "xmas";
  return `${scope}:${createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)}`;
}

/**
 * Returns true if allowed. Backed by the xmas_rate_limit_hit() function so limits hold
 * across serverless instances. Fails open (allows) if the DB check itself errors, so a
 * hiccup never blocks a real RSVP.
 */
export async function rateLimit(req: Request, scope: string, limit: number, windowSeconds: number) {
  const supabase = getServiceClient();
  if (!supabase) return true;
  const { data, error } = await supabase.rpc("xmas_rate_limit_hit", {
    p_bucket: bucketKey(scope, clientIp(req)),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[xmas] rate limit check failed:", error.message);
    return true;
  }
  return data === true;
}
