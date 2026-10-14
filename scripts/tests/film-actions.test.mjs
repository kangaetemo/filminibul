
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const film={id:603,title:'Matrix'};
function render(file,state,language='tr') {
    const pushed=[],mutations=[];
    const account={films:[film],records:[{id:603,watched:true,reaction:'disliked'}],pendingIds:[],persistent:true,phase:'guest',ready:true,member:null,...state,
        toggle:()=>{mutations.push('save');return {blocked:false,saved:true};},
        set:op=>mutations.push(op),refresh:()=>{}};
    const mocks={
        'react':{useState:initial=>[initial,()=>{}]},
        'react/jsx-runtime':jsx,
        'next/navigation':{useRouter:()=>({push:path=>pushed.push(path)})},
        'next/link':{default:()=>null},
        'lucide-react':{Bookmark:()=>null,Check:()=>null,CloudOff:()=>null,Loader2:()=>null,Eye:()=>null,ThumbsUp:()=>null,ThumbsDown:()=>null},
        '@/components/preferences/Preferences':{useLanguage:()=>({language,t:text=>text}),T:()=>null},
        '@/lib/savedFilms':{useSavedFilms:()=>account},
        '@/lib/filmSignals':{useFilmSignals:()=>account},
    };
    const code=ts.transpileModule(readFileSync(new URL('../../src/components/film/'+file+'.tsx',import.meta.url),'utf8'),{
        compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
    }).outputText;
    const module={exports:{}};
    new Function('require','module','exports',code)(name=>{assert.ok(name in mocks,name);return mocks[name];},module,module.exports);
    const buttons=[];
    function walk(node) {if(!node||typeof node!=='object')return;if(node.type==='button')buttons.push(node);for(const child of [].concat(node.props?.children||[]))walk(child);}
    return {component:compact=>{buttons.length=0;walk(module.exports.default({film,compact}));return buttons.slice();},pushed,mutations};
}
test('guest detail/card saves and all three feedback actions go to login without saving or success state',()=>{
    for(const language of ['tr','en']) {
        const save=render('SaveButton',{},language);
        for(const compact of [false,true]) {
            const [button]=save.component(compact);
            assert.equal(button.props.disabled,false);assert.equal(button.props['aria-pressed'],false);
            assert.ok(!button.props['aria-label'].includes('Kaydedilenlerden'));
            button.props.onClick();
        }
        assert.deepEqual(save.mutations,[]);assert.deepEqual(save.pushed,Array(2).fill('/hesap?lang='+language));
        const prefs=render('FilmFeedback',{},language), buttons=prefs.component();
        assert.equal(buttons.length,3);
        for(const button of buttons){assert.equal(button.props.disabled,false);assert.equal(button.props['aria-pressed'],false);button.props.onClick();}
        assert.deepEqual(prefs.mutations,[]);assert.deepEqual(prefs.pushed,Array(3).fill('/hesap?lang='+language));
        assert.equal(buttons[2].props.children[1].props.text,'Bana göre değil');
    }
});
test('unresolved auth disables actions and never redirects or mutates',()=>{
    for(const file of ['SaveButton','FilmFeedback']){
        const view=render(file,{ready:false,phase:'loading'});
        for(const button of view.component()){assert.equal(button.props.disabled,true);button.props.onClick();}
        assert.deepEqual(view.pushed,[]);assert.deepEqual(view.mutations,[]);
    }
});
test('member save and preference undo retain their separate values',()=>{
    const save=render('SaveButton',{member:'A',phase:'synced'});
    const [button]=save.component();assert.equal(button.props['aria-pressed'],true);button.props.onClick();assert.deepEqual(save.mutations,['save']);assert.deepEqual(save.pushed,[]);
    const prefs=render('FilmFeedback',{member:'A',phase:'synced'});
    for(const button of prefs.component())button.props.onClick();
    assert.deepEqual(prefs.mutations,[{id:603,field:'watched',value:false},{id:603,field:'reaction',value:'liked'},{id:603,field:'reaction',value:null}]);
    assert.deepEqual(prefs.pushed,[]);
});
