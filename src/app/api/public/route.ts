import { fetchPublicData } from "@/lib/data";
import { json } from "@/lib/api";
import { connection } from "next/server";

/** Public, privacy-safe snapshot used by the live poller. Reads only the public view + settings. */
export async function GET() {
  await connection();
  const data = await fetchPublicData();
  return json(data, data.ok ? 200 : 503);
}
