import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const jsx=(type,props)=>({type,props});
function load(file,mocks){const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const m={exports:{}};new Function('exports','module','require',code)(m.exports,m,name=>{if(name in mocks)return mocks[name];throw Error('Unexpected dependency '+name)});return m.exports;}
function nodes(root){const result=[];function walk(node){if(Array.isArray(node))return node.forEach(walk);if(node&&typeof node==='object'){result.push(node);walk(node.props?.children)}}walk(root);return result;}
test('native login posts real credential fields only to native API and never opens Supabase or activity path',async()=>{
 const originalFetch=globalThis.fetch,originalFormData=globalThis.FormData,calls=[],navigated=[];
 try{
  globalThis.FormData=class{get(name){return {email:'fixture@example.invalid',password:'Synthetic password',rememberLogin:'on'}[name]}};
  globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json({ok:true,user:{id:'fixture',mustChangePassword:false}})};
  const form=load('components/auth/login-form.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:x=>[x,()=>{}]},'next/navigation':{useRouter:()=>({push:x=>navigated.push(x),refresh(){}}),useSearchParams:()=>new URLSearchParams('next=%2Flearn%2Ffixture%2Flesson')},'next/link':{default:'a'},'lucide-react':{},'@/components/ui/button':{Button:'button'},'@/lib/auth/student-account':{getPostLoginRedirect:()=>{throw Error('Legacy redirect must not run')}},'@/lib/navigation':{getSafeNextPath:(next,fallback)=>next??fallback},'@/lib/supabase/client':{createSupabaseBrowserClient:()=>{throw Error('Source provider must not run')}}}).LoginForm({authProvider:'native-d1'});
  await nodes(form).find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/cloudflare-auth/login');assert.equal(calls[0].body.rememberLogin,true);assert.deepEqual(Object.keys(calls[0].body).sort(),['email','password','rememberLogin']);assert.deepEqual(navigated,['/learn/fixture/lesson']);
 }finally{globalThis.fetch=originalFetch;globalThis.FormData=originalFormData;}
});
test('failed native logout leaves navigation unchanged and success does not call Supabase',async()=>{
 const previous=globalThis.fetch,navigated=[],messages=[];
 try{
  const mocks={'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:x=>[x,v=>messages.push(v)]},'next/navigation':{useRouter:()=>({push:x=>navigated.push(x),refresh(){}})},'@/lib/supabase/client':{createSupabaseBrowserClient:()=>{throw Error('Source provider must not run')}}};
  const {SignOutButton}=load('components/auth/sign-out-button.tsx',mocks);
  globalThis.fetch=async()=>new Response(null,{status:503});await nodes(SignOutButton({authProvider:'native-d1'})).find(n=>n.type==='button').props.onClick();assert.deepEqual(navigated,[]);assert(messages.includes('Chưa đăng xuất được. Vui lòng thử lại.'));
  globalThis.fetch=async()=>new Response('<html>Gateway sign-in</html>',{status:200});await nodes(SignOutButton({authProvider:'native-d1'})).find(n=>n.type==='button').props.onClick();assert.deepEqual(navigated,[]);
  globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/cloudflare-auth/logout');assert.equal(opts.body,'{}');return Response.json({ok:true})};await nodes(SignOutButton({authProvider:'native-d1'})).find(n=>n.type==='button').props.onClick();assert.deepEqual(navigated,['/']);
 }finally{globalThis.fetch=previous;}
});
test('native app SSO uses full browser navigation instead of RSC redirect',async()=>{
 const previous={fetch:globalThis.fetch,FormData:globalThis.FormData,window:globalThis.window},navigated=[];
 try{
  globalThis.FormData=class{get(name){return {email:'fixture@example.invalid',password:'Synthetic password'}[name]}};
  globalThis.fetch=async()=>Response.json({ok:true,user:{mustChangePassword:false}});
  globalThis.window={location:{assign:next=>navigated.push(next)}};
  const next='/app-login-bridge?native_state='+ 'A'.repeat(43)+'&origin=https%3A%2F%2Ffixture.invalid';
  const form=load('components/auth/login-form.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},react:{useState:x=>[x,()=>{}]},'next/navigation':{useRouter:()=>({push(){throw Error('RSC navigation forbidden for SSO')},refresh(){throw Error('RSC refresh forbidden for SSO')}}),useSearchParams:()=>new URLSearchParams({next})},'next/link':{default:'a'},'lucide-react':{},'@/components/ui/button':{Button:'button'},'@/lib/auth/student-account':{},'@/lib/navigation':{getSafeNextPath:next=>next},'@/lib/supabase/client':{createSupabaseBrowserClient(){throw Error('Source forbidden')}}}).LoginForm({authProvider:'native-d1'});
  await nodes(form).find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{}});assert.deepEqual(navigated,[next]);
 }finally{globalThis.fetch=previous.fetch;globalThis.FormData=previous.FormData;if(previous.window===undefined)delete globalThis.window;else globalThis.window=previous.window;}
});
