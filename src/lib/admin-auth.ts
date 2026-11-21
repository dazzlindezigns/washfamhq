import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "xmas_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

/** Signing key: ADMIN_SESSION_SECRET if set, otherwise derived from the passcode (so changing the passcode logs everyone out). */
function key(): Buffer | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  const pass = process.env.ADMIN_PASSCODE?.trim();
  if (secret) return createHash("sha256").update(`xmas-admin-secret:${secret}:${pass ?? ""}`).digest();
  if (pass) return createHash("sha256").update(`xmas-admin:${pass}`).digest();
  return null;
}

function sign(payload: string, k: Buffer) {
  return createHmac("sha256", k).update(payload).digest("base64url");
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSCODE?.trim());
}

export function checkPasscode(input: string) {
  const pass = process.env.ADMIN_PASSCODE?.trim();
  if (!pass) return false;
  const a = createHash("sha256").update(input.trim()).digest();
  const b = createHash("sha256").update(pass).digest();
  return timingSafeEqual(a, b);
}

export function makeSessionValue() {
  const k = key();
  if (!k) throw new Error("ADMIN_PASSCODE is not set");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `admin.${exp}`;
  return { value: `${payload}.${sign(payload, k)}`, maxAge: MAX_AGE };
}

export function verifySessionValue(value: string | undefined | null) {
  const k = key();
  if (!k || !value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, k));
  const given = Buffer.from(parts[2]!);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function isAdmin() {
  const jar = await cookies();
  return verifySessionValue(jar.get(ADMIN_COOKIE)?.value);
}
