import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-student-session-access";export * from "./lib/cloudflare/d1-course-content";export * from "./lib/cloudflare/d1-student-http";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {readD1StudentSessionProgress,readD1StudentSessionAccess,readD1StudentLesson,prepareD1CourseContent,handleD1StudentHttp}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const now=Date.parse('2026-10-15T00:00:00Z'),stamp=new Date(now).toISOString(),project='vsxxgdzwtscuxcmjfckt';
const token='a'.repeat(43),hash=createHash('sha256').update(token).digest('hex');
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const file of ['d1-lms-compatibility-prototype.sql','d1-course-access-source-prototype.sql','d1-lms-legacy-enrollment-owners-prototype.sql','d1-auth-core-prototype.sql','d1-course-content-prototype.sql'])sql.exec(readFileSync('scripts/'+file,'utf8'));
 for(const [id,email] of [['user-a','a@example.invalid'],['user-b','b@example.invalid']]){sql.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').run(id,email);sql.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?)').run(id,stamp,stamp,stamp)}
 sql.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(hash,'user-a',project,'family',1,stamp,new Date(now+3600000).toISOString());
 for(const table of ['d1_auth_sync_state','d1_access_sync_state'])sql.prepare(`INSERT INTO ${table} VALUES(?,?,?,?)`).run(project,stamp,stamp,'verified');
 sql.prepare('INSERT INTO d1_access_orders VALUES(?,?,?,?,?,?,?,NULL)').run('oa','a@example.invalid','paid','course-a','Fixture',null,null);
 sql.prepare('INSERT INTO d1_access_orders VALUES(?,?,?,?,?,?,?,NULL)').run('ob','b@example.invalid','paid','course-b','Fixture',null,null);
 let onAccess;
 const db={first:async(q,p)=>{if(onAccess&&q.includes('legacy_evidence_json')){const hook=onAccess;onAccess=null;hook()}return sql.prepare(q).get(...p)??null},batch:async()=>{throw new Error('Reader must not write')}};
 return {sql,db,read:(value=token,allowedUserIds)=>readD1StudentSessionAccess(db,value,{now,sessionTtlMs:3600000,allowedUserIds}),race:hook=>{onAccess=hook}};
}
test('opaque session resolves only its own original user and course rights without writing',async t=>{const f=fixture(t),r=await f.read();assert.equal(r.status,'student');assert.equal(r.user.id,'user-a');assert.deepEqual(r.access.ownedSlugs,['course-a']);assert(!r.access.ownedSlugs.includes('course-b'));assert.equal((await f.read('user-b')).status,'guest')});
test('revoked, expired, foreign-project and changed-version sessions cannot read rights',async t=>{const f=fixture(t);for(const [q,p] of [["UPDATE d1_auth_sessions SET revoked_at=?",[stamp]],["UPDATE d1_auth_sessions SET expires_at=?",[stamp]],["UPDATE d1_auth_sessions SET project_id=?",['pppiqhkectojxbmhqcnx']],["UPDATE d1_auth_accounts SET session_version=2 WHERE user_id='user-a'",[]]]){f.sql.exec('SAVEPOINT scenario');f.sql.prepare(q).run(...p);assert.equal((await f.read()).status,'guest');f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario')}});
test('must-change-password returns redirect status before exposing rights; admin path is not silently downgraded',async t=>{const f=fixture(t);f.sql.exec("UPDATE d1_auth_accounts SET must_change_password=1 WHERE user_id='user-a'");const r=await f.read();assert.equal(r.status,'password-change-required');assert.equal(r.access,undefined);f.sql.exec("UPDATE d1_auth_accounts SET must_change_password=0;UPDATE d1_access_users SET admin_role='owner' WHERE id='user-a'");await assert.rejects(f.read(),/Admin access projection/) });
test('revocation between session lookup and rights query is denied in the rights statement',async t=>{const f=fixture(t);f.race(()=>f.sql.prepare('UPDATE d1_auth_sessions SET revoked_at=?').run(stamp));assert.equal((await f.read()).status,'guest')});
test('credential/status/password-change races cannot use the earlier session lookup',async t=>{const f=fixture(t);for(const q of ["UPDATE d1_auth_accounts SET session_version=2 WHERE user_id='user-a'","UPDATE d1_auth_accounts SET deleted_at='2026-10-15T00:00:00Z' WHERE user_id='user-a'","UPDATE d1_auth_accounts SET must_change_password=1 WHERE user_id='user-a'","UPDATE d1_auth_accounts SET banned_until='2026-10-16T00:00:00Z' WHERE user_id='user-a'"]){f.sql.exec('SAVEPOINT scenario');f.race(()=>f.sql.exec(q));assert.equal((await f.read()).status,'guest');f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario')}});
test('both Auth and rights projections must be current, including mirror changes during the rights query',async t=>{const f=fixture(t);for(const table of ['d1_auth_sync_state','d1_access_sync_state']){f.sql.exec('SAVEPOINT scenario');f.sql.prepare(`UPDATE ${table} SET source_snapshot_at=?`).run(new Date(now-300001).toISOString());await assert.rejects(f.read(),/current and verified/);f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario')}f.race(()=>f.sql.exec("UPDATE d1_auth_sync_state SET status='pending'"));await assert.rejects(f.read(),/current and verified/)});

test('explicit empty QA cohort cannot return access for a valid existing session',async t=>{const f=fixture(t);assert.equal((await f.read(token,[])).status,'guest')});

const cid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function content(f,{visibility='enrolled',slug='course-a'}={}){
 const source={id:cid(1),slug,title:'Fixture',status:'open',lms_status:'published',visibility,course_modules:[{id:cid(2),course_id:cid(1),title:'Module',status:'published',sort_order:1,lessons:[{id:cid(3),module_id:cid(2),course_id:cid(1),title:'Free',status:'published',sort_order:1,content:'Preview',access_type:'free_preview',youtube_url:'https://youtu.be/free1234567',embed_url:null,lesson_resources:[]},{id:cid(4),module_id:cid(2),course_id:cid(1),title:'Paid',status:'published',sort_order:2,content:'Protected lesson',access_type:'enrolled_only',youtube_url:'https://youtu.be/paid1234567',embed_url:null,lesson_resources:[{lesson_id:cid(4),title:'Protected file',url:'https://files.example.invalid/private.pdf'}]}]}]};
 const plan=await prepareD1CourseContent(source,stamp);f.sql.prepare(plan.sql).run(...plan.params);f.sql.prepare('INSERT INTO d1_course_content_sync VALUES(?,?,?,?,?)').run(project,stamp,stamp,'verified',1);
 return {read:(lessonId=cid(4),courseSlug=slug,allowedUserIds)=>readD1StudentLesson(f.db,token,{courseSlug,lessonId},{now,sessionTtlMs:3600000,allowedUserIds})};
}
test('lesson snapshot uses native session and same-statement rights/content, with minimal navigation',async t=>{
 const f=fixture(t),c=await content(f),r=await c.read();assert.equal(r.status,'lesson');assert.equal(r.currentLesson.id,cid(4));assert.equal(r.currentLesson.content,'Protected lesson');assert.deepEqual(r.previousLesson,{id:cid(3)});assert.equal(r.nextLesson,undefined);assert.equal(r.currentLessonCompleted,false);assert.equal(r.user,undefined);assert.equal(r.access,undefined);assert.equal(r.content,undefined);assert.equal(r.legacyAccessProof,undefined);
 const legacy=await c.read('lesson-1');assert.equal(legacy.currentLesson.id,cid(3));assert.equal((await c.read('missing')).status,'redirect');
 assert.equal((await c.read(cid(4),'course-a',[])).status,'guest');
});
test('unowned private content and paid lesson media cannot leave the snapshot boundary',async t=>{
 const f=fixture(t),c=await content(f);f.sql.exec("DELETE FROM d1_access_orders WHERE id='oa'");assert.deepEqual(await c.read(),{status:'forbidden'});assert.deepEqual(await c.read('missing'),{status:'forbidden'});
});
test('public preview exposes only its own media and neighboring IDs; paid target still denied',async t=>{
 const f=fixture(t),c=await content(f,{visibility:'public'});f.sql.exec("DELETE FROM d1_access_orders WHERE id='oa'");const preview=await c.read(cid(3));assert.equal(preview.status,'lesson');assert.deepEqual(preview.nextLesson,{id:cid(4)});assert.equal(preview.lessons[1].youtubeUrl,'');assert(!JSON.stringify(preview).includes('Protected lesson'));assert(!JSON.stringify(preview).includes('private.pdf'));assert(!JSON.stringify(preview).includes('paid1234567'));assert.deepEqual(await c.read(),{status:'forbidden'});
});
test('grant/session/content races are observed by the single guarded snapshot query',async t=>{
 const f=fixture(t),c=await content(f);
 for(const [sql,status] of [["DELETE FROM d1_access_orders WHERE id='oa'",'forbidden'],["UPDATE d1_auth_sessions SET revoked_at='2026-10-15T00:00:00Z'",'guest']]){f.sql.exec('SAVEPOINT scenario');f.race(()=>f.sql.exec(sql));assert.equal((await c.read()).status,status);f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario');}
 f.race(()=>f.sql.exec("UPDATE d1_course_content_sync SET status='pending'"));await assert.rejects(c.read(),/Verified course content/);
});
test('lesson HTTP rejects subject injection/duplicate keys and does not serialize private proof',async t=>{
 const f=fixture(t);await content(f);const origin='https://fixture.example.invalid',options={db:f.db,origin,now,sessionTtlMs:3600000};
 const request=query=>new Request(origin+'/api/cloudflare-student/lesson?'+query,{headers:{Cookie:'__Host-tam-session='+token}});
 for(const query of ['courseSlug=course-a&lessonId='+cid(4)+'&userId=user-b','courseSlug=course-a&courseSlug=course-b&lessonId='+cid(4),'courseSlug=course-a'])assert.equal((await handleD1StudentHttp(request(query),options)).status,400);
 const response=await handleD1StudentHttp(request('courseSlug=course-a&lessonId='+cid(4)),options);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'private, no-store');const body=await response.json();assert.equal(body.currentLesson.id,cid(4));assert.equal(body.access,undefined);assert.equal(body.user,undefined);assert.equal(body.content,undefined);assert(!JSON.stringify(body).includes('evidenceJson'));
});

test('dashboard progress uses the opaque session and rechecks revocation/cohort in the same snapshot',async t=>{
 const f=fixture(t),read=allowedUserIds=>readD1StudentSessionProgress(f.db,token,{now,sessionTtlMs:3600000,allowedUserIds});
 const result=await read();assert.equal(result.status,'student');assert.equal(result.access.progressBySlug['course-a'],0);assert.equal(result.access.progressBySlug['course-b'],undefined);
 assert.equal((await read([])).status,'guest');
 f.race(()=>f.sql.prepare('UPDATE d1_auth_sessions SET revoked_at=?').run(stamp));
 assert.equal((await read()).status,'guest');
});
test('dashboard progress HTTP rejects injected subjects, cross-site requests and serializes no access evidence',async t=>{
 const f=fixture(t),origin='https://fixture.example.invalid',path='/api/cloudflare-student/dashboard-progress';
 const options={db:f.db,origin,now,sessionTtlMs:3600000};
 const call=(query='',headers={Cookie:'__Host-tam-session='+token},method='GET')=>handleD1StudentHttp(new Request(origin+path+query,{method,headers}),options);
 const good=await call();assert.equal(good.status,200);assert.equal(good.headers.get('Cache-Control'),'private, no-store');assert.equal(good.headers.get('Vary'),'Cookie');
 const body=await good.json();assert.deepEqual(body.ownedSlugs,['course-a']);assert.equal(body.progressBySlug['course-a'],0);
 for(const name of ['user','access','legacyAccessProof','enrollmentIdsBySlug','completedLessonIds','userId'])assert.equal(body[name],undefined);
 for(const query of ['?userId=user-b','?courseSlug=course-b','?email=b@example.invalid'])assert.equal((await call(query)).status,400);
 assert.equal((await call('',{})).status,401);assert.equal((await call('',{},'POST')).status,405);
 assert.equal((await call('',{Cookie:'__Host-tam-session='+token,Origin:'https://foreign.example.invalid'})).status,403);
 assert.equal((await call('',{Cookie:'__Host-tam-session='+token,'Sec-Fetch-Site':'cross-site'})).status,403);
 f.sql.exec("UPDATE d1_access_sync_state SET status='stale'");assert.equal((await call()).status,503);
});
