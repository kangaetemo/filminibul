import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createWatchlistStorage, ownerPrefix, WATCHLIST_BUCKET } from '../../src/lib/server/watchlistStorage.mjs';

const storage=createWatchlistStorage();
const probe=`watchlist-smoke:${randomUUID()}`, other=`watchlist-smoke:${randomUUID()}`;
const film={id:603,title:'Storage verification fixture',year:1999,rating:8,genres:[],posterUrl:null};
const report={checkedAt:new Date().toISOString(),status:'running',privateBucket:false,writeRead:false,independentClientRead:false,ownerIsolation:false,publicDownloadBlocked:false,cleanup:false};
let attempted=false;
try {
    await storage.bucket(true);report.privateBucket=true;
    attempted=true;await storage.save(probe,film);await storage.save(probe,film);
    assert.equal((await storage.list(probe)).length,1);assert.deepEqual(await storage.readFilm(probe,603),film);report.writeRead=true;
    const second=createWatchlistStorage();assert.deepEqual(await second.readFilm(probe,603),film);report.independentClientRead=true;
    assert.deepEqual(await second.list(other),[]);assert.equal(await second.readFilm(other,603),null);report.ownerIsolation=true;
    const publicResponse=await fetch(`${process.env.SUPABASE_URL.replace(/\/+$/,'')}/storage/v1/object/public/${WATCHLIST_BUCKET}/${ownerPrefix(probe)}/603.json`,{signal:AbortSignal.timeout(12000),cache:'no-store'});
    assert.equal(publicResponse.ok,false);report.publicDownloadBlocked=true;
    report.status='passed';
} catch(error) {
    report.status='failed';report.error=error?.code || (error instanceof assert.AssertionError ? 'verification_failed':'storage_request_failed');
    process.exitCode=1;
} finally {
    if(attempted)try{await storage.remove(probe,603);assert.deepEqual(await storage.list(probe),[]);report.cleanup=true;}catch{report.status='failed';report.cleanup=false;process.exitCode=1;}
    await mkdir('docs',{recursive:true});await writeFile('docs/watchlist-storage-report.json',JSON.stringify(report,null,2)+'\n');
    if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## Bulut listesi depolama kontrolü\n\n```json\n'+JSON.stringify(report,null,2)+'\n```\n');
    console.log(JSON.stringify(report));
}
