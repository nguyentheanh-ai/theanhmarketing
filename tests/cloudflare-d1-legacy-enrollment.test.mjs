import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import {createHash} from "node:crypto";
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-lesson-progress";export * from "./lib/cloudflare/d1-progress-publication";export * from "./lib/cloudflare/d1-course-content";',resolveDir:process.cwd()},bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const writer=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const accessBundle=await build({entryPoints:["lib/cloudflare/d1-course-access.ts"],bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const {readD1StudentCourseAccess}=await import(`data:text/javascript;base64,${Buffer.from(accessBundle.outputFiles[0].text).toString("base64")}`);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const now=Date.parse("2026-10-14T14:00:00Z"),stamp=new Date(now).toISOString();

function fixture(t){
 const db=new DatabaseSync(":memory:");t.after(()=>db.close());db.exec("PRAGMA foreign_keys=ON");
 for(const name of ["d1-lms-compatibility-prototype.sql","d1-course-access-source-prototype.sql","d1-lms-progress-operations-prototype.sql","d1-lms-legacy-enrollment-owners-prototype.sql"]) db.exec(readFileSync(`scripts/${name}`,"utf8"));
 for(const [n,email] of [[1,"qa@example.invalid"],[2,"other@example.invalid"]]) db.prepare("INSERT INTO d1_access_users VALUES (?,?,NULL)").run(id(n),email);
 db.prepare("INSERT INTO d1_access_sync_state VALUES (?,?,?,'verified')").run("vsxxgdzwtscuxcmjfckt",stamp,stamp);
 db.prepare("INSERT INTO d1_lms_courses VALUES (?,?,'published','enrolled')").run(id(3),"qa-course");
 db.prepare("INSERT INTO d1_lms_modules VALUES (?,?,'published')").run(id(4),id(3));
 for(const n of [5,6])db.prepare("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,'published',1)").run(id(n),id(3),id(4),`lesson-${n}`);
 const input={userId:id(1),email:"qa@example.invalid",courseSlug:"qa-course",lessonId:id(5),lessonTitle:"Fixture",operationId:id(10)};
 const read=async(sql,params)=>db.prepare(sql).get(...params)??null;
 const execute=async(statements,failAt=-1)=>{db.exec("BEGIN IMMEDIATE");try{const result=statements.map((s,i)=>{if(i===failAt)throw new Error("injected fault");return {results:db.prepare(s.sql).all(...s.params)}});db.exec("COMMIT");return result}catch(e){db.exec("ROLLBACK");throw e}};
 const write=(patch={},failAt=-1)=>writer.markD1LegacyAwareLessonCompleted(read,s=>execute(s,failAt),{...input,...patch},{now});
 const getAccess=(userId=id(1),email="qa@example.invalid")=>readD1StudentCourseAccess(read,{id:userId,email},{now});
 const paid=()=>db.prepare("INSERT INTO d1_access_orders VALUES (?,?,'paid','qa-course','Fixture',NULL,NULL,NULL)").run(id(30),"qa@example.invalid");
 const override=(source,n=40)=>db.prepare("INSERT INTO d1_access_overrides VALUES (?,?,?,?,NULL)").run(id(n),"qa@example.invalid",source,stamp);
 const counts=()=>({enrollments:db.prepare("SELECT count(*) n FROM d1_lms_enrollments").get().n,owners:db.prepare("SELECT count(*) n FROM d1_lms_legacy_enrollment_owners").get().n,progress:db.prepare("SELECT count(*) n FROM d1_lms_progress").get().n,operations:db.prepare("SELECT count(*) n FROM d1_lms_progress_operations").get().n});
 return{db,read,execute,write,getAccess,paid,override,counts,input};
}

test("paid-only student can persist progress; repeated writes keep one mapped enrollment",async(t)=>{
 const f=fixture(t);f.paid();const first=await f.write();assert.equal(first.progressPercent,50);
 assert.equal(f.db.prepare("SELECT user_id FROM d1_lms_legacy_enrollment_owners").get().user_id,id(1));
 assert.deepEqual(await f.write(),first);
 assert.equal((await f.write({operationId:id(11),lessonId:id(6)})).progressPercent,100);
 assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:2,operations:2});
 assert.deepEqual((await f.getAccess()).completedLessonIds.sort(),[id(5),id(6)]);
});

