import { readFileSync } from "node:fs";
import { db } from "../lib/store";

const sb = db();
if (!sb) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first");
const { vendors } = JSON.parse(readFileSync("data/vendors.json", "utf8"));
// Insert new vendors only; never overwrite config/enabled you've tuned in the DB.
const { error } = await sb.from("vendors").upsert(vendors, { onConflict: "slug", ignoreDuplicates: true });
if (error) throw error;
console.log(`Seeded ${vendors.length} vendors`);
