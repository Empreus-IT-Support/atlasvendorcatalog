import { existsSync, readdirSync, readFileSync } from "node:fs";
import { db } from "./store";
import type { ScrapedProduct } from "./types";

export type ProductRow = ScrapedProduct & { id?: string; vendor: string; images?: { url: string }[]; scraped_at?: string };

const norm = (s: string) => s.trim().toLowerCase();

/** Match each code against SKU or manufacturer part number (case-insensitive). Returns matches per code. */
export async function lookupByCodes(codes: string[]): Promise<Record<string, ProductRow[]>> {
  const wanted = [...new Set(codes.map((c) => c.trim()).filter(Boolean))].slice(0, 50);
  const out: Record<string, ProductRow[]> = Object.fromEntries(wanted.map((c) => [c, []]));
  const sb = db();

  if (!sb) {
    const all = await searchProducts({ limit: 200 });
    for (const c of wanted) out[c] = all.filter((p) => p.sku && norm(p.sku) === norm(c) || p.mpn && norm(p.mpn) === norm(c));
    return out;
  }

  // ilike without wildcards is an exact, case-insensitive match; strip characters that would act as wildcards or break the filter.
  const safe = (c: string) => c.replace(/[%_,()*\\]/g, "");
  const filter = wanted.flatMap((c) => [`sku.ilike.${safe(c)}`, `mpn.ilike.${safe(c)}`]).join(",");
  const { data, error } = await sb.from("products").select("*, vendors!inner(slug,name)").or(filter);
  if (error) throw new Error(error.message);
  for (const { vendors, ...p } of (data ?? []) as any[]) {
    const row = { ...p, vendor: vendors.slug } as ProductRow;
    for (const c of wanted) if ((p.sku && norm(p.sku) === norm(c)) || (p.mpn && norm(p.mpn) === norm(c))) out[c].push(row);
  }
  return out;
}

export async function searchProducts(opts: { q?: string; vendor?: string; sku?: string; limit?: number; offset?: number }): Promise<ProductRow[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const sb = db();

  if (!sb) {
    // Local-file mode: read whatever the CLI scraper wrote to data/out.
    if (!existsSync("data/out")) return [];
    const rows: ProductRow[] = [];
    for (const f of readdirSync("data/out").filter((n) => n.endsWith(".jsonl"))) {
      const vendor = f.replace(".jsonl", "");
      if (opts.vendor && opts.vendor !== vendor) continue;
      for (const line of readFileSync(`data/out/${f}`, "utf8").split("\n").filter(Boolean)) rows.push({ ...JSON.parse(line), vendor });
    }
    const q = opts.q?.toLowerCase();
    return rows
      .filter((r) => (!opts.sku || r.sku === opts.sku || r.mpn === opts.sku) && (!q || r.name.toLowerCase().includes(q) || r.sku?.toLowerCase() === q))
      .slice(offset, offset + limit);
  }

  let query = sb.from("products").select("*, vendors!inner(slug,name)").order("scraped_at", { ascending: false }).range(offset, offset + limit - 1);
  if (opts.vendor) query = query.eq("vendors.slug", opts.vendor);
  if (opts.sku) query = query.or(`sku.eq.${opts.sku},mpn.eq.${opts.sku}`);
  if (opts.q) query = query.ilike("name", `%${opts.q.replace(/[%,]/g, " ")}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ vendors, ...p }: any) => ({ ...p, vendor: vendors.slug }));
}
