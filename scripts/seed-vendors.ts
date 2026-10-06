import { readFileSync } from "node:fs";
import { db } from "../lib/store";

const sb = db();
if (!sb) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first");
const { vendors } = JSON.parse(readFileSync("data/vendors.json", "utf8"));
// The table has no `note` column, so research notes ride along inside the config JSON.
const rows = vendors.map(({ note, config, ...v }: any) => ({ ...v, enabled: v.enabled ?? false, config: { ...(config ?? {}), ...(note ? { note } : {}) } }));
// Insert new vendors only; never overwrite config/enabled you've tuned in the DB.
const { error } = await sb.from("vendors").upsert(rows, { onConflict: "slug", ignoreDuplicates: true });
if (error) throw error;
const { count } = await sb.from("vendors").select("*", { count: "exact", head: true });
console.log(`Seeded from ${rows.length} entries; vendors in database: ${count}`);
