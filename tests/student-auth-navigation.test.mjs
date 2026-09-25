import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
function load(file,mocks,globals={}){const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('exports','module','require',...Object.keys(globals),out)(m.exports,m,n=>{if(n in mocks)return mocks[n];throw Error(n)},...Object.values(globals));return m.exports;}
function fixture({session=true,error=null,throws=false}={}){
 const states=[],pushes=[];const mocks={
 'react/jsx-runtime':{jsx,jsxs:jsx},'react':{useState:v=>[v,x=>states.push(x)]},
 'next/navigation':{useRouter:()=>({push:p=>pushes.push(p),refresh(){}}),useSearchParams:()=>new URLSearchParams('next=/learn/course/lesson')},
 '@/components/ui/button':{Button:'button'},'@/lib/navigation':{getSafeNextPath:(p,f)=>p||f},
 '@/lib/supabase/client':{createSupabaseBrowserClient:()=>({auth:{getSession:async()=>({data:{session}}),updateUser:async()=>{if(throws)throw Error('network');return {error}}}})},
 };const form=load('components/auth/change-password-form.tsx',mocks,{FormData:class{get(){return 'fixture-only-not-a-real-password'}},fetch:()=>new Promise(()=>{})}).ChangePasswordForm();
 return {states,pushes,run:()=>form.props.onSubmit({preventDefault(){},currentTarget:{}})};
}
test('successful password update navigates without waiting for activity network',async()=>{const f=fixture();await Promise.race([f.run(),new Promise((_,rej)=>setTimeout(()=>rej(Error('blocked on activity')),200))]);assert.deepEqual(f.pushes,['/learn/course/lesson']);});
test('expired session, update errors and thrown network failures do not navigate and re-enable submission',async()=>{for(const config of [{session:false},{error:{message:'provider_error'}},{throws:true}]){const f=fixture(config);await f.run();assert.equal(f.pushes.length,0);assert.equal(f.states.at(-1),false);assert.ok(f.states.some(x=>typeof x==='string'&&x.length>0));}});
test('guest password route retains original lesson and account mode through login',async()=>{const page=load('app/doi-mat-khau/page.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},react:{Suspense:'suspense'},'next/navigation':{redirect:p=>{throw Error(p)}},'@/components/auth/change-password-form':{},'@/components/site/page-shell':{},'@/components/ui/soft-card':{},'@/lib/auth/session':{getCurrentAuth:async()=>({user:null})},'@/lib/auth/student-account':{shouldRequirePasswordChange:()=>true},'@/lib/navigation':{getSafeNextPath:p=>p}});try{await page.default({searchParams:Promise.resolve({next:'/learn/course/lesson',mode:'account'})});assert.fail('redirect expected')}catch(e){const u=new URL(e.message,'https://example.invalid');const next=new URL(u.searchParams.get('next'),'https://example.invalid');assert.equal(next.pathname,'/doi-mat-khau');assert.equal(next.searchParams.get('next'),'/learn/course/lesson');assert.equal(next.searchParams.get('mode'),'account');}});
