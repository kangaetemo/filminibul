// Upstash Vector index'indeki tüm vektörleri ve metadata'yı JSONL olarak indirir. Sadece okuma yapar.
//
// Kullanım:
//   node scripts/export/upstash_export.mjs

import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, requireEnv, ROOT } from "./loadEnv.mjs";

loadEnv();
const [URL, TOKEN] = requireEnv("UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN");

const OUT_DIR = resolve(ROOT, "data", "export", "upstash");
mkdirSync(OUT_DIR, { recursive: true });

async function call(endpoint, body) {
    const res = await fetch(`${URL}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(`${res.status} /${endpoint}: ${data.error ?? JSON.stringify(data)}`);
    return data.result;
}

async function main() {
    const info = await call("info");
    writeFileSync(resolve(OUT_DIR, "info.json"), JSON.stringify(info, null, 2));
    console.log(`📦 Upstash: ${info.vectorCount} vektör, boyut ${info.dimension}, ${info.similarityFunction}`);

    const outPath = resolve(OUT_DIR, "vectors.jsonl");
    writeFileSync(outPath, "");

    let cursor = "0";
    let count = 0;
    while (true) {
        const page = await call("range", { cursor, limit: 1000, includeMetadata: true, includeVectors: true });
        const vectors = page.vectors ?? [];
        if (vectors.length) {
            appendFileSync(outPath, vectors.map((v) => JSON.stringify(v)).join("\n") + "\n");
            count += vectors.length;
            process.stdout.write(`\r  ${count}/${info.vectorCount}`);
        }
        if (!page.nextCursor || page.nextCursor === cursor || vectors.length === 0) break;
        cursor = page.nextCursor;
    }
    console.log(`\n✅ ${outPath}`);
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
