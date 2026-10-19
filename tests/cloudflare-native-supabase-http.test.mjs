import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const built=await build({stdin:{contents:'export * from "./lib/cloudflare/native-supabase-http";export * from "./lib/cloudflare/d1-postgrest";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'error'});
const h=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const schema=JSON.parse(readFileSync('lib/cloudflare/generated/supabase-schema-a.json','utf8')),rls=JSON.parse(readFileSync('lib/cloudflare/generated/supabase-rls-a.json','utf8'));
function fixture(t,session){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readFileSync('scripts/generated/d1-native-a.sql','utf8'));
 const db={all:async(q,p)=>sql.prepare(q).all(...p)};
 const http=h.createNativeSupabaseHttp({authDb:{first:async()=>null,batch:async()=>[]},admin:{getUserById:async()=>({data:{user:{id:'u'}},error:null}),updateUserById:async()=>({data:{user:null},error:null})},credentialKey:'k',limiterKey:'k',nativeAuthority:{},adminEmails:[],
  client:a=>h.createD1PostgrestClient(db,schema,{prefix:'a',rls,auth:a})});
 return {sql,http};}
const O='https://x.example';
test('anonymous /rest/v1: RLS filters rows, PostgREST query syntax, writes denied',async t=>{const f=fixture(t);f.sql.exec("INSERT INTO a_public__blog_posts(id,slug,title,status,created_at) VALUES('1','a','A','published','2026-10-01T00:00:00+00:00'),('2','b','B','draft','2026-10-02T00:00:00+00:00'),('3','c','C','published','2026-10-03T00:00:00+00:00')");
 const r=await f.http.handle(new Request(O+'/rest/v1/blog_posts?select=slug,title&status=eq.published&order=created_at.desc&limit=1',{headers:{prefer:'count=exact'}}));assert.equal(r.status,200);assert.deepEqual(await r.json(),[{slug:'c',title:'C'}]);assert.equal(r.headers.get('content-range'),'*/2');
 const d=await f.http.handle(new Request(O+'/rest/v1/blog_posts?select=slug&slug=eq.b'));assert.deepEqual(await d.json(),[]);
 const w=await f.http.handle(new Request(O+'/rest/v1/blog_posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:'x',title:'X',status:'draft'})}));assert.equal(w.status,403);
 const one=await f.http.handle(new Request(O+'/rest/v1/blog_posts?select=slug&slug=in.(a,c)&order=slug.asc',{headers:{accept:'application/vnd.pgrst.object+json'}}));assert.equal(one.status,406);
 const c=await f.http.handle(new Request(O+'/rest/v1/lesson_comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lesson_id:null,content:'Hay',status:'new'})}));assert.ok(c.status===201||c.status===400,String(c.status));});
test('/auth/v1 without session: getUser 401, bad password 400, settings ok',async t=>{const f=fixture(t);assert.equal((await f.http.handle(new Request(O+'/auth/v1/user'))).status,401);
 const bad=await f.http.handle(new Request(O+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'1.1.1.1'},body:JSON.stringify({email:'a@b.c',password:'x'})}));assert.equal(bad.status,400);assert.equal((await bad.json()).error_code,'invalid_credentials');
 assert.equal((await f.http.handle(new Request(O+'/auth/v1/settings'))).status,200);assert.equal(await f.http.handle(new Request(O+'/other')),null);});
