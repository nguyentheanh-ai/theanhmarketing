import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const built=await build({entryPoints:['lib/cloudflare/d1-student-progress-read.ts'],bundle:true,platform:'node',format:'esm',write:false});
const core=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const file of ['d1-lms-compatibility-prototype.sql','d1-course-access-source-prototype.sql','d1-lms-legacy-enrollment-owners-prototype.sql'])db.exec(readFileSync('scripts/'+file,'utf8'));
 const stamp='2026-10-18T12:00:00Z',subject={id:'student',email:'qa@example.invalid'};
 db.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').run(subject.id,subject.email);
 db.prepare("INSERT INTO d1_access_sync_state VALUES('vsxxgdzwtscuxcmjfckt',?,?,'verified')").run(stamp,stamp);
 db.exec("INSERT INTO d1_lms_courses VALUES('course','course-slug','published','enrolled'); INSERT INTO d1_lms_modules VALUES('module','course','published')");
 for(const [id,playable] of [['one',1],['two',1],['empty',0]])db.prepare("INSERT INTO d1_lms_lessons VALUES(?,'course','module',?,'published',?)").run(id,id,playable);
 function enroll(id,user=subject.id,metadata='{}',slug='course-slug'){
  db.prepare("INSERT INTO d1_lms_enrollments(id,user_id,course_id,course_slug,status,updated_at,metadata) VALUES(?,?,'course',?,'active',?,?)").run(id,user,slug,stamp,metadata);
 }
 function complete(id,enrollment,lesson='one'){
  db.prepare("INSERT INTO d1_lms_progress VALUES(?,?,?,'completed',100,?,?, '{}')").run(id,enrollment,lesson,stamp,stamp);
 }
 const read=(q,p)=>Promise.resolve(db.prepare(q).get(...p));
 return {db,subject,enroll,complete,read,options:{now:Date.parse(stamp)}};
}
test('progress uses playable denominator and this enrollment completion rows, ignoring stored percentage when lessons exist',async t=>{
 const f=fixture(t);f.enroll('mine',undefined,'{"progress_percent":99}');f.enroll('other','someone-else');
 f.complete('p','mine');f.complete('q','other','two');
 const result=await core.readD1StudentCourseProgress(f.read,f.subject,f.options);
 assert.equal(result.progressBySlug['course-slug'],50);assert.equal(result.lessonCountsBySlug['course-slug'],2);
 assert.deepEqual(result.completedLessonIds,['one']);
 f.db.prepare("UPDATE d1_lms_progress SET status='in_progress',completed_at=NULL WHERE id='p'").run();
 assert.equal((await core.readD1StudentCourseProgress(f.read,f.subject,f.options)).progressBySlug['course-slug'],0);
});
test('old unresolved slug falls back to Source course-ID published count; zero lessons use bounded numeric metadata',async t=>{
 const f=fixture(t);f.enroll('mine',undefined,'{"progress_percent":"47"}','old-slug');f.complete('p','mine');
 assert.equal((await core.readD1StudentCourseProgress(f.read,f.subject,f.options)).progressBySlug['course-slug'],33);
 f.db.exec("UPDATE d1_lms_lessons SET status='draft'");
 assert.equal((await core.readD1StudentCourseProgress(f.read,f.subject,f.options)).progressBySlug['course-slug'],47);
 f.db.exec("UPDATE d1_lms_enrollments SET metadata='{\"progress_percent\":150}'");
 assert.equal((await core.readD1StudentCourseProgress(f.read,f.subject,f.options)).progressBySlug['course-slug'],100);
});
test('conflicting first enrollment progress fails closed because Source RPC has no ordering guarantee',async t=>{
 const f=fixture(t);f.enroll('a');f.enroll('b',null);f.db.exec("UPDATE d1_lms_enrollments SET metadata='{\"student_email\":\"qa@example.invalid\"}' WHERE id='b'");
 f.complete('p','a');
 await assert.rejects(core.readD1StudentCourseProgress(f.read,f.subject,f.options),/Ambiguous source progress order/);
 f.complete('q','b');
 assert.equal((await core.readD1StudentCourseProgress(f.read,f.subject,f.options)).progressBySlug['course-slug'],50);
});
test('identity swaps and stale mirrors cannot read progress',async t=>{
 const f=fixture(t);f.enroll('mine');
 await assert.rejects(core.readD1StudentCourseProgress(f.read,{...f.subject,email:'other@example.invalid'},f.options),/identity/);
 await assert.rejects(core.readD1StudentCourseProgress(f.read,f.subject,{now:f.options.now+300001}),/current and verified/);
});
