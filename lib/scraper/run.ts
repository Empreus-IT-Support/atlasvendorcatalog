import { extractProduct } from "./extract";
import { fetchText } from "./http";
import { isAllowed, robotsSitemaps } from "./robots";
import { discoverUrls } from "./sitemap";
import { db, resetLocalOutput, saveProduct } from "../store";
import type { Vendor } from "../types";

export type RunResult = { vendor: string; found: number; saved: number; errors: number; skippedRobots: number };

export async function scrapeVendor(vendor: Vendor, opts: { limit?: number; log?: (m: string) => void } = {}): Promise<RunResult> {
  const log = opts.log ?? (() => {});
  const cfg = vendor.config ?? {};
  const delay = cfg.delayMs ?? 1500;
  const limit = opts.limit ?? cfg.maxPages ?? 50;
  const origin = new URL(vendor.website ?? cfg.seedUrls?.[0] ?? cfg.sitemaps?.[0] ?? "").origin;
  const result: RunResult = { vendor: vendor.slug, found: 0, saved: 0, errors: 0, skippedRobots: 0 };

  const pattern = cfg.productUrlPattern ? new RegExp(cfg.productUrlPattern) : null;
  const sitemaps = cfg.sitemaps?.length ? cfg.sitemaps : await robotsSitemaps(origin);
  const urls = [...(cfg.seedUrls ?? [])];
  if (sitemaps.length) urls.push(...(await discoverUrls(sitemaps, pattern, limit, delay)));
  const targets = [...new Set(urls)].slice(0, limit);
  result.found = targets.length;
  log(`${vendor.slug}: ${targets.length} candidate URLs`);

  if (!db()) resetLocalOutput(vendor.slug);

  for (const url of targets) {
    try {
      if (!(await isAllowed(url))) {
        result.skippedRobots++;
        continue;
      }
      const { status, text } = await fetchText(url, delay);
      if (!text) throw new Error(`HTTP ${status}`);
      const product = extractProduct(text, url, cfg);
      if (!product) continue;
      await saveProduct(vendor, product);
      result.saved++;
      log(`  saved ${product.sku ?? product.mpn ?? "-"} | ${product.name}`);
    } catch (e) {
      result.errors++;
      log(`  error ${url}: ${(e as Error).message}`);
    }
  }

  const sb = db();
  if (sb && vendor.id) {
    await sb.from("vendors").update({ last_scraped_at: new Date().toISOString() }).eq("id", vendor.id);
    await sb.from("scrape_runs").insert({
      vendor_id: vendor.id,
      finished_at: new Date().toISOString(),
      urls_found: result.found,
      products_saved: result.saved,
      errors: result.errors,
    });
  }
  return result;
}
