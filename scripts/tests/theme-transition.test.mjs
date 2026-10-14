import test from 'node:test';
import assert from 'node:assert/strict';
import { createThemeTransition } from '../../src/lib/themeTransition.mjs';
const root=()=>({classList:{add(){},remove(){}},offsetWidth:100});
test('rapid theme changes and dispose discard obsolete transition callbacks',()=>{
    const callbacks=[],updates=[],skips=[];
    const doc={documentElement:root(),startViewTransition:update=>{callbacks.push(update);return {finished:Promise.resolve(),skipTransition:()=>skips.push(true)};}};
    const t=createThemeTransition(doc,()=>false);
    t.change(()=>updates.push('dark'));t.change(()=>updates.push('light'));
    callbacks[1]();callbacks[0]();assert.deepEqual(updates,['light']);assert.equal(skips.length,1);
    t.change(()=>updates.push('dark'));t.dispose();callbacks[2]();assert.deepEqual(updates,['light']);
});
test('reduced motion applies immediately and never starts animation',()=>{
    const t=createThemeTransition({documentElement:root(),startViewTransition:()=>assert.fail()},()=>true);
    let applied=0;t.change(()=>applied++);assert.equal(applied,1);t.dispose();
});
test('missing or throwing API falls back without breaking theme selection',()=>{
    for(const startViewTransition of [undefined,()=>{throw Error();}]){
        let applied=0;const t=createThemeTransition({documentElement:root(),startViewTransition},()=>false);
        t.change(()=>applied++);assert.equal(applied,1);t.dispose();
    }
});
