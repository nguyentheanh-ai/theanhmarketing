import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, deps={}) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const m={exports:{}};
 new Function('exports','module','require',code)(m.exports,m,(name)=>Object.hasOwn(deps,name)?deps[name]:require(name));
 return m.exports;
}
test('upstream timeout aborts hanging fetch and preserves caller abort',async()=>{
 const original=global.fetch;
 global.fetch=async(_input,init)=>new Promise((resolve,reject)=>{const stop=()=>reject(init.signal.reason); if(init.signal.aborted)stop();else init.signal.addEventListener('abort',stop,{once:true});});
 const keepAlive=setTimeout(()=>{},200);
 try {
  const {createBoundedFetch}=load('lib/supabase/bounded-fetch.ts');
  await assert.rejects(createBoundedFetch(10)('https://example.invalid'),{name:'TimeoutError'});
  const controller=new AbortController();controller.abort(new Error('caller aborted'));
  await assert.rejects(createBoundedFetch(100)('https://example.invalid',{signal:controller.signal}),/caller aborted/);
 }finally{global.fetch=original;clearTimeout(keepAlive);}
});
test('admin client fails closed without service key and bounds privileged requests',()=>{
 const saved={key:process.env.SUPABASE_SERVICE_ROLE_KEY,url:process.env.NEXT_PUBLIC_SUPABASE_URL};
 let calls=0,options;
 try{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const {createSupabaseAdminClient}=load('lib/supabase/admin.ts',{'@supabase/supabase-js':{createClient:(_u,_k,o)=>{calls++;options=o;return {}; }},'@/lib/supabase/bounded-fetch':{createBoundedFetch:()=>()=>{}},'@/lib/supabase/server':{createSupabaseServerClient:()=>({anon:true})}});
  assert.equal(createSupabaseAdminClient(),null);assert.equal(calls,0);
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';createSupabaseAdminClient();
  assert.equal(calls,1);assert.equal(typeof options.global.fetch,'function');assert.equal(options.auth.autoRefreshToken,false);
 }finally{for(const [key,val] of [['SUPABASE_SERVICE_ROLE_KEY',saved.key],['NEXT_PUBLIC_SUPABASE_URL',saved.url]]){ if(val===undefined) delete process.env[key]; else process.env[key]=val; }}
});
test('proxy skips guests, rotates chunked cookies before rendering and preserves cookie options',async()=>{
 const saved={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
 let calls=0;
 try{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only';
  const jar=new Map();const request={cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),set:(name,value)=>jar.set(name,value)}};
  const {refreshRequestSession}=load('lib/supabase/refresh-session.ts',{'@supabase/ssr':{createServerClient:(_u,_k,options)=>{calls++;return {auth:{getClaims:async()=>{options.cookies.setAll([{name:'sb-test-auth-token.0',value:'rotated',options:{httpOnly:true,sameSite:'lax',path:'/'}}]);}}};}},'@/lib/supabase/bounded-fetch':{createBoundedFetch:()=>()=>{}}});
  assert.deepEqual(await refreshRequestSession(request),[]);assert.equal(calls,0);
  jar.set('sb-test-auth-token.0','expired');const writes=await refreshRequestSession(request);
  assert.equal(calls,1);assert.equal(jar.get('sb-test-auth-token.0'),'rotated');assert.equal(writes[0].options.httpOnly,true);
 }finally{for(const [key,val] of [['NEXT_PUBLIC_SUPABASE_URL',saved.url],['NEXT_PUBLIC_SUPABASE_ANON_KEY',saved.key]]){ if(val===undefined) delete process.env[key]; else process.env[key]=val; }}
});
test('React render request shares Auth lookups but never caches across requests',async()=>{
 // Use the real React server cache dispatcher, resetting its store per render request.
 const reactServer=require(require.resolve('react').replace(/index\.js$/,'react.react-server.js'));
 const internals=reactServer.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
 let cacheStore=new Map(),calls=0;
 const previous=internals.A;internals.A={getCacheForType(type){if(!cacheStore.has(type))cacheStore.set(type,type());return cacheStore.get(type);}};
 const saved={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
 try{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only';
  const mod=load('lib/auth/session.ts',{'react':reactServer,'@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>{calls++;await Promise.resolve();return {data:{user:{id:'test',email:'test@example.invalid',app_metadata:{}}}};}}})},'next/headers':{cookies:async()=>({getAll:()=>[]}),headers:async()=>new Headers()},'next/navigation':{redirect:()=>{}},'@/lib/admin/admin-emails':{getConfiguredOwnerEmails:()=>[]},'@/lib/auth/student-account':{shouldRequirePasswordChange:()=>false},'@/lib/supabase/client':{hasSupabaseEnv:()=>true},'@/lib/supabase/bounded-fetch':{createBoundedFetch:()=>()=>{}}});
  await Promise.all([mod.getCurrentAuth(),mod.getCurrentAuth(),mod.getCurrentAuth()]);assert.equal(calls,1);
  cacheStore=new Map();await mod.getCurrentAuth();assert.equal(calls,2);
 }finally{internals.A=previous;for(const [key,val] of [['NEXT_PUBLIC_SUPABASE_URL',saved.url],['NEXT_PUBLIC_SUPABASE_ANON_KEY',saved.key]]){ if(val===undefined) delete process.env[key]; else process.env[key]=val; }}
});

test('scoped access reads only requested identity; paid bundles, revokes and deposit rules match existing resolver',async()=>{
 const kit=load('lib/agent-kit-preorder.ts');
 const resolver=load('lib/course-access.ts',{'@/lib/agent-kit-preorder':kit,'@/lib/admin/admin-emails':{getConfiguredOwnerEmails:()=>[]}});
 const pages=load('lib/admin/read-all-rows.ts');
 const email='reader_%@example.invalid';
 const rows={orders:[{id:'1',email,status:'paid',course_slug:'facebook-ads-2026',course_title:'Bundle',order_items:[{slug:'facebook-ads-2026'},{slug:'ebook-facebook-ads-2026'}]},{id:'2',email,status:'paid',course_slug:kit.AGENT_KIT_SLUG,course_title:'Kit',payment_plan:kit.AGENT_KIT_PREORDER_PAYMENT_PLAN,order_items:[{slug:kit.AGENT_KIT_SLUG}]}],leads:[]};
 const calls=[];
 const client={from(table){const q={select(fields,options){calls.push({table,fields,options});return q;},ilike(field,pattern){assert.equal(field,'email');assert.equal(pattern,'reader\\_\\%@example.invalid');return q;},eq(field,value){assert.equal(field,'status');assert.equal(value,'paid');return q;},is(field,value){assert.equal(field,'deleted_at');assert.equal(value,null);return q;},order(){return q;},range(){return Promise.resolve({data:rows[table],error:null,count:rows[table].length});}};return q;}};
 const service=load('services/courseAccessService.ts',{'@/lib/course-access':resolver,'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/admin/read-all-rows':pages});
 assert.deepEqual(await service.getOwnedCourseSlugs(' '+email.toUpperCase()+' '),['facebook-ads-2026','ebook-facebook-ads-2026']);
 assert.equal(calls.length,2);assert.ok(calls.every(c=>!c.fields.includes('phone')));
 rows.leads=[{id:'3',email,source:'admin-access-revoke:ebook-facebook-ads-2026',created_at:'2026-09-12T00:00:00Z'}];
 assert.deepEqual(await service.getOwnedCourseSlugs(email),['facebook-ads-2026']);
 const bad=load('services/courseAccessService.ts',{'@/lib/course-access':resolver,'@/lib/supabase/admin':{createSupabaseAdminClient:()=>null},'@/lib/admin/read-all-rows':pages});
 await assert.rejects(bad.getOwnedCourseSlugs(email),/unavailable/);
});