test("revocation immediately hides derived rights and completed lessons and denies writes",async(t)=>{
 const f=fixture(t);f.paid();await f.write();f.override("admin-access-revoke:qa-course");
 const access=await f.getAccess();assert.deepEqual(access.ownedSlugs,[]);assert.deepEqual(access.completedLessonIds,[]);
 await assert.rejects(f.write({operationId:id(11),lessonId:id(6)}),/not authorized/);
 await assert.rejects(f.write(),/not authorized/);
 assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:1,operations:1});
});

test("regrant reuses original derived enrollment and retained progress",async(t)=>{
 const f=fixture(t);f.paid();const first=await f.write();f.override("admin-access-revoke:qa-course",40);f.override("admin-access-grant:qa-course",41);
 const next=await f.write({operationId:id(11),lessonId:id(6)});assert.equal(next.enrollmentId,first.enrollmentId);assert.equal(next.progressPercent,100);
 assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:2,operations:2});
});

test("changed source between read and transaction rejects stale evidence without any writes",async(t)=>{
 const f=fixture(t);f.paid();const statements=await writer.prepareD1LegacyAwareLessonCompletionBatch(f.read,f.input,{now});
 f.db.exec("UPDATE d1_access_orders SET status='pending'");
 const results=await f.execute(statements);assert.equal(results.at(-1).results.length,0);
 assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});

test("a refund or changed deposit plan cannot leave a permanent LMS grant",async(t)=>{
 const f=fixture(t);f.paid();await f.write();f.db.exec("UPDATE d1_access_orders SET status='refunded'");
 assert.deepEqual((await f.getAccess()).ownedSlugs,[]);await assert.rejects(f.write({operationId:id(11)}),/not authorized/);
});

test("native LMS access stays independent of legacy revoke and its IDs are preserved",async(t)=>{
 const f=fixture(t);f.paid();f.db.prepare("INSERT INTO d1_lms_enrollments VALUES (?,NULL,?,?,?,'active',NULL,?,'{}',NULL)").run(id(8),id(1),id(3),"qa-course",stamp);
 f.override("admin-access-revoke:qa-course");const r=await f.write();assert.equal(r.enrollmentId,id(8));
 assert.deepEqual(f.counts(),{enrollments:1,owners:0,progress:1,operations:1});
 assert.deepEqual((await f.getAccess()).ownedSlugs,["qa-course"]);
});

test("inactive native enrollment is preserved while paid rights get a separate owner mapping",async(t)=>{
 const f=fixture(t);f.paid();f.db.prepare("INSERT INTO d1_lms_enrollments VALUES (?,NULL,?,?,?,'revoked',NULL,?,'{}',NULL)").run(id(8),id(1),id(3),"qa-course",stamp);
 const result=await f.write();assert.notEqual(result.enrollmentId,id(8));
 assert.equal(f.db.prepare("SELECT status FROM d1_lms_enrollments WHERE id=?").get(id(8)).status,"revoked");
 assert.deepEqual(f.counts(),{enrollments:2,owners:1,progress:1,operations:1});
});

test("another student and forged client permission fields cannot provision or read progress",async(t)=>{
 const f=fixture(t);f.paid();await f.write();
 await assert.rejects(f.write({userId:id(2),email:"other@example.invalid",operationId:id(11),legacyAccessProof:{evidenceJson:"fake",allowedSlugs:["qa-course"]}}),/not authorized/);
 assert.deepEqual((await f.getAccess(id(2),"other@example.invalid")).ownedSlugs,[]);
 assert.deepEqual((await f.getAccess(id(2),"other@example.invalid")).completedLessonIds,[]);
 assert.equal(f.counts().owners,1);
});

test("a CRM metadata flag cannot impersonate the reserved ownership table",async(t)=>{
 const f=fixture(t);f.db.prepare("INSERT INTO d1_lms_enrollments VALUES (?,NULL,NULL,?,?,'active',NULL,?,?,NULL)")
  .run(id(8),id(3),"qa-course",stamp,JSON.stringify({source:"cloudflare-legacy-access",legacy_user_id:id(1)}));
 assert.deepEqual((await f.getAccess()).ownedSlugs,[]);await assert.rejects(f.write(),/not authorized/);
 assert.equal(f.counts().owners,0);
});

