import { scrapeVendor } from "../lib/scraper/run";
import { listVendors } from "../lib/store";

// usage: npm run scrape -- <vendor-slug> [limit]
const [slug, limit] = process.argv.slice(2);
const vendors = await listVendors(slug);
if (!vendors.length) {
  console.error(slug ? `No vendor "${slug}"` : "No enabled vendors");
  process.exit(1);
}
for (const v of vendors) {
  const r = await scrapeVendor(v, { limit: limit ? Number(limit) : undefined, log: console.log });
  console.log(JSON.stringify(r));
}
