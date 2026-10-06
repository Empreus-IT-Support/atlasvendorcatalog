import * as cheerio from "cheerio";
import type { ScrapedProduct, VendorConfig } from "../types";

type Json = Record<string, any>;

const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");
const first = (...v: (string | undefined | null)[]) => v.map(clean).find(Boolean) || null;

function jsonLdProducts($: cheerio.CheerioAPI): Json[] {
  const found: Json[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const t = n["@type"];
    if ((Array.isArray(t) ? t : [t]).some((x) => x === "Product" || x === "ProductGroup")) found.push(n);
    if (n["@graph"]) walk(n["@graph"]);
    if (n.hasVariant) walk(n.hasVariant);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      walk(JSON.parse(raw));
    } catch {
      try {
        // Some sites emit raw line breaks inside strings (invalid JSON); flatten control chars and retry.
        walk(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " ")));
      } catch {
        /* ignore malformed block */
      }
    }
  });
  return found;
}

function absUrl(src: string | undefined, base: string): string | null {
  if (!src || src.startsWith("data:")) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function imagesFromLd(ld: Json | undefined, base: string): string[] {
  if (!ld) return [];
  const raw = [ld.image].flat().filter(Boolean);
  return raw.map((i: any) => absUrl(typeof i === "string" ? i : i?.url, base)).filter((x): x is string => !!x);
}

function genericSpecs($: cheerio.CheerioAPI): Record<string, string> {
  const specs: Record<string, string> = {};
  const add = (k: string, v: string) => {
    k = clean(k).replace(/:$/, "");
    v = clean(v);
    if (k && v && k.length < 80 && v.length < 500 && !(k in specs)) specs[k] = v;
  };
  $("table tr").each((_, tr) => {
    const cells = $(tr).children("th,td");
    if (cells.length === 2) add($(cells[0]).text(), $(cells[1]).text());
  });
  $("dl").each((_, dl) => {
    $(dl)
      .children("dt")
      .each((__, dt) => add($(dt).text(), $(dt).next("dd").text()));
  });
  return specs;
}

export function extractProduct(html: string, url: string, cfg: VendorConfig = {}): ScrapedProduct | null {
  const $ = cheerio.load(html);
  const sel = cfg.selectors ?? {};
  const ld = jsonLdProducts($)[0];
  const offer = [ld?.offers].flat()[0] as Json | undefined;

  const name = first(sel.name && $(sel.name).first().text(), ld?.name, $('meta[property="og:title"]').attr("content"), $("h1").first().text());
  if (!name) return null;

  const id = (v: string | null) => (v ? v.replace(/^(sku|part number|product number|mpn)\s*:?\s*/i, "").trim() || null : null);
  const sku = id(first(sel.sku && $(sel.sku).first().text(), ld?.sku, offer?.sku));
  const mpn = id(first(sel.mpn && $(sel.mpn).first().text(), ld?.mpn));
  const gtin = first(ld?.gtin, ld?.gtin13, ld?.gtin12, ld?.gtin14, ld?.gtin8);
  // A page with no identifier and no structured data is almost certainly not a product page.
  if (!ld && !sku && !mpn && !Object.keys(sel).length) return null;

  const brand = first(typeof ld?.brand === "string" ? ld.brand : ld?.brand?.name);
  const description = first(
    sel.description && $(sel.description).first().text(),
    ld?.description,
    $('meta[property="og:description"]').attr("content"),
    $('meta[name="description"]').attr("content"),
  );

  let specs = genericSpecs($);
  if (sel.specRows) {
    specs = {};
    $(sel.specRows).each((_, row) => {
      const k = clean(sel.specLabel ? $(row).find(sel.specLabel).text() : $(row).children().first().text());
      const v = clean(sel.specValue ? $(row).find(sel.specValue).text() : $(row).children().last().text());
      if (k && v) specs[k] = v;
    });
  }
  // Explicit vendor selectors win; JSON-LD additionalProperty is often marketing copy.
  if (!sel.specRows) {
    for (const p of [ld?.additionalProperty].flat().filter(Boolean) as Json[]) {
      if (p.name && p.value != null) specs[clean(p.name)] = clean(String(p.value));
    }
  }

  for (const k of cfg.ignoreSpecs ?? []) for (const key of Object.keys(specs)) if (key.toLowerCase() === k.toLowerCase()) delete specs[key];

  const imgs = new Set<string>(imagesFromLd(ld, url));
  const og = absUrl($('meta[property="og:image"]').attr("content"), url);
  if (og) imgs.add(og);
  if (sel.images)
    $(sel.images).each((_, el) => {
      const u = absUrl($(el).attr("src") ?? $(el).attr("data-src") ?? $(el).attr("href"), url);
      if (u) imgs.add(u);
    });

  const keep = cfg.imagePattern ? new RegExp(cfg.imagePattern) : null;
  const image_urls = [...imgs].filter((u) => !keep || keep.test(u)).slice(0, 12);

  return { source_url: url, name, sku, mpn, gtin, brand, description, specs, image_urls };
}