test("failure after progress insert rolls back derived enrollment and owner mapping too",async(t)=>{
 const f=fixture(t);f.paid();await assert.rejects(f.write({},4),/injected fault/);
 assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
 assert.equal((await f.write()).progressPercent,50);
});

test("two prepared requests create one mapped enrollment and one progress row",async(t)=>{
 const f=fixture(t);f.paid();const a=await writer.prepareD1LegacyAwareLessonCompletionBatch(f.read,f.input,{now});
 const b=await writer.prepareD1LegacyAwareLessonCompletionBatch(f.read,{...f.input,operationId:id(11)},{now});
 await f.execute(a);await f.execute(b);
 assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:1,operations:2});
});

test("a paid kit deposit cannot provision learning access without an explicit grant",async(t)=>{
 const f=fixture(t),kit="bo-agent-kit-x10-hieu-suat-cong-viec";
 f.db.prepare("UPDATE d1_lms_courses SET slug=?").run(kit);
 f.db.prepare("INSERT INTO d1_access_orders VALUES (?,?,'paid',?,'Fixture',?,NULL,NULL)")
  .run(id(30),"qa@example.invalid",kit,"agent-kit-preorder-deposit-399");
 await assert.rejects(f.write({courseSlug:kit}),/not authorized/);
 assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
 f.override(`admin-access-grant:${kit}`);
 assert.equal((await f.write({courseSlug:kit})).progressPercent,50);
});

test("a conflicting operation ID cannot provision another paid course as a side effect",async(t)=>{
 const f=fixture(t);f.paid();await f.write();
 f.db.prepare("INSERT INTO d1_lms_courses VALUES (?,?,'published','enrolled')").run(id(50),"second-course");
 f.db.prepare("INSERT INTO d1_lms_modules VALUES (?,?,'published')").run(id(51),id(50));
 f.db.prepare("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,'published',1)").run(id(52),id(50),id(51),"second-lesson");
 f.db.prepare("INSERT INTO d1_access_orders VALUES (?,?,'paid','second-course','Fixture',NULL,NULL,NULL)").run(id(53),"qa@example.invalid");
 await assert.rejects(f.write({courseSlug:"second-course",lessonId:id(52)}),/not authorized or operation conflicts/);
 assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:1,operations:1});
});

test("renaming a lesson during deployment does not turn a retry into a new intent",async(t)=>{
 const f=fixture(t);f.paid();const first=await f.write();
 assert.deepEqual(await f.write({lessonTitle:"Tên bài học đã cập nhật"}),first);
 assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:1,operations:1});
});


function authFixture(t){
 const f=fixture(t),project='vsxxgdzwtscuxcmjfckt',token='a'.repeat(43),otherToken='b'.repeat(43);
 f.db.exec(readFileSync('scripts/d1-auth-core-prototype.sql','utf8'));
 f.db.prepare("INSERT INTO d1_auth_sync_state VALUES(?,?,?,'verified')").run(project,stamp,stamp);
 for(const [n,value] of [[1,token],[2,otherToken]]){
  f.db.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?)').run(id(n),stamp,stamp,stamp);
  f.db.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(createHash('sha256').update(value).digest('hex'),id(n),project,id(100+n),1,stamp,new Date(now+3600000).toISOString());
 }
 let hook,failAt=-1,batchStamp;
 const db={first:f.read,batch:async statements=>{batchStamp=statements[0].params[4];if(hook){const run=hook;hook=null;await run()}return f.execute(statements,failAt)}};
 const write=(patch={},value=token,live=false)=>writer.markD1SessionLessonCompleted(db,value,{courseSlug:'qa-course',lessonId:id(5),operationId:id(10),...patch},{...(live?{}:{now}),sessionTtlMs:3600000,qaUserIds:[id(1),id(2)],resolveLesson:async(course,lesson)=>course==='qa-course'&&[id(5),id(6)].includes(lesson)?{id:lesson,title:'Backend lesson title'}:null});
 return {...f,authDb:db,write,batchStamp:()=>batchStamp,token,otherToken,beforeBatch:fn=>{hook=fn},fail:n=>{failAt=n}};
}

