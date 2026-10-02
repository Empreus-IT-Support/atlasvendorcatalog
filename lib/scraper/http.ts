const UA =
  process.env.SCRAPER_USER_AGENT ??
  "EmpreusCatalogBot/0.1 (+https://empreus.com.au; ag@empreus.com.au)";

const lastHit = new Map<string, number>();

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch with a per-host minimum delay, timeout and a clear UA. */
export async function politeFetch(url: string, delayMs = 1500, accept = "text/html,application/xhtml+xml,application/xml") {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + delayMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());

  const res = await fetch(url, {
    headers: { "user-agent": UA, accept, "accept-language": "en-AU,en;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  return res;
}

export async function fetchText(url: string, delayMs?: number): Promise<{ status: number; text: string }> {
  const res = await politeFetch(url, delayMs);
  return { status: res.status, text: res.ok ? await res.text() : "" };
}
