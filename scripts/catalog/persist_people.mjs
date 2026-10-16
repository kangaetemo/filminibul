import { readFileSync, writeFileSync } from "node:fs";
import { sb, pool, arg } from "./lib.mjs";
const snapshots = JSON.parse(readFileSync(arg("checkpoint", "data/seo-staging/data/seo-people/checkpoint.json"), "utf8"));
const verified = JSON.parse(readFileSync(arg("verified", "data/seo-staging/docs/seo-02-people-report.json"), "utf8"));
if (snapshots.length !== 50 || verified.people.length !== 50 || verified.failed.length) throw new Error("An entirely verified 50-person source artifact is required");
const byId = new Map(verified.people.map(p => [p.person_id,p]));
if (new Set(snapshots.map(s=>s.person.person_id)).size !== 50) throw new Error("Duplicate pilot identities");
const report = { started_at:new Date().toISOString(), status:"running", source_run:38812137450, saved:[], failed:[], paid_api_calls:0, tmdb_calls:0, idempotence_verified:false };
async function apply(snapshot) {
    const p = snapshot.person, expected = byId.get(p.person_id);
    if (!expected || p.pilot_role!==expected.pilot_role || p.anchor_movie_id!==expected.anchor_movie_id || snapshot.credits.length!==expected.credit_rows) throw new Error("Checkpoint identity or credit count mismatch");
    const res = await sb("rpc/replace_pilot_person_snapshot", { method:"POST", body:JSON.stringify({p_person:p,p_credits:snapshot.credits}) });
    const stored = await res.json();
    if (stored.credit_rows!==snapshot.credits.length || stored.role_films!==expected.role_films) throw new Error("Persisted counts differ from the verified snapshot");
    return stored;
}
try {
    await pool(snapshots,3,async snapshot=>{
        try { const result=await apply(snapshot); report.saved.push(result); }
        catch(e) { report.failed.push({ person_id:snapshot.person.person_id,error:e.message }); }
    });
    if (!report.failed.length) {
        const repeated = await apply(snapshots[0]);
        report.idempotence_verified = repeated.credit_rows === snapshots[0].credits.length;
    }
} finally {
    report.status=report.failed.length?"partial":"complete";
    report.finished_at=new Date().toISOString();
    writeFileSync("docs/seo-02-people-write-report.json",JSON.stringify(report,null,2)+"\n");
    console.log("PERSIST_REPORT="+JSON.stringify(report));
}
if(report.failed.length)process.exitCode=1;
