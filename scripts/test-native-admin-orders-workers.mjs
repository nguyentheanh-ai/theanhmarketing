// Local fixture only, not a deployable entrypoint. Real workerd/D1 binding and
// request-scoped first-primary adapter; outbound is blocked unconditionally.
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin='https://admin-fixture.example.invalid',now=Date.parse('2026-10-18T12:00:00Z'),stamp=new Date(now).toISOString(),project='vsxxgdzwtscuxcmjfckt',uid='00000000-0000-4000-8000-000000000001',token='a'.repeat(43);
const bundle=await build({stdin:{contents:`import {handleD1AdminOrderHttp} from './lib/cloudflare/d1-admin-order-http';import {createD1AuthDatabase} from './lib/cloudflare/d1-auth-database';export default {fetch(request,env){return handleD1AdminOrderHttp(request,{db:createD1AuthDatabase(env.DB),origin:'${origin}',now:${now},configuredOwnerEmails:[],allowedRoles:['owner']})}};`,resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',write:false});
let outbound=0,checks=0;
const mf=new Miniflare({workers:[{config:{name:'admin-report',compatibilityDate:'2026-10-13',manifest:{mainModule:'fixture.mjs',modules:{'fixture.mjs':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',name:'admin-report-local',id:'admin-report-local'}}},dev:{outboundService:{type:'fetcher',handler:()=>{outbound++;return new Response(null,{status:599});}}}}]});
const check=async(name,f)=>{await f();checks++;console.log('PASS '+name);};
try{
 const db=await mf.getD1Database('DB'),worker=await mf.getWorker('admin-report');
 for(const file of ['d1-course-access-source-prototype.sql','d1-auth-core-prototype.sql','d1-admin-role-prototype.sql','d1-native-order-settlement.sql'])for(const q of readFileSync('scripts/'+file,'utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(q).run();
 await db.prepare('INSERT INTO d1_access_users VALUES(?,?,?)').bind(uid,'admin@example.invalid','owner').run();
 await db.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?)').bind(uid,stamp,stamp,stamp).run();
 await db.prepare('INSERT INTO d1_auth_source_versions VALUES(?,?,?,?)').bind(uid,'00001792324800000000','0'.repeat(64),project).run();
 await db.prepare('INSERT INTO d1_admin_source_roles VALUES(?,?,?,?)').bind(uid,project,'00001792324800000000','owner').run();
 await db.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(createHash('sha256').update(token).digest('hex'),uid,project,'fixture',1,stamp,new Date(now+3600000).toISOString()).run();
 for(const table of ['d1_auth_sync_state','d1_native_order_authority'])await db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?)`).bind(project,stamp,stamp,'verified').run();
 const order={id:'00000000-0000-4000-8000-000000000010',order_code:'TAMFIXTURE001',status:'paid',amount:100000,currency:'VND',email:'customer@example.invalid',created_at:'2026-10-10T00:00:00Z',paid_at:'2026-10-17T17:00:00Z'};
 await db.prepare('INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) VALUES(?,?,?,?,?)').bind(order.id,order.order_code,order.amount,order.status,JSON.stringify(order)).run();
 const call=(query='range=today',headers={Cookie:'__Host-tam-session='+token},method='GET')=>worker.fetch(origin+'/api/cloudflare-admin/order-report?'+query,{method,headers});
 await check('real D1 admin report returns exact aggregate without private order fields',async()=>{const r=await call();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('vary'),'Cookie');const body=await r.json();assert.equal(body.paidCustomers,1);assert.equal(body.summary.revenue,100000);assert.equal(body.summary.total,1);const raw=JSON.stringify(body);for(const value of [token,order.email,order.order_code,uid])assert(!raw.includes(value));});
 await check('guest, malformed or duplicate session cookies and cross-origin requests denied',async()=>{for(const headers of [{},{Cookie:'__Host-tam-session=user-id'},{Cookie:'__Host-tam-session='+token+'; __Host-tam-session='+token},{Cookie:'__Host-tam-session='+token,Origin:'https://foreign.example.invalid'},{Cookie:'__Host-tam-session='+token,'Sec-Fetch-Site':'cross-site'}])assert.equal((await call('range=today',headers)).status,403);});
 await check('subject injection, duplicate parameters, unsupported range/method never reach report',async()=>{for(const query of ['range=today&userId='+uid,'range=today&range=30d','range=all','range=today&dateFrom=2026-10-01'])assert.equal((await call(query)).status,400);assert.equal((await call('range=today',{},'POST')).status,405);});
 await check('revoked role and changed session version deny the next request',async()=>{await db.prepare('UPDATE d1_admin_source_roles SET protected_role=NULL').run();assert.equal((await call()).status,403);await db.prepare("UPDATE d1_admin_source_roles SET protected_role='owner'").run();await db.prepare('UPDATE d1_auth_accounts SET session_version=2').run();assert.equal((await call()).status,403);await db.prepare('UPDATE d1_auth_accounts SET session_version=1').run();});
 await check('unverified order snapshot returns unavailable and exposes no exception',async()=>{await db.prepare("UPDATE d1_native_order_authority SET status='pending'").run();const r=await call();assert.equal(r.status,503);const raw=await r.text();assert(!raw.includes('SQL'));assert(!raw.includes(order.email));});
 assert.equal(outbound,0);
 writeFileSync('reports/cloudflare-phase2-20261018/native-admin-orders-workers.json',JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),checks,scope:'Local real workerd + D1 HTTP aggregate report using synthetic fixtures',outboundFetches:outbound,productionWritten:false,hostedUiVerified:false,readyForCutover:false},null,2)+'\n');
}finally{await mf.dispose();}
