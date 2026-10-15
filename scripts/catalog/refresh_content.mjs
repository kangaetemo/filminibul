// English source and embeddings are never changed. Metadata survives translation failures.
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { cleanOverview, looksEnglish, selectOriginalPoster, turkishOverview } from "../../src/lib/filmContent.mjs";
import { createTranslator, TranslationPaused } from "./translate_overview.mjs";
import { translationSourceIssue } from "./content_budget.mjs";
import { tmdb } from "../tmdb/tmdbClient.mjs";
import { arg, flag, pool, sb, sbAll, summary } from "./lib.mjs";

const MAX = Number(arg("max", "30000"));
if (!Number.isSafeInteger(MAX) || MAX < 1 || MAX > 50000) throw new Error("--max must be between 1 and 50000");
const dry = flag("dry-run"), skipTranslation = flag("skip-translation"), retryFailed = flag("retry-failed");
const budgetArg = arg("max-usd", process.env.MAX_TRANSLATION_USD);
const maxUsd = budgetArg === undefined ? Infinity : Number(budgetArg);
if (budgetArg !== undefined && (!Number.isFinite(maxUsd) || maxUsd < 0)) throw new Error("--max-usd must be finite and non-negative");
const cachePath = "data/content/checked.json", reportPath = "docs/content-maintenance-report.json";
const cached = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
const previous = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : {};
const retryIds = new Set([...(previous.failed_ids || []), ...(previous.deferred_ids || []), ...(previous.unresolved_ids || [])]);
const report = { started_at: new Date().toISOString(), status: "running", mode: skipTranslation ? "metadata_only" : "full", retry_failed: retryFailed, scanned: 0, translated: 0, cleaned: 0, tmdb_turkish: 0, original_posters: 0, conflicts: 0, conflict_ids: [], failed: 0, deferred: 0, remaining_turkish: 0, stop_reason: null, failed_ids: [], deferred_ids: [], unresolved_ids: [] };
const rows = await sbAll("film_embeddings_v3?select=movie_id,title,original_title,language,overview,tr_overview,tr_title,poster_path");
const selected = (retryFailed ? rows.filter(row => retryIds.has(row.movie_id)) : rows).slice(0, MAX);
const translate = createTranslator({ maxUsd });
report.unsuitable_source_ids = [];
const failed = new Set();
let completed = 0;
function fail(row, error) {
    if (failed.has(row.movie_id)) return;
    failed.add(row.movie_id); report.failed++; report.failed_ids.push(row.movie_id);
    if (report.failed <= 10) console.error(`Film ${row.movie_id}: ${error.message}`);
}
function saveCache() {
    if (dry) return;
    mkdirSync("data/content", { recursive: true });
    writeFileSync(cachePath, JSON.stringify(cached));
}
async function apply(row, patch, field) {
    if (!Object.keys(patch).length || dry) return false;
    const params = new URLSearchParams({ movie_id: `eq.${row.movie_id}`, [field]: row[field] == null ? "is.null" : `eq.${row[field]}`, select: "movie_id" });
    const updated = await (await sb(`film_embeddings_v3?${params}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) })).json();
    if (!updated.length) { report.conflicts++; report.conflict_ids.push(row.movie_id); return false; }
    return true;
}

console.log(`Content maintenance: ${selected.length}/${rows.length} films; ${report.mode}${dry ? " (dry run)" : ""}`);
await pool(selected, 6, async row => {
    report.scanned++;
    const existing = turkishOverview(row.tr_overview, row.overview, row.language);
    const textPatch = existing && existing !== row.tr_overview ? { tr_overview: existing } : {};
    let sourceKind = existing ? "cleaned" : null;
    let details = null, metadataSaved = true, metadataChecked = false;
    const checkedAt = Date.parse(cached[row.movie_id] || "");
    const needCheck = retryFailed || !Number.isFinite(checkedAt) || Date.now() - checkedAt > 90 * 86400000;
    try {
        if (needCheck || !existing) {
            // No image language filter: original-language posters must be included.
            details = await tmdb(`/movie/${row.movie_id}`, { append_to_response: "images,translations" });
            metadataChecked = true;
        }
    } catch (error) { fail(row, error); metadataSaved = false; }
    if (details) {
        const tr = details.translations?.translations?.find(t => t.iso_639_1 === "tr")?.data;
        if (!existing && cleanOverview(tr?.overview) && !looksEnglish(tr.overview)) {
            textPatch.tr_overview = cleanOverview(tr.overview); sourceKind = "tmdb_turkish";
        }
        // Independent compare-and-swap writes preserve manual edits and don't
        // discard metadata just because the translation service is unavailable.
        const poster = selectOriginalPoster(details.images?.posters, row.language || details.original_language, row.poster_path);
        try {
            if (poster && poster !== row.poster_path) {
                if (await apply(row, { poster_path: poster }, "poster_path")) report.original_posters++;
                else metadataSaved = false;
            }
            if (!row.tr_title && tr?.title?.trim()) {
                if (!await apply(row, { tr_title: tr.title.trim() }, "tr_title")) metadataSaved = false;
            }
        } catch (error) { fail(row, error); metadataSaved = false; }
    }
    if (metadataChecked && metadataSaved && !dry) cached[row.movie_id] = new Date().toISOString();
    if (!existing && !textPatch.tr_overview && cleanOverview(row.overview)) {
        if (translationSourceIssue(cleanOverview(row.overview))) {
            report.unsuitable_source_ids.push(row.movie_id);
            report.deferred++; report.deferred_ids.push(row.movie_id);
        } else if (dry || skipTranslation) {
            report.deferred++; report.deferred_ids.push(row.movie_id);
        } else {
            try {
                textPatch.tr_overview = await translate(cleanOverview(row.overview), row.original_title || row.title);
                sourceKind = "translated";
            } catch (error) {
                if (error instanceof TranslationPaused) {
                    report.stop_reason = error.reason;
                    report.deferred++; report.deferred_ids.push(row.movie_id);
                } else fail(row, error);
            }
        }
    }
    try {
        if (await apply(row, textPatch, "tr_overview")) report[sourceKind]++;
    } catch (error) { fail(row, error); }
    completed++;
    if (completed % 100 === 0) {
        saveCache();
        console.log(`Completed ${completed}; translations ${report.translated}; posters saved ${report.original_posters}; deferred ${report.deferred}; errors ${report.failed}`);
    }
});
saveCache();
const missing = dry ? rows : await sbAll("film_embeddings_v3?select=movie_id,overview,tr_overview,language");
const selectedIds = new Set(selected.map(row => row.movie_id));
report.unresolved_ids = [...new Set([...retryIds].filter(id => !selectedIds.has(id)).concat(report.failed_ids, report.conflict_ids, ...missing.filter(r => cleanOverview(r.overview) && !turkishOverview(r.tr_overview, r.overview, r.language)).map(r => r.movie_id)))];
report.remaining_turkish = missing.filter(r => cleanOverview(r.overview) && !turkishOverview(r.tr_overview, r.overview, r.language)).length;
report.status = report.failed ? "failed" : report.remaining_turkish || report.unresolved_ids.length ? "partial" : "complete";
report.updated_at = new Date().toISOString();
report.translation_usage = translate.stats();
if (!dry) {
    mkdirSync("docs", { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
}
summary(`## Film content maintenance: ${report.status}\n\nMode: ${report.mode}; scanned: ${report.scanned}\n\nSaved translations: ${report.translated}; TMDB Turkish: ${report.tmdb_turkish}; cleaned: ${report.cleaned}; original posters: ${report.original_posters}\n\nRemaining Turkish summaries: ${report.remaining_turkish}; deferred: ${report.deferred}; errors: ${report.failed}; concurrent edits: ${report.conflicts}\n\nTranslation pause: ${report.stop_reason || "none"}`);
if (report.status === "partial") console.log(`::warning::Partial content maintenance: ${report.remaining_turkish} Turkish summaries pending; reason: ${report.stop_reason || (skipTranslation ? "translation disabled" : "concurrent edits / scan limit")}`);
if (report.failed > 0) process.exitCode = 1;
