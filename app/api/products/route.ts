import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { searchProducts } from "@/lib/query";

// GET /api/products?q=&vendor=&sku=&limit=&offset=   (Authorization: Bearer <SCRAPE_SECRET>)
export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const products = await searchProducts({
    q: p.get("q") ?? undefined,
    vendor: p.get("vendor") ?? undefined,
    sku: p.get("sku") ?? undefined,
    limit: Number(p.get("limit") ?? 50),
    offset: Number(p.get("offset") ?? 0),
  });
  return NextResponse.json({ count: products.length, products });
}
