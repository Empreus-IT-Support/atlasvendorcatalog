import { XMLParser } from "fast-xml-parser";
import { gunzipSync } from "node:zlib";
import { politeFetch } from "./http";

const parser = new XMLParser({ ignoreAttributes: true });

async function fetchXml(url: string, delayMs: number): Promise<string> {
  const res = await politeFetch(url, delayMs, "application/xml,text/xml,*/*");
  if (!res.ok) return "";
  const buf = Buffer.from(await res.arrayBuffer());
  // Some servers serve .gz URLs already decompressed, so sniff the gzip magic bytes.
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  return (isGzip ? gunzipSync(buf) : buf).toString("utf8");
}

/** Walk a sitemap (index) and return page URLs matching `pattern`, up to `limit`. */
export async function discoverUrls(sitemaps: string[], pattern: RegExp | null, limit: number, delayMs: number): Promise<string[]> {
  const out: string[] = [];
  const queue = [...sitemaps];
  const seen = new Set<string>();
  while (queue.length && out.length < limit) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const xml = await fetchXml(sm, delayMs);
    if (!xml) continue;
    const doc = parser.parse(xml);
    const nested = [doc.sitemapindex?.sitemap].flat().filter(Boolean).map((s: { loc: string }) => s.loc);
    const pages = [doc.urlset?.url].flat().filter(Boolean).map((u: { loc: string }) => u.loc);
    // Nested sitemaps matching the product pattern are scanned first.
    for (const n of nested) (pattern?.test(n) ? queue.unshift(n) : queue.push(n));
    for (const p of pages) {
      if (out.length >= limit) break;
      if (!pattern || pattern.test(p)) out.push(p);
    }
  }
  return out;
}
