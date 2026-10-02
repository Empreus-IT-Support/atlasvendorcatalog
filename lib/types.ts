export type VendorConfig = {
  /** Sitemap URLs (or sitemap index URLs) to discover product pages from. */
  sitemaps?: string[];
  /** Only URLs matching this regex are treated as product pages. */
  productUrlPattern?: string;
  /** Explicit product URLs (used when no sitemap exists). */
  seedUrls?: string[];
  /** CSS selectors overriding generic extraction. */
  selectors?: {
    name?: string;
    sku?: string;
    mpn?: string;
    description?: string;
    specRows?: string; // each match contains a label + value, split by specLabel/specValue
    specLabel?: string;
    specValue?: string;
    images?: string;
  };
  /** Only image URLs matching this regex are kept (drops marketing banners, video thumbnails). */
  imagePattern?: string;
  /** Delay between requests to the same host (ms). Default 1500. */
  delayMs?: number;
  /** Max product pages per run. Default 50. */
  maxPages?: number;
};

export type Vendor = {
  id?: string;
  slug: string;
  name: string;
  website?: string | null;
  category: string;
  enabled: boolean;
  config: VendorConfig;
};

export type ScrapedProduct = {
  source_url: string;
  name: string;
  sku: string | null;
  mpn: string | null;
  gtin: string | null;
  brand: string | null;
  description: string | null;
  specs: Record<string, string>;
  image_urls: string[];
};
