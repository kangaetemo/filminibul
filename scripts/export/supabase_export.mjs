// Supabase public tablolarını REST (PostgREST) üzerinden JSONL olarak indirir. Sadece okuma yapar.
//
// Kullanım:
//   node scripts/export/supabase_export.mjs --no-embeddings   # önce sadece metadata
//   node scripts/export/supabase_export.mjs                   # embedding'ler dahil
//   node scripts/export/supabase_export.mjs --table movies    # tek tablo
//
// Yarıda kesilirse aynı komutla tekrar çalıştır; kaldığı sayfadan devam eder.

import { mkdirSync, existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, requireEnv, ROOT } from "./loadEnv.mjs";

loadEnv();
const [SUPABASE_URL, KEY] = requireEnv("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

const args = process.argv.slice(2);
const NO_EMBEDDINGS = args.includes("--no-embeddings");
const ONLY_TABLE = args.includes("--table") ? args[args.indexOf("--table") + 1] : null;

const OUT_DIR = resolve(ROOT, "data", "export", "supabase");
mkdirSync(OUT_DIR, { recursive: true });

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function request(path, extraHeaders = {}, attempt = 1) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...HEADERS, ...extraHeaders } });
    if (!res.ok) {
        const body = await res.text();
        if (attempt < 4 && (res.status >= 500 || res.status === 429)) {
            console.warn(`  ⚠️ ${res.status}, tekrar deneniyor (${attempt})...`);
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            return request(path, extraHeaders, attempt + 1);
        }
        throw new Error(`${res.status} ${path}: ${body.slice(0, 500)}`);
    }
    return res;
}

function countLines(path) {
    if (!existsSync(path)) return 0;
    const text = readFileSync(path, "utf8");
    return text ? text.split("\n").filter(Boolean).length : 0;
}

function parseVector(value) {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

async function getSchema() {
    const res = await request("", { Accept: "application/openapi+json" });
    const spec = await res.json();
    const tables = {};
    for (const [name, def] of Object.entries(spec.definitions ?? {})) {
        const columns = Object.entries(def.properties ?? {}).map(([col, p]) => ({
            name: col,
            type: p.format ?? p.type,
            pk: (p.description ?? "").includes("<pk/>"),
        }));
        tables[name] = columns;
    }
    const rpcs = Object.keys(spec.paths ?? {})
        .filter((p) => p.startsWith("/rpc/"))
        .map((p) => p.slice(5));
    return { tables, rpcs };
}

async function exportTable(table, columns) {
    const vectorCols = columns.filter((c) => /vector/i.test(c.type ?? "")).map((c) => c.name);
    const plainCols = columns.filter((c) => !vectorCols.includes(c.name)).map((c) => c.name);
    const orderCol = columns.find((c) => c.pk)?.name ?? (plainCols.includes("id") ? "id" : plainCols[0]);
    const withVectors = !NO_EMBEDDINGS && vectorCols.length > 0;

    const mainPath = resolve(OUT_DIR, `${table}.jsonl`);
    const embPath = resolve(OUT_DIR, `${table}.embeddings.jsonl`);

    // Kaldığı yerden devam: iki dosya aynı satır sayısındaysa oradan başla, değilse baştan
    let offset = countLines(mainPath);
    if (withVectors && countLines(embPath) !== offset) offset = 0;
    if (offset === 0) {
        writeFileSync(mainPath, "");
        if (withVectors) writeFileSync(embPath, "");
    }

    const select = (withVectors ? [...plainCols, ...vectorCols] : plainCols).join(",");
    const pageSize = withVectors ? 200 : 1000;

    const head = await request(`${table}?select=${orderCol}&limit=1`, { Prefer: "count=exact" });
    const total = Number(head.headers.get("content-range")?.split("/")[1] ?? NaN);

    console.log(`\n📦 ${table}: ${total} satır | sıralama: ${orderCol} | vector kolonları: ${vectorCols.join(", ") || "-"}${withVectors ? "" : vectorCols.length ? " (atlanıyor)" : ""}`);
    if (offset > 0) console.log(`  ↪ ${offset}. satırdan devam ediliyor`);

    while (true) {
        const res = await request(`${table}?select=${select}&order=${orderCol}.asc&offset=${offset}&limit=${pageSize}`);
        const rows = await res.json();
        if (rows.length === 0) break;

        const mainLines = [];
        const embLines = [];
        for (const row of rows) {
            const plain = {};
            for (const c of plainCols) plain[c] = row[c];
            mainLines.push(JSON.stringify(plain));
            if (withVectors) {
                const emb = { [orderCol]: row[orderCol] };
                for (const c of vectorCols) emb[c] = parseVector(row[c]);
                embLines.push(JSON.stringify(emb));
            }
        }
        appendFileSync(mainPath, mainLines.join("\n") + "\n");
        if (withVectors) appendFileSync(embPath, embLines.join("\n") + "\n");

        offset += rows.length;
        process.stdout.write(`\r  ${offset}/${total}`);
        if (rows.length < pageSize) break;
    }
    console.log(`\n  ✅ ${mainPath}`);
    return { table, rows: offset, total, vectorCols, orderCol };
}

async function main() {
    console.log("🔍 Supabase şeması okunuyor...");
    const { tables, rpcs } = await getSchema();

    writeFileSync(resolve(OUT_DIR, "schema.json"), JSON.stringify({ tables, rpcs }, null, 2));
    console.log(`Tablolar: ${Object.keys(tables).join(", ") || "(yok)"}`);
    console.log(`RPC'ler: ${rpcs.join(", ") || "(yok)"}`);

    const names = ONLY_TABLE ? [ONLY_TABLE] : Object.keys(tables);
    const summary = [];
    for (const name of names) {
        if (!tables[name]) {
            console.error(`❌ Tablo bulunamadı: ${name}`);
            continue;
        }
        try {
            summary.push(await exportTable(name, tables[name]));
        } catch (err) {
            // View'lar veya yetkisiz tablolar hata verebilir; diğerlerine devam et
            console.error(`\n  ❌ ${name}: ${err.message}`);
            summary.push({ table: name, error: err.message });
        }
    }
    writeFileSync(resolve(OUT_DIR, "export_summary.json"), JSON.stringify(summary, null, 2));
    console.log("\n🎉 Supabase export tamamlandı.");
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
