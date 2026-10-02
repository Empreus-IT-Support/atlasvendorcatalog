# Vendor Catalog

Add-on for atlascontrol.io. Scrapes vendor product pages (name, SKU, MPN, specs, images) into Supabase so Atlas can enrich products.

## How it works
- `data/vendors.json`: vendor list seeded from the ARN directory (security vendors excluded) plus per-vendor scrape config.
  A vendor is only scraped once `enabled: true` with a verified config (sitemap + `productUrlPattern` + optional CSS `selectors`).
- `lib/scraper/*`: robots.txt-aware, rate-limited (2s/host) crawler. Product URLs come from sitemaps, then generic extraction
  (JSON-LD Product, OpenGraph, spec tables) with per-vendor selector overrides.
- Storage: Supabase `vendors`, `products`, `scrape_runs` + public `product-images` bucket. Without Supabase env the CLI writes `data/out/<vendor>.jsonl`.
- `GET /api/products?q=&vendor=&sku=` (Bearer `SCRAPE_SECRET`) is what Atlas calls. `POST/GET /api/scrape?vendor=&limit=` runs a batch (Vercel cron daily).
- Admin UI at `/` and `/vendors` is behind Basic auth (password = `SCRAPE_SECRET`).

## Setup
1. Create a Supabase project, run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill it in.
3. `npm run seed` loads vendors. Then set each vendor's `enabled`/`config` in the DB (or keep `data/vendors.json` as the source and re-seed with updates).
4. `npm run scrape -- dell 10` to test a vendor locally. `npm run dev` for the UI (port 3000).
5. Deploy to Vercel, add the env vars, and set `CRON_SECRET` to the same value as `SCRAPE_SECRET`.

## Adding a vendor
Find its product sitemap (`/robots.txt`), pick a `productUrlPattern`, run `npm run scrape -- <slug> 3`, inspect `data/out/<slug>.jsonl`,
add `selectors` until name/SKU/specs look right, then set `enabled: true`.

## Known limits
- Lenovo (www.lenovo.com) returns 403 to our crawler (Akamai). Needs a partner feed or other permitted source; we do not evade bot protection.
- JS-rendered sites need a headless browser (Vercel Sandbox / Playwright), not built yet.
- Dell SKU is currently its internal config ID; real part numbers (e.g. 210-xxxx) live in the configurator and aren't captured yet.
