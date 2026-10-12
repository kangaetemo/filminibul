import { createHmac } from "node:crypto";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("Service key is missing");
const timestamp = String(Date.now());
const signature = createHmac("sha256", key).update(`catalog:${timestamp}`).digest("hex");
const response = await fetch("https://filminibul.com/api/catalog/revalidate", { method: "POST", headers: { "Content-Type": "application/json", "X-Catalog-Time": timestamp, "X-Catalog-Signature": signature }, body: "{}", signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Catalog revalidation failed (${response.status})`);
console.log("Catalog cache refreshed");
