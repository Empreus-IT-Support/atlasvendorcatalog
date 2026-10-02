import { fetchText } from "./http";

type Rules = { disallow: string[]; allow: string[]; sitemaps: string[] };
const cache = new Map<string, Rules>();

async function load(origin: string): Promise<Rules> {
  const hit = cache.get(origin);
  if (hit) return hit;
  const rules: Rules = { disallow: [], allow: [], sitemaps: [] };
  try {
    const { text } = await fetchText(`${origin}/robots.txt`, 500);
    let applies = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, "").trim();
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).trim().toLowerCase();
      const val = line.slice(i + 1).trim();
      if (key === "user-agent") applies = val === "*";
      else if (key === "sitemap") rules.sitemaps.push(val);
      else if (applies && key === "disallow" && val) rules.disallow.push(val);
      else if (applies && key === "allow" && val) rules.allow.push(val);
    }
  } catch {
    /* unreachable robots.txt: treat as no rules */
  }
  cache.set(origin, rules);
  return rules;
}

// robots.txt pattern -> regex: '*' is a wildcard, trailing '$' anchors the end.
const toRegex = (p: string) => {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
};

export async function isAllowed(url: string): Promise<boolean> {
  const u = new URL(url);
  const r = await load(u.origin);
  const path = u.pathname + u.search;
  // longest matching rule wins; allow wins ties
  const best = (list: string[]) => list.filter((p) => toRegex(p).test(path)).sort((a, b) => b.length - a.length)[0]?.length ?? -1;
  return best(r.allow) >= best(r.disallow);
}

export async function robotsSitemaps(origin: string): Promise<string[]> {
  return (await load(origin)).sitemaps;
}
