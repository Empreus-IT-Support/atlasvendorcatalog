import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { lookupByCodes } from "@/lib/query";

// GET /api/products/lookup?code=C42D2PA&code=210-ABCD   or   ?codes=C42D2PA,U17XYE   (max 50)
// Each code is matched against SKU or manufacturer part number, case-insensitively.
// Auth: Authorization: Bearer <SCRAPE_SECRET>
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const codes = [...p.getAll("code"), ...(p.get("codes")?.split(",") ?? [])];
  if (!codes.length) return NextResponse.json({ error: "pass ?code= or ?codes=" }, { status: 400 });
  const matches = await lookupByCodes(codes);
  return NextResponse.json({ matches });
}