test('native session writes own progress with backend title and ignores forged subject fields',async t=>{
 const f=authFixture(t);f.paid();const result=await f.write({userId:id(2),email:'other@example.invalid',lessonTitle:'Forged'});
 assert.equal(result.progressPercent,50);assert.equal(f.db.prepare('SELECT user_id,lesson_title FROM d1_lms_progress_operations').get().user_id,id(1));assert.equal(f.db.prepare('SELECT lesson_title FROM d1_lms_progress_operations').get().lesson_title,'Backend lesson title');
 assert.deepEqual(await f.write(),result);assert.equal((await f.write({lessonId:id(6),operationId:id(11)})).progressPercent,100);
});
test('foreign session cannot mutate the paid owner enrollment or progress',async t=>{
 const f=authFixture(t);f.paid();await assert.rejects(f.write({},f.otherToken),/not authorized|transaction unavailable/);await assert.rejects(f.write({},'invalid'),/Verified student/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});
test('session revoked immediately before the atomic batch leaves no provision or progress',async t=>{
 const f=authFixture(t);f.paid();f.beforeBatch(()=>f.db.prepare('UPDATE d1_auth_sessions SET revoked_at=? WHERE user_id=?').run(stamp,id(1)));await assert.rejects(f.write(),/not authorized|transaction unavailable/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});
test('expiry, credential version, ban, password-change and Auth mirror races deny every write',async t=>{
 for(const q of ["UPDATE d1_auth_sessions SET expires_at='2026-10-14T14:00:00Z' WHERE user_id='"+id(1)+"'","UPDATE d1_auth_accounts SET session_version=2 WHERE user_id='"+id(1)+"'","UPDATE d1_auth_accounts SET banned_until='2026-10-16T00:00:00Z' WHERE user_id='"+id(1)+"'","UPDATE d1_auth_accounts SET must_change_password=1 WHERE user_id='"+id(1)+"'","UPDATE d1_auth_sync_state SET status='pending'"]){const f=authFixture(t);f.paid();f.beforeBatch(()=>f.db.exec(q));await assert.rejects(f.write(),/not authorized|transaction unavailable/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})}
});
test('previously applied operation cannot return a replay response after session revocation',async t=>{
 const f=authFixture(t);f.paid();await f.write();const before=f.counts();f.beforeBatch(()=>f.db.prepare('UPDATE d1_auth_sessions SET revoked_at=?').run(stamp));await assert.rejects(f.write(),/not authorized|transaction unavailable/);assert.deepEqual(f.counts(),before);
});
test('native-session transaction failure rolls back enrollment owner progress and ledger together',async t=>{
 const f=authFixture(t);f.paid();f.fail(4);await assert.rejects(f.write(),/transaction unavailable/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});f.fail(-1);assert.equal((await f.write()).progressPercent,50);
});
test('missing backend lesson, admin and forced password change stop before mutation',async t=>{
 const f=authFixture(t);f.paid();await assert.rejects(f.write({lessonId:id(999)}),/Published lesson/);f.db.prepare('UPDATE d1_access_users SET admin_role=? WHERE id=?').run('owner',id(1));await assert.rejects(f.write(),/Verified student/);f.db.exec('UPDATE d1_access_users SET admin_role=NULL');f.db.prepare('UPDATE d1_auth_accounts SET must_change_password=1 WHERE user_id=?').run(id(1));await assert.rejects(f.write(),/Verified student/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});

test('queued real-clock D1 batch cannot use a planning timestamp from before session expiry',async t=>{
 const f=authFixture(t);f.paid();const fresh=new Date().toISOString();
 for(const table of ['d1_auth_sync_state','d1_access_sync_state'])f.db.prepare(`UPDATE ${table} SET source_snapshot_at=?,last_verified_at=?`).run(fresh,fresh);
 const expiry=Date.now()+300;f.db.prepare('UPDATE d1_auth_sessions SET expires_at=?').run(new Date(expiry).toISOString());
 f.beforeBatch(async()=>{assert(Date.parse(f.batchStamp())<expiry);await new Promise(resolve=>setTimeout(resolve,450))});
 await assert.rejects(f.write({},f.token,true),/not authorized|transaction unavailable/);assert(Date.now()>expiry);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});

test('malformed completion intent cannot coerce false text to completed progress',async t=>{const f=authFixture(t);f.paid();for(const patch of [{completed:'false'},{completed:null},{operationId:'invalid'},{lessonId:42},{courseSlug:[]}])await assert.rejects(f.write(patch),/Invalid student progress intent/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})});

