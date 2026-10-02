-- Vendor catalog: scraped product enrichment data for Atlas.

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  website text,
  category text not null check (category in ('hardware', 'software', 'networking', 'peripherals', 'other')),
  enabled boolean not null default false,
  source text not null default 'arn',
  config jsonb not null default '{}'::jsonb,   -- sitemaps, productUrlPattern, selectors
  last_scraped_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  source_url text not null,
  name text not null,
  sku text,
  mpn text,
  gtin text,
  brand text,
  description text,
  specs jsonb not null default '{}'::jsonb,
  image_urls text[] not null default '{}',      -- original vendor URLs
  images jsonb not null default '[]'::jsonb,    -- [{ source, path, url }] mirrored to Storage
  content_hash text,
  first_seen_at timestamptz not null default now(),
  scraped_at timestamptz not null default now(),
  unique (vendor_id, source_url)
);

create index if not exists products_sku_idx on products (sku);
create index if not exists products_mpn_idx on products (mpn);
create index if not exists products_vendor_idx on products (vendor_id);
create index if not exists products_name_search on products using gin (to_tsvector('english', name));

create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  urls_found int not null default 0,
  products_saved int not null default 0,
  errors int not null default 0,
  notes text
);

-- Service role (scraper + API routes) bypasses RLS; nothing is exposed to anon.
alter table vendors enable row level security;
alter table products enable row level security;
alter table scrape_runs enable row level security;

-- Public bucket for mirrored product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
