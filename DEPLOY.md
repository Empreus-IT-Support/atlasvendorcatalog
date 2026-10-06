# Go-live checklist

Waiting on: decision on which Supabase organisation (Osmia Pro vs a new project) and the project's keys.

## 1. Supabase
1. Create the project (Sydney region) in the chosen organisation.
2. SQL editor: run `supabase/migrations/0001_init.sql` (tables + public `product-images` bucket).
3. Project Settings > API: copy the Project URL and the `service_role` key (keep it server-side only).

## 2. Local check
1. Copy `.env.example` to `.env.local` and fill in the URL, service-role key and a long random `SCRAPE_SECRET`.
2. `npm run seed` loads the vendor list. Vendors with a verified config in `data/vendors.json` are seeded with `enabled: true`
   but seeding never overwrites rows that already exist, so to change a config later update the row in Supabase.
3. `npm run scrape -- epson 3` then check the `products` table and the `product-images` bucket.

## 3. Vercel
1. Import `Empreus-IT-Support/atlasvendorcatalog` (framework: Next.js).
2. Environment variables (Production): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SCRAPE_SECRET`,
   `CRON_SECRET` (same value as `SCRAPE_SECRET`), `SCRAPER_USER_AGENT`.
3. Deploy. Crons in `vercel.json` run one vendor per day, 10 pages each, newest and stalest URLs first.
   The scrape route needs a 300s function limit (Pro plan / Fluid compute).

## 4. Verify
- `curl -H "Authorization: Bearer $SCRAPE_SECRET" "https://<deployment>/api/scrape?vendor=epson&limit=3" -X POST`
- `curl -H "Authorization: Bearer $SCRAPE_SECRET" "https://<deployment>/api/products/lookup?codes=C31CK03108"`
- Admin UI at `/` (Basic auth, any username, password = `SCRAPE_SECRET`).

## 5. Hand to Atlas
Give Darko the base URL and `SCRAPE_SECRET`. Atlas calls `/api/products/lookup?codes=A,B,C` and matches on SKU or part number.
