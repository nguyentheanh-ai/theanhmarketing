// Local workerd + real Miniflare D1 binding. Synthetic identities only.
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const helpers=await build({stdin:{contents:'export * from "./lib/cloudflare/legacy-password";',resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,tsconfig:'tsconfig.json'});
const core=await import('data:text/javascript;base64,'+Buffer.from(helpers.outputFiles[0].text).toString('base64'));
const key=core.generateCredentialKey(),limiterKey=core.generateCredentialKey();
const projectId='vsxxgdzwtscuxcmjfckt',userId='00000000-0000-4000-8000-000000000003';
const password='Local-D1-HTTP-fixture-only',email='http-fixture@example.invalid';
const envelope=await core.sealLegacyBcryptHash(await bcrypt.hash(password,10),key,{projectId,userId});
const origin='https://auth-fixture.invalid';
const source=`import {handleD1AuthHttp} from './lib/cloudflare/d1-auth-http';
import {createD1AuthDatabase} from './lib/cloudflare/d1-auth-database';
import {readD1StudentSessionAccess} from './lib/cloudflare/d1-student-session-access';
import {consumeD1AuthAttempt} from './lib/cloudflare/d1-auth-rate-limit';
export default {async fetch(request,env){const db=createD1AuthDatabase(env.DB);
if(new URL(request.url).pathname==='/fixture/student-access'){try{const cookies=(request.headers.get('Cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('__Host-tam-session='));const token=cookies.length===1?cookies[0].slice('__Host-tam-session='.length):'';const result=await readD1StudentSessionAccess(db,token,{sessionTtlMs:3600000});return Response.json({status:result.status,userId:result.status==='student'?result.user.id:null,ownedSlugs:result.status==='student'?result.access.ownedSlugs:[]},{headers:{'Cache-Control':'private, no-store'}})}catch{return new Response(null,{status:503})}}
return handleD1AuthHttp(request,{db,projectId:${JSON.stringify(projectId)},origin:${JSON.stringify(origin)},credentialKey:${JSON.stringify(key)},sessionTtlMs:3600000,allowAttempt:async(request,email)=>{const ip=request.headers.get('CF-Connecting-IP');if(!ip)return {allowed:false,retryAfter:60};return consumeD1AuthAttempt(db,{projectId:${JSON.stringify(projectId)},ip,email},{secret:${JSON.stringify(limiterKey)},ip:{limit:10,windowMs:60000},email:{limit:5,windowMs:60000}})}})}};`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',write:false,tsconfig:'tsconfig.json'});
const mf=new Miniflare({workers:[{config:{name:'auth-http-fixture',compatibilityDate:'2026-10-13',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'fixture.mjs',modules:{'fixture.mjs':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',name:'local-auth-fixture',id:'local-auth-fixture'}}}}]});
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
try{
 const db=await mf.getD1Database('DB');
 for(const file of ['scripts/d1-lms-compatibility-prototype.sql','scripts/d1-course-access-source-prototype.sql','scripts/d1-lms-legacy-enrollment-owners-prototype.sql','scripts/d1-auth-core-prototype.sql']){
  // SQLite recognizes trigger BEGIN/END; plain split(';') breaks triggers.
  const parsed=spawnSync('python3',['-c',`import sys,sqlite3,json
buf='';out=[]
for c in sys.stdin.read():
 buf+=c
 if c==';' and sqlite3.complete_statement(buf):out.append(buf);buf=''
if buf.strip():raise SystemExit('Incomplete fixture schema')
print(json.dumps(out))`],{input:readFileSync(file,'utf8').replace(/^\s*--.*$/gm,''),encoding:'utf8'});
  if(parsed.status!==0)throw new Error('Fixture schema parsing failed');
  for(const stmt of JSON.parse(parsed.stdout))await db.prepare(stmt).run();
 }
 await db.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').bind(userId,email).run();
 const stamp=new Date(Date.now()-60000).toISOString();
 await db.prepare('INSERT INTO d1_auth_sync_state VALUES(?,?,?,?)').bind(projectId,new Date().toISOString(),new Date().toISOString(),'verified').run();
 await db.prepare('INSERT INTO d1_access_sync_state VALUES(?,?,?,?)').bind(projectId,stamp,stamp,'verified').run();
 await db.prepare('INSERT INTO d1_access_orders VALUES(?,?,?,?,?,?,?,NULL)').bind('fixture-own',email,'paid','fixture-course','Fixture',null,null).run();
 await db.prepare('INSERT INTO d1_access_orders VALUES(?,?,?,?,?,?,?,NULL)').bind('fixture-other','other@example.invalid','paid','private-other','Fixture',null,null).run();
 await db.prepare('INSERT INTO d1_auth_accounts(user_id,credential_ciphertext,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?,?)').bind(userId,envelope,stamp,stamp,stamp).run();
 const post=(path,body,extra={})=>mf.dispatchFetch(origin+'/api/cloudflare-auth/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...extra},body:JSON.stringify(body)});
 let cookie;
 await check('Workers password login → D1 session → secure cookie',async()=>{const r=await post('login',{email,password,rememberLogin:true});assert.equal(r.status,200);cookie=r.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Max-Age=3600/);const data=await r.json();assert.equal(data.user.id,userId);assert.equal(data.token,undefined);const rows=await db.prepare('SELECT token_hash FROM d1_auth_sessions').all();assert.equal(rows.results.length,1);assert.equal(rows.results[0].token_hash.length,64)});
 await check('Workers refresh reads identical UUID from D1',async()=>{for(let i=0;i<2;i++){const r=await mf.dispatchFetch(origin+'/api/cloudflare-auth/session',{headers:{Cookie:cookie.split(';')[0]}});assert.equal((await r.json()).user.id,userId);assert.equal(r.headers.get('Cache-Control'),'private, no-store')}});
 await check('Workers login cookie resolves own course rights, denies injected email and duplicate cookies',async()=>{const r=await mf.dispatchFetch(origin+'/fixture/student-access?email=other@example.invalid&userId=other',{headers:{Cookie:cookie.split(';')[0]}});assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(await r.json(),{status:'student',userId,ownedSlugs:['fixture-course']});const duplicate=await mf.dispatchFetch(origin+'/fixture/student-access',{headers:{Cookie:cookie.split(';')[0]+'; '+cookie.split(';')[0]}});assert.equal((await duplicate.json()).status,'guest')});
 await check('Workers denies foreign Origin before limiter or session mutation',async()=>{const before=(await db.prepare('SELECT count(*) n FROM d1_auth_sessions').first()).n;assert.equal((await post('login',{email,password},{Origin:'https://attacker.invalid'})).status,403);assert.equal((await db.prepare('SELECT count(*) n FROM d1_auth_sessions').first()).n,before)});
 await check('Workers mirror outage returns 503, preserves cookie and resumes after verification',async()=>{await db.prepare("UPDATE d1_auth_sync_state SET status='pending'").run();const r=await mf.dispatchFetch(origin+'/api/cloudflare-auth/session',{headers:{Cookie:cookie.split(';')[0]}});assert.equal(r.status,503);assert.equal(r.headers.get('Set-Cookie'),null);await db.prepare("UPDATE d1_auth_sync_state SET status='verified'").run();assert.equal((await (await mf.dispatchFetch(origin+'/api/cloudflare-auth/session',{headers:{Cookie:cookie.split(';')[0]}})).json()).user.id,userId)});
 await check('Workers logout revokes persisted session; refresh becomes guest',async()=>{assert.equal((await post('logout',{}, {Cookie:cookie.split(';')[0]})).status,200);const r=await mf.dispatchFetch(origin+'/api/cloudflare-auth/session',{headers:{Cookie:cookie.split(';')[0]}});assert.equal((await r.json()).user,null);assert.equal((await db.prepare('SELECT count(*) n FROM d1_auth_sessions WHERE revoked_at IS NOT NULL').first()).n,1)});
 await check('Workers revoked login cookie cannot resolve course rights',async()=>{const r=await mf.dispatchFetch(origin+'/fixture/student-access',{headers:{Cookie:cookie.split(';')[0]}});assert.deepEqual(await r.json(),{status:'guest',userId:null,ownedSlugs:[]})});
 await check('Workers D1 limiter denies sixth email attempt across requests',async()=>{for(let i=0;i<4;i++)assert.equal((await post('login',{email,password:'wrong'})).status,401);const r=await post('login',{email,password});assert.equal(r.status,429);assert(Number(r.headers.get('Retry-After'))>0);assert.equal((await db.prepare('SELECT count(*) n FROM d1_auth_sessions').first()).n,1)});
 console.log(JSON.stringify({status:'PASS',runtime:'local workerd + D1 binding',checks,limit:'Synthetic HTTP integration only; no hosted CPU, real QA login, OAuth, imported accounts or app /learn routes'}));
}finally{await mf.dispose()}
