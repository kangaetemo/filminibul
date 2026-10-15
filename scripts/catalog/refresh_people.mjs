import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmdb } from "../tmdb/tmdbClient.mjs";
import { sb, sbAll, pool, flag } from "./lib.mjs";
import { roleCredits, nameMatches, catalogCredits } from "../../src/lib/catalog/peopleModel.mjs";

const write = flag("write");
const anchors = JSON.parse(readFileSync("docs/seo-02-kisi-dogrulama-capalari.json", "utf8")).candidates;
if (anchors.length !== 50) throw new Error("The approved pilot must contain exactly 50 anchors");
const catalog = new Set((await sbAll("film_embeddings_v3?select=movie_id&year=lte.2025")).map(r => r.movie_id));
const anchorCache = new Map();
const anchorCredits = id => {
    if (!anchorCache.has(id)) anchorCache.set(id, tmdb(`/movie/${id}/credits`));
    return anchorCache.get(id);
};
const report = { started_at: new Date().toISOString(), mode: write ? "write" : "read_only", people: [], failed: [], credits: 0, catalog_films: catalog.size, paid_api_calls: 0 };
const checkpoint = [];
mkdirSync("data/seo-people", { recursive: true });
try {
    await pool(anchors, 3, async candidate => {
        try {
            const anchor = await anchorCredits(candidate.anchor_movie_id);
            const anchored = roleCredits(anchor, candidate.role);
            let matches = anchored.filter(c => nameMatches(c, candidate.name));
            if (!matches.length) {
                const search = await tmdb("/search/person", { query: candidate.name, include_adult: false });
                const ids = new Set(anchored.map(c => c.id));
                const possible = (search?.results || []).filter(c => ids.has(c.id));
                matches = [];
                for (const c of possible) {
                    const d = await tmdb(`/person/${c.id}`, { language: "en-US" });
                    if (d && nameMatches(d, candidate.name)) matches.push(c);
                }
            }
            const ids = [...new Set(matches.map(c => c.id))];
            if (ids.length !== 1) throw new Error(`Identity ambiguity: ${ids.length} anchored candidates`);
            const id = ids[0];
            const [person, snapshot] = await Promise.all([tmdb(`/person/${id}`, { language: "en-US" }), tmdb(`/person/${id}/movie_credits`, { language: "en-US" })]);
            if (!person || person.id !== id || !nameMatches(person, candidate.name)) throw new Error("Person details do not match the anchored identity");
            if (!roleCredits(snapshot, candidate.role).some(c => c.id === candidate.anchor_movie_id)) throw new Error("Person credits do not confirm the anchor and role");
            const raw = catalogCredits(snapshot, id, catalog);
            const credits = raw.map(({ identity, ...credit }) => ({ ...credit, credit_key: createHash("sha256").update(identity).digest("hex") }));
            const roleFilms = new Set(credits.filter(c => candidate.role === "actor" ? c.kind === "cast" : c.kind === "crew" && c.job === "Director").map(c => c.movie_id));
            if (roleFilms.size < 5) throw new Error(`Insufficient catalog coverage: ${roleFilms.size}`);
            const row = { person_id: id, name: person.name, display_name: candidate.name, profile_path: person.profile_path || null, pilot_role: candidate.role, published: true, anchor_movie_id: candidate.anchor_movie_id };
            if (write) await sb("rpc/replace_pilot_person_snapshot", { method: "POST", body: JSON.stringify({ p_person: row, p_credits: credits }) });
            const verified = { ...row, role_films: roleFilms.size, credit_rows: credits.length };
            report.people.push(verified); report.credits += credits.length;
            checkpoint.push({ person: row, credits });
            writeFileSync("data/seo-people/checkpoint.json", JSON.stringify(checkpoint));
            console.log(`Verified ${candidate.name}: person ${id}, ${roleFilms.size} role films${write ? "; persisted" : ""}`);
        } catch (e) { report.failed.push({ name: candidate.name, role: candidate.role, error: e.message }); console.error(`Person ${candidate.name}: ${e.message}`); }
    });
} finally {
    report.people.sort((a,b) => a.person_id - b.person_id);
    report.finished_at = new Date().toISOString();
    report.status = report.failed.length ? "partial" : "complete";
    writeFileSync("docs/seo-02-people-report.json", JSON.stringify(report, null, 2) + "\n");
    console.log("PERSON_REPORT=" + JSON.stringify(report));
}
if (report.failed.length) process.exitCode = 1;
