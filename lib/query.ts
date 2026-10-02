import { existsSync, readdirSync, readFileSync } from "node:fs";
import { db } from "./store";
import type { ScrapedProduct } from "./types";

export type ProductRow = ScrapedProduct & { id?: string; vendor: string; images?: { url: string }[]; scraped_at?: string };

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