test('native progress writer is disabled without a valid explicit backend QA cohort',async t=>{const f=authFixture(t);f.paid();const options={now,sessionTtlMs:3600000,resolveLesson:async()=>({id:id(5),title:'Backend'})};for(const cohort of [undefined,[],['invalid'],[id(1),id(1)]])await assert.rejects(writer.markD1SessionLessonCompleted(f.authDb,f.token,f.input,{...options,qaUserIds:cohort}),/authority unavailable/);await assert.rejects(writer.markD1SessionLessonCompleted(f.authDb,f.token,f.input,{...options,qaUserIds:[id(2)]}),/not authorized|transaction unavailable/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})});

const httpBundle=await build({entryPoints:['lib/cloudflare/d1-student-http.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {handleD1StudentHttp}=await import('data:text/javascript;base64,'+Buffer.from(httpBundle.outputFiles[0].text).toString('base64'));
function transport(f){const origin='https://qa-fixture.invalid';return {options:{db:f.authDb,origin,now,sessionTtlMs:3600000,resolveLesson:async()=>({id:id(5),title:'Backend'})},post:(body={},headers={})=>new Request(origin+'/api/cloudflare-student/progress',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:'__Host-tam-session='+f.token,...headers},body:JSON.stringify(body)}),get:()=>new Request(origin+'/api/cloudflare-student/access',{headers:{Cookie:'__Host-tam-session='+f.token}})}}
test('student HTTP defaults to write-disabled, preserves cookie and never returns internal access evidence',async t=>{const f=authFixture(t);f.paid();const h=transport(f);const read=await handleD1StudentHttp(h.get(),h.options);assert.equal(read.status,200);const data=await read.json();assert.deepEqual(data.ownedSlugs,['qa-course']);assert.equal(data.legacyAccessProof,undefined);assert.equal(data.legacyOwnedSlugs,undefined);assert.equal(read.headers.get('Cache-Control'),'private, no-store');const r=await handleD1StudentHttp(h.post(),h.options);assert.equal(r.status,503);assert.equal((await r.json()).code,'WRITE_DISABLED');assert.equal(r.headers.get('Set-Cookie'),null);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})});
test('student HTTP rejects QA authority injection, bad method/body/Origin and a cohort excluding the logged-in user',async t=>{const f=authFixture(t);f.paid();const h=transport(f),options={...h.options,qaWriteUserIds:[id(1)]},body={courseSlug:'qa-course',lessonId:id(5),operationId:id(10)};for(const patch of [{qaUserIds:[id(1)]},{userId:id(2)},{email:'other@example.invalid'},{legacyAccessProof:{}},{completed:'false'}])assert.equal((await handleD1StudentHttp(h.post({...body,...patch}),options)).status,400);assert.equal((await handleD1StudentHttp(h.post(body,{Origin:'https://attacker.invalid'}),options)).status,403);assert.equal((await handleD1StudentHttp(h.post(body,{'Sec-Fetch-Site':'cross-site'}),options)).status,403);assert.equal((await handleD1StudentHttp(h.post(body,{'Content-Type':'text/plain'}),options)).status,400);assert.equal((await handleD1StudentHttp(new Request(h.get(),{method:'POST',body:'{}'}),options)).status,405);assert.equal((await handleD1StudentHttp(h.post(body),{...options,qaWriteUserIds:[id(2)]})).status,403);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})});

test('HTTP write cohort cannot exceed its configured identity read cohort',async t=>{const f=authFixture(t);f.paid();const h=transport(f);const r=await handleD1StudentHttp(h.post({courseSlug:'qa-course',lessonId:id(5),operationId:id(10)}),{...h.options,allowedUserIds:[id(2)],qaWriteUserIds:[id(1)]});assert.equal(r.status,503);assert.equal((await r.json()).code,'WRITE_DISABLED');assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})});


