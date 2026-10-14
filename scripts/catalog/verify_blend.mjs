// Read-only live catalog check. Secrets stay in the Actions process; the
// report contains only public movie IDs, counts and elapsed times.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';
const root = fileURLToPath(new URL('../../src/', import.meta.url));
const urls = new Map();
function moduleUrl(path) {
    if (urls.has(path)) return urls.get(path);
    if (path.endsWith('.mjs')) return pathToFileURL(path).href;
    let source = path.endsWith('.json') ? `export default ${readFileSync(path, 'utf8')};`
        : ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    source = source.replace(/from\s+["']([^"']+)["']/g, (match, specifier) => {
        let dependency = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(dirname(path), specifier);
        if (!existsSync(dependency)) dependency += '.ts';
        return `from ${JSON.stringify(moduleUrl(dependency))}`;
    });
    const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    urls.set(path, url); return url;
}


const report={checkedAt:new Date().toISOString(),pair:[603,194],status:'failed',checks:{}};
const originalFetch=globalThis.fetch;
try {
    if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Missing configuration');
    const {blendFilms}=await import(moduleUrl(resolve(root,'lib/recommend/blend.ts')));
    for(const mode of ['normal','timeoutRecovery']) {
        let simulatedTimeouts=0;
        globalThis.fetch=async (url,init)=>{
            if(mode==='timeoutRecovery'&&new URL(url).pathname.endsWith('/rpc/blend_movies')) {
                simulatedTimeouts++;return Response.json({code:'57014',message:'verification timeout fixture'},{status:500});
            }
            return originalFetch(url,init);
        };
        const start=performance.now(), result=await blendFilms(603,194);
        if(!result?.films.length||result.films.some(r=>[603,194].includes(r.film.id))||JSON.stringify(result).includes('embedding'))throw Error('Invalid live result');
        report.checks[mode]={passed:true,count:result.films.length,seconds:Math.round((performance.now()-start)/10)/100,ids:result.films.map(r=>r.film.id),simulatedTimeouts};
    }
    const normal=new Set(report.checks.normal.ids), recovery=report.checks.timeoutRecovery.ids;
    report.overlap= recovery.filter(id=>normal.has(id)).length;
    report.status='passed';
} catch {
    // Avoid logging an arbitrary SDK/fetch error from a credential-bearing process.
    report.error='blend_verification_failed'; process.exitCode=1;
} finally {
    globalThis.fetch=originalFetch; mkdirSync('docs',{recursive:true});
    writeFileSync('docs/blend-verification-report.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
}
