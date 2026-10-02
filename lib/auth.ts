import { timingSafeEqual } from "node:crypto";

export function isAuthorized(req: Request): boolean {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // open locally, closed in prod without a secret
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
