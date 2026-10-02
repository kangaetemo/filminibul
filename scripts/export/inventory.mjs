// İndirilen export'lardan data/export/INVENTORY.md raporunu üretir.
//
// Kullanım:
//   node scripts/export/inventory.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { ROOT } from "./loadEnv.mjs";

const EXPORT_DIR = resolve(ROOT, "data", "export");
const SB_DIR = resolve(EXPORT_DIR, "supabase");
const UP_DIR = resolve(EXPORT_DIR, "upstash");

// Örnek olarak gösterilecek filmler (TMDB ID)
const SAMPLE_IDS = { 603: "The Matrix", 26466: "Triangle" };
const ID_COLUMN_CANDIDATES = ["tmdb_id", "movie_id", "id"];

async function* readJsonl(path) {
    const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
    for await (const line of rl) if (line.trim()) yield JSON.parse(line);
}

async function firstLine(path) {
    for await (const row of readJsonl(path)) return row;
    return null;
}

function isFilled(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
}

function preview(v, max = 160) {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > max ? s.slice(0, max) + "…" : s;
}

const pct = (n, total) => (total ? `${((100 * n) / total).toFixed(1)}%` : "-");

async function analyzeTable(table, columns) {
    const path = resolve(SB_DIR, `${table}.jsonl`);
    if (!existsSync(path)) return null;

    const filled = Object.fromEntries(columns.map((c) => [c.name, 0]));
    const idCol = ID_COLUMN_CANDIDATES.find((c) => columns.some((x) => x.name === c));
    const ids = new Set();
    const samples = [];
    let rows = 0;

    for await (const row of readJsonl(path)) {
        rows++;
        for (const c of columns) if (isFilled(row[c.name])) filled[c.name]++;
        if (idCol) {
            ids.add(Number(row[idCol]));
            if (SAMPLE_IDS[row[idCol]]) samples.push(row);
        }
    }

    let embedding = null;
    const embPath = resolve(SB_DIR, `${table}.embeddings.jsonl`);
    if (existsSync(embPath)) {
        const first = await firstLine(embPath);
        if (first) {
            embedding = Object.entries(first)
                .filter(([, v]) => Array.isArray(v))
                .map(([k, v]) => `${k}: ${v.length} boyut`)
                .join(", ");
        }
    }
    return { table, rows, filled, idCol, ids, samples, embedding };
}

async function main() {
    const out = [`# Veri Envanteri`, ``, `Oluşturulma: ${new Date().toISOString()}`, ``];
    const idSets = {};

    // ---------------- Supabase ----------------
    out.push(`## Supabase`, ``);
    const schemaPath = resolve(SB_DIR, "schema.json");
    if (!existsSync(schemaPath)) {
        out.push(`_Export yok. Önce \`node scripts/export/supabase_export.mjs --no-embeddings\` çalıştır._`, ``);
    } else {
        const { tables, rpcs } = JSON.parse(readFileSync(schemaPath, "utf8"));
        out.push(`**RPC'ler:** ${rpcs.length ? rpcs.map((r) => `\`${r}\``).join(", ") : "(yok)"}`, ``);

        for (const [table, columns] of Object.entries(tables)) {
            const a = await analyzeTable(table, columns);
            out.push(`### \`${table}\``, ``);
            if (!a) {
                out.push(`_Veri indirilmemiş._`, ``);
                continue;
            }
            out.push(`- Satır: **${a.rows}**`);
            if (a.embedding) out.push(`- Embedding: ${a.embedding}`);
            out.push(``, `| Kolon | Tip | Dolu |`, `|---|---|---|`);
            for (const c of columns) {
                const isVector = /vector/i.test(c.type ?? "");
                out.push(`| ${c.name}${c.pk ? " 🔑" : ""} | ${c.type} | ${isVector ? "(ayrı dosya)" : pct(a.filled[c.name], a.rows)} |`);
            }
            out.push(``);
            if (a.idCol && a.ids.size) idSets[`supabase.${table}.${a.idCol}`] = a.ids;

            for (const s of a.samples) {
                out.push(`<details><summary>Örnek: ${SAMPLE_IDS[s[a.idCol]]} (${s[a.idCol]})</summary>`, ``);
                for (const [k, v] of Object.entries(s)) out.push(`- **${k}**: ${preview(v)}`);
                out.push(``, `</details>`, ``);
            }
        }

        const metaPath = resolve(SB_DIR, "sql_meta.txt");
        out.push(`### Index / RPC tanımları`, ``);
        out.push(existsSync(metaPath) ? "```\n" + readFileSync(metaPath, "utf8").trim() + "\n```" : `_\`sql_meta.txt\` henüz eklenmedi._`, ``);
    }

    // ---------------- Upstash ----------------
    out.push(`## Upstash`, ``);
    const vecPath = resolve(UP_DIR, "vectors.jsonl");
    if (!existsSync(vecPath)) {
        out.push(`_Export yok. Önce \`node scripts/export/upstash_export.mjs\` çalıştır._`, ``);
    } else {
        const info = JSON.parse(readFileSync(resolve(UP_DIR, "info.json"), "utf8"));
        const ids = new Set();
        const metaKeys = new Map();
        for await (const v of readJsonl(vecPath)) {
            ids.add(Number(v.id));
            for (const k of Object.keys(v.metadata ?? {})) metaKeys.set(k, (metaKeys.get(k) ?? 0) + 1);
        }
        idSets["upstash"] = ids;
        out.push(`- Vektör: **${ids.size}** (info: ${info.vectorCount})`);
        out.push(`- Boyut: ${info.dimension}, benzerlik: ${info.similarityFunction}`);
        out.push(`- Metadata alanları: ${[...metaKeys].map(([k, n]) => `${k} (${pct(n, ids.size)})`).join(", ") || "(yok)"}`, ``);
    }

    // ---------------- Yerel arşiv ----------------
    const archivePath = resolve(ROOT, "data", "export", "dev_dev_arsiv.json"); // eski Upstash arşivi (repodan çıkarıldı, sadece yerelde)
    if (existsSync(archivePath)) {
        const archive = JSON.parse(readFileSync(archivePath, "utf8"));
        idSets["dev_dev_arsiv.json"] = new Set(archive.map((f) => Number(f.id)));
    }

    // ---------------- ID kesişimleri ----------------
    const names = Object.keys(idSets);
    if (names.length > 1) {
        out.push(`## ID kesişimleri`, ``, `| A | B | |A| | |B| | Ortak |`, `|---|---|---|---|---|`);
        for (let i = 0; i < names.length; i++) {
            for (let j = i + 1; j < names.length; j++) {
                const a = idSets[names[i]];
                const b = idSets[names[j]];
                let common = 0;
                for (const id of a) if (b.has(id)) common++;
                out.push(`| ${names[i]} | ${names[j]} | ${a.size} | ${b.size} | ${common} |`);
            }
        }
        out.push(``);
    }

    mkdirSync(EXPORT_DIR, { recursive: true });
    const outPath = resolve(EXPORT_DIR, "INVENTORY.md");
    writeFileSync(outPath, out.join("\n"));
    console.log(`✅ ${outPath}`);
}

main().catch((err) => {
    console.error("❌", err.message);
    process.exit(1);
});
