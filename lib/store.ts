import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import vendorSeed from "../data/vendors.json";
import type { ScrapedProduct, Vendor } from "./types";

let client: SupabaseClient | null = null;

/** Returns null when Supabase env is missing -> callers fall back to local files. */
export function db(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return (client ??= createClient(url, key, { auth: { persistSession: false } }));
}

const hash = (p: ScrapedProduct) =>
  createHash("sha1").update(JSON.stringify([p.name, p.sku, p.mpn, p.description, p.specs, p.image_urls])).digest("hex");

/** Download images into Supabase Storage; returns [{source, path, url}]. */
async function mirrorImages(vendorSlug: string, p: ScrapedProduct) {
  const sb = db();
  if (!sb) return [];
  const out: { source: string; path: string; url: string }[] = [];
  for (const [i, src] of p.image_urls.slice(0, 6).entries()) {
    try {
      const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5_000_000) continue;
      const ext = type.split("/")[1].split(";")[0].replace("jpeg", "jpg");
      const key = createHash("sha1").update(p.source_url).digest("hex").slice(0, 16);
      const path = `${vendorSlug}/${key}-${i}.${ext}`;
      const { error } = await sb.storage.from("product-images").upload(path, buf, { contentType: type, upsert: true });
      if (error) continue;
      out.push({ source: src, path, url: sb.storage.from("product-images").getPublicUrl(path).data.publicUrl });
    } catch {
      /* skip unreachable image */
    }
  }
  return out;
}

export async function saveProduct(vendor: Vendor, p: ScrapedProduct): Promise<void> {
  const sb = db();
  if (!sb) {
    mkdirSync("data/out", { recursive: true });
    appendFileSync(`data/out/${vendor.slug}.jsonl`, JSON.stringify(p) + "\n");
    return;
  }
  const images = await mirrorImages(vendor.slug, p);
  const { error } = await sb
    .from("products")
    .upsert(
      { vendor_id: vendor.id, ...p, images, content_hash: hash(p), scraped_at: new Date().toISOString() },
      { onConflict: "vendor_id,source_url" },
    );
  if (error) throw new Error(error.message);
}

/** With a slug: that vendor. Without: enabled vendors only, or everything when includeDisabled. */
export async function listVendors(onlySlug?: string, includeDisabled = false): Promise<Vendor[]> {
  const sb = db();
  if (!sb) {
    return (vendorSeed.vendors as Partial<Vendor>[])
      .map((v) => ({ ...v, config: v.config ?? {}, enabled: v.enabled ?? false }) as Vendor)
      .filter((v) => (onlySlug ? v.slug === onlySlug : includeDisabled || v.enabled));
  }
  let q = sb.from("vendors").select("*").order("name");
  if (onlySlug) q = q.eq("slug", onlySlug);
  else if (!includeDisabled) q = q.eq("enabled", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Vendor[];
}

export function resetLocalOutput(slug: string) {
  mkdirSync("data/out", { recursive: true });
  writeFileSync(`data/out/${slug}.jsonl`, "");
}
