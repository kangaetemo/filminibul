// Haftalık katalog güncellemesi script'lerinin ortak yardımcıları (bağımlılıksız; GitHub Actions'ta da çalışır).
// Yerel veri klasörlerine (data/) ihtiyaç duymaz: her şey Supabase + TMDB + OpenAI üzerinden.

import { appendFileSync } from "node:fs";
import { loadEnv, requireEnv } from "../export/loadEnv.mjs";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "../../src/lib/recommend/embeddingDoc.mjs";

loadEnv();
const [SUPABASE_URL, KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

export const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
export const flag = (name) => process.argv.includes(`--${name}`);

export async function sb(path, init = {}, attempt = 1) {
    let res;
    try {
        res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...HEADERS, ...init.headers } });
    } catch (err) {
        if (attempt >= 4) throw err;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return sb(path, init, attempt + 1);
    }
    if (res.status >= 500 && attempt < 4) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        return sb(path, init, attempt + 1);
    }
    if (!res.ok) throw new Error(`Supabase ${res.status} ${path.slice(0, 80)}: ${(await res.text()).slice(0, 300)}`);
    return res;
}

/** Tablo sorgusunun tüm sayfaları. `query` içinde order/limit/offset olmamalı. */
export async function sbAll(query, pageSize = 1000) {
    const rows = [];
    for (let offset = 0; ; offset += pageSize) {
        const page = await (await sb(`${query}&order=movie_id&limit=${pageSize}&offset=${offset}`)).json();
        rows.push(...page);
        if (page.length < pageSize) break;
    }
    return rows;
}

export async function sbUpsert(table, rows, onConflict = "movie_id") {
    await sb(`${table}?on_conflict=${onConflict}`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
    });
}

/** OpenAI embedding (film belgeleriyle aynı model/boyut). Girdi sırası korunur. */
export async function embedTexts(texts, attempt = 1) {
    const [apiKey] = requireEnv("OPENAI_API_KEY");
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, dimensions: EMBEDDING_DIMS }),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const body = await res.text();
        if (body.includes("insufficient_quota")) throw new Error(`OpenAI kotası yetersiz: ${body.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
        return embedTexts(texts, attempt + 1);
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()).data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Eşzamanlılık sınırlı map; sonuç sırası girdi sırasıyla aynı. */
export async function pool(items, concurrency, fn) {
    const out = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, async () => {
            while (next < items.length) {
                const i = next++;
                out[i] = await fn(items[i], i);
            }
        })
    );
    return out;
}

/** GitHub Actions çalıştırma özetine (ve konsola) yazar. */
export function summary(markdown) {
    console.log(markdown);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
}
