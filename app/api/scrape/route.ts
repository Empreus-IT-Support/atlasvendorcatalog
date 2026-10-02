import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { scrapeVendor } from "@/lib/scraper/run";
import { listVendors } from "@/lib/store";

export const maxDuration = 300;

// Batch size per invocation stays small; the cron hits this on a schedule.
async function run(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const vendors = await listVendors(p.get("vendor") ?? undefined);
  const limit = Number(p.get("limit") ?? 10);
  const results = [];
  for (const v of vendors) results.push(await scrapeVendor(v, { limit }));
  return NextResponse.json({ results });
}

export const POST = run;
export const GET = run; // Vercel Cron issues GET with the CRON_SECRET bearer; set CRON_SECRET = SCRAPE_SECRET
