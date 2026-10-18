// Local fixture harness only: latest native reader, real workerd + D1, no network.
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin='https://progress-fixture.example.invalid',now=Date.parse('2026-10-18T12:00:00Z'),stamp=new Date(now).toISOString(),project='vsxxgdzwtscuxcmjfckt',token='a'.repeat(43);
const bundle=await build({stdin:{contents:`import {handleD1StudentHttp} from './lib/cloudflare/d1-student-http';import {createD1AuthDatabase} from './lib/cloudflare/d1-auth-database';export default {fetch(request,env){return handleD1StudentHttp(request,{db:createD1AuthDatabase(env.DB),origin:'${origin}',now:${now},sessionTtlMs:3600000})}};`,resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',write:false});
let outbound=0,checks=0;
const mf=new Miniflare({workers:[{config:{name:'progress-read',compatibilityDate:'2026-10-13',manifest:{mainModule:'fixture.mjs',modules:{'fixture.mjs':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',name:'progress-read-local',id:'progress-read-local'}}},dev:{outboundService:{type:'fetcher',handler:()=>{outbound++;return new Response(null,{status:599});}}}}]});
const check=async(name,f)=>{await f();checks++;console.log('PASS '+name);};
function ddlStatements(file){const parsed=spawnSync('python3',['-c',`import sys,sqlite3,json
parts=[]
buf=''
for line in sys.stdin:
 buf+=line
 if sqlite3.complete_statement(buf):
  parts.append(buf);buf=''
if buf.strip():raise RuntimeError('Incomplete fixture DDL')
print(json.dumps(parts))`],{input:readFileSync('scripts/'+file,'utf8'),encoding:'utf8'});assert.equal(parsed.status,0,'Fixture DDL parser failed');return JSON.parse(parsed.stdout)}

try{
 const db=await mf.getD1Database('DB'),worker=await mf.getWorker('progress-read');
 for(const file of ['d1-lms-compatibility-prototype.sql','d1-course-access-source-prototype.sql','d1-lms-legacy-enrollment-owners-prototype.sql','d1-auth-core-prototype.sql'])for(const statement of ddlStatements(file))await db.prepare(statement).run();
 await db.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').bind('student','qa@example.invalid').run();
 await db.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?)').bind('student',stamp,stamp,stamp).run();
 await db.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(createHash('sha256').update(token).digest('hex'),'student',project,'fixture',1,stamp,new Date(now+3600000).toISOString()).run();
 for(const table of ['d1_auth_sync_state','d1_access_sync_state'])await db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?)`).bind(project,stamp,stamp,'verified').run();
 await db.prepare("INSERT INTO d1_lms_courses VALUES('course','fixture-course','published','enrolled')").run();
 await db.prepare("INSERT INTO d1_lms_modules VALUES('module','course','published')").run();
 for(const id of ['one','two'])await db.prepare("INSERT INTO d1_lms_lessons VALUES(?,'course','module',?,'published',1)").bind(id,id).run();
 await db.prepare("INSERT INTO d1_lms_enrollments(id,user_id,course_id,course_slug,status,updated_at) VALUES('enrollment','student','course','fixture-course','active',?)").bind(stamp).run();
 await db.prepare("INSERT INTO d1_lms_progress VALUES('progress','enrollment','one','completed',100,?,?,'{}')").bind(stamp,stamp).run();
 const call=(suffix='',headers={Cookie:'__Host-tam-session='+token},method='GET')=>worker.fetch(origin+'/api/cloudflare-student/dashboard-progress'+suffix,{method,headers});
 await check('real D1 reader returns correct 50 percent with private no-store response',async()=>{const r=await call();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('vary'),'Cookie');const body=await r.json();assert.equal(body.progressBySlug['fixture-course'],50);assert.equal(body.lessonCountsBySlug['fixture-course'],2);for(const value of [token,'qa@example.invalid','enrollment','evidenceJson'])assert(!JSON.stringify(body).includes(value));});
 await check('guest, cross-site and subject injection cannot read progress',async()=>{assert.equal((await call('',{})).status,401);assert.equal((await call('?userId=someone')).status,400);assert.equal((await call('',{},'POST')).status,405);assert.equal((await call('',{Cookie:'__Host-tam-session='+token,Origin:'https://foreign.example.invalid'})).status,403);});
 await check('revoked and changed session versions are denied by native D1 authority',async()=>{await db.prepare('UPDATE d1_auth_accounts SET session_version=2').run();assert.equal((await call()).status,401);await db.prepare('UPDATE d1_auth_accounts SET session_version=1').run();await db.prepare('UPDATE d1_auth_sessions SET revoked_at=?').bind(stamp).run();assert.equal((await call()).status,401);await db.prepare('UPDATE d1_auth_sessions SET revoked_at=NULL').run();});
 await check('ambiguous enrollment percentages return unavailable without raw errors',async()=>{await db.prepare("INSERT INTO d1_lms_enrollments(id,course_id,course_slug,status,updated_at,metadata) VALUES('duplicate','course','fixture-course','active',?,?)").bind(stamp,JSON.stringify({student_email:'qa@example.invalid'})).run();const r=await call();assert.equal(r.status,503);assert(!String(await r.text()).includes('SQL'));await db.prepare("DELETE FROM d1_lms_enrollments WHERE id='duplicate'").run();});
 await check('stale mirror blocks read without falling back to source',async()=>{await db.prepare("UPDATE d1_access_sync_state SET status='stale'").run();assert.equal((await call()).status,503);assert.equal(outbound,0);});
 writeFileSync('reports/cloudflare-phase2-20261018/native-dashboard-progress-workers.json',JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),checks,scope:'Local real workerd + D1 guarded HTTP dashboard progress with synthetic fixtures',outboundFetches:outbound,productionWritten:false,hostedUiVerified:false,readyForCutover:false},null,2)+'\n');
}finally{await mf.dispose();}