async function publishedFixture(t){
 const f=authFixture(t);f.paid();f.db.exec(readFileSync('scripts/d1-course-content-prototype.sql','utf8'));
 const source={id:id(3),slug:'qa-course',title:'Khóa thử',status:'open',lms_status:'published',visibility:'enrolled',price:100,course_modules:[{id:id(4),course_id:id(3),title:'Module',sort_order:1,status:'published',lessons:[5,6].map(n=>({id:id(n),module_id:id(4),course_id:id(3),title:'Bài '+n,sort_order:n,status:'published',lesson_type:'video',youtube_url:'https://youtu.be/abcdef12345',embed_url:null,access_type:'enrolled_only',lesson_resources:[]}))}]};
 const prepared=await writer.prepareD1CourseContent(source,stamp);f.db.prepare(prepared.sql).run(...prepared.params);f.db.prepare("INSERT INTO d1_course_content_sync VALUES(?,?,?,'verified',1)").run('vsxxgdzwtscuxcmjfckt',stamp,stamp);
 const options={now,sessionTtlMs:3600000,qaUserIds:[id(1)],requirePublicationProof:true,resolveLesson:(slug,lesson)=>writer.resolveD1ProgressLesson(f.authDb,slug,lesson,now)};
 return {...f,publishedWrite:()=>writer.markD1SessionLessonCompleted(f.authDb,f.token,f.input,options),options};
}
test('publication-bound native write completes and replays without duplicating progress or enrollment',async t=>{
 const f=await publishedFixture(t);const response=await f.publishedWrite();assert.equal(response.progressPercent,50);assert.deepEqual(await f.publishedWrite(),response);assert.deepEqual(f.counts(),{enrollments:1,owners:1,progress:1,operations:1});
});
test('content mutation after backend resolution denies every write, including provision and operation ledger',async t=>{
 const f=await publishedFixture(t);f.beforeBatch(()=>f.db.exec("UPDATE d1_course_content SET source_document=json_set(source_document,'$.title','Changed after resolution')"));await assert.rejects(f.publishedWrite(),/not authorized|transaction unavailable/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});
test('unverified or expired publication marker at execution denies progress with no side effects',async t=>{
 for(const sql of ["UPDATE d1_course_content_sync SET status='pending'","UPDATE d1_course_content_sync SET last_verified_at='2020-01-01T00:00:00Z'"]){const f=await publishedFixture(t);f.beforeBatch(()=>f.db.exec(sql));await assert.rejects(f.publishedWrite(),/not authorized|transaction unavailable/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0})}
});
test('serialized publication proof is rejected before any write even with matching fields',async t=>{
 const f=await publishedFixture(t);const lesson=await writer.resolveD1ProgressLesson(f.authDb,'qa-course',id(5),now);const forged=JSON.parse(JSON.stringify(lesson));await assert.rejects(writer.markD1SessionLessonCompleted(f.authDb,f.token,f.input,{...f.options,resolveLesson:async()=>forged}),/Verified progress publication/);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});


test('expiry after progress insertion aborts the entire native batch instead of committing a partial save',async t=>{
 const f=authFixture(t);f.paid();const fresh=new Date().toISOString();
 for(const table of ['d1_auth_sync_state','d1_access_sync_state'])f.db.prepare(`UPDATE ${table} SET source_snapshot_at=?,last_verified_at=?`).run(fresh,fresh);
 f.db.prepare('UPDATE d1_auth_sessions SET expires_at=? WHERE user_id=?').run(new Date(Date.now()+250).toISOString(),id(1));
 let insertionReached=false;f.db.function('fixture_wait',()=>{insertionReached=true;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,350);return 1});
 f.db.exec('CREATE TRIGGER fixture_expire_after_progress AFTER INSERT ON d1_lms_progress BEGIN SELECT fixture_wait(); END;');
 await assert.rejects(f.write({},f.token,true),/transaction unavailable/);assert.equal(insertionReached,true);assert.deepEqual(f.counts(),{enrollments:0,owners:0,progress:0,operations:0});
});
