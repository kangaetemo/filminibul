import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator, TranslationPaused } from '../catalog/translate_overview.mjs';
const valid = () => Response.json({choices:[{message:{content:JSON.stringify({overview:'Bir genç adam ailesini bulmak için yola çıkar.'})}}]});

test('quota trips circuit breaker and stops further requests', async () => {
    let calls=0;
    const translate=createTranslator({apiKey:'fixture',request:async()=>{calls++;return Response.json({error:{code:'insufficient_quota'}},{status:429});},wait:async()=>{}});
    for(let i=0;i<3;i++)await assert.rejects(translate('source','title'),error=>error instanceof TranslationPaused && error.reason==='insufficient_quota');
    assert.equal(calls,1);
});
test('quota on final transient retry is still a pause', async () => {
    let calls=0;
    const translate=createTranslator({apiKey:'fixture',request:async()=>{calls++;return Response.json({error:{code:calls===3?'insufficient_quota':'rate_limit_exceeded'}},{status:429});},wait:async()=>{}});
    await assert.rejects(translate('source','title'),error=>error.reason==='insufficient_quota');
    await assert.rejects(translate('source','title'),TranslationPaused);
    assert.equal(calls,3);
});
test('invalid translation is retried without relaxing validation', async () => {
    let calls=0;
    const translate=createTranslator({apiKey:'fixture',request:async()=>++calls===1?Response.json({choices:[{message:{content:'{}'}}]}):valid(),wait:async()=>{}});
    assert.equal(await translate('source','title'),'Bir genç adam ailesini bulmak için yola çıkar.');
    assert.equal(calls,2);
    const invalid=createTranslator({apiKey:'fixture',request:async()=>Response.json({choices:[{message:{content:JSON.stringify({overview:'When a man finds his family missing he must look for them.'})}}]}),wait:async()=>{}});
    await assert.rejects(invalid('source','title'),/validation failed/);
});
test('missing credentials and authentication are deferred, without retries', async () => {
    const missing=createTranslator({apiKey:'',request:async()=>{throw Error('must not call');}});
    await assert.rejects(missing('source','title'),error=>error.reason==='not_configured');
    let calls=0;
    const auth=createTranslator({apiKey:'fixture',request:async()=>{calls++;return Response.json({error:{}},{status:401});}});
    await assert.rejects(auth('source','title'),error=>error.reason==='authentication');
    await assert.rejects(auth('source','title'),TranslationPaused);
    assert.equal(calls,1);
});
