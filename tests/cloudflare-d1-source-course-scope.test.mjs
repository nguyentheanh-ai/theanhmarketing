import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const {build}=createRequire(path.resolve(process.env.PHASE2_TYPESCRIPT_ROOT??'../main','package.json'))('esbuild');
const built=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-course-access";',resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,tsconfig:'tsconfig.json'});
const core=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function fixture(t,slug='old-slug'){
  const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
  for(const name of ['d1-course-access-source-prototype.sql','d1-lms-compatibility-prototype.sql','d1-lms-legacy-enrollment-owners-prototype.sql'])sql.exec(readFileSync('scripts/'+name,'utf8'));
  const stamp=new Date().toISOString();
  sql.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').run('user','fixture@example.invalid');
  for(const [id,name] of [['a','new-course'],['b','other-published']])sql.prepare("INSERT INTO d1_lms_courses VALUES(?,?,'published','enrolled')").run(id,name);
  sql.prepare("INSERT INTO d1_lms_enrollments(id,user_id,course_id,course_slug,status,updated_at) VALUES('enrollment','user','a',?,'active',?)").run(slug,stamp);
  sql.prepare("INSERT INTO d1_access_sync_state VALUES('vsxxgdzwtscuxcmjfckt',?,?,'verified')").run(stamp,stamp);
  return {sql,subject:{id:'user',email:'fixture@example.invalid'},now:Date.parse(stamp)};
}
test('native dashboard preserves Source enrollment assignment by course ID despite old slug',async t=>{
  const f=fixture(t),actual=await core.readD1StudentCourseAccess(async(q,p)=>f.sql.prepare(q).get(...p),f.subject,{now:f.now});
  assert.deepEqual(actual.lmsOwnedSlugs,['new-course']);assert.deepEqual(actual.enrollmentIdsBySlug['new-course'],['enrollment']);
});
test('native lesson scope matches Source RPC before course-ID assignment',async t=>{
  const f=fixture(t),read=slug=>core.readD1StudentCourseAccess(async(q,p)=>f.sql.prepare(core.scopeD1StudentAccessSql(q,5)).get(...p,slug),f.subject,{now:f.now});
  assert.deepEqual((await read('new-course')).lmsOwnedSlugs,[]);
  f.sql.prepare("UPDATE d1_lms_enrollments SET course_slug='other-published'").run();
  assert.deepEqual((await read('other-published')).lmsOwnedSlugs,['other-published']);
  assert.deepEqual((await read('new-course')).lmsOwnedSlugs,[]);
  const all=await core.readD1StudentCourseAccess(async(q,p)=>f.sql.prepare(q).get(...p),f.subject,{now:f.now});
  assert.deepEqual([...all.lmsOwnedSlugs].sort(),['new-course','other-published']);
});
test('reserved legacy ownership cannot gain a second course through conflicting course ID',async t=>{
  const f=fixture(t,'other-published');
  f.sql.prepare("INSERT INTO d1_lms_legacy_enrollment_owners VALUES('enrollment','user','other-published')").run();
  f.sql.prepare("INSERT INTO d1_access_overrides VALUES('grant','fixture@example.invalid','admin-access-grant:other-published',?,NULL)").run(new Date(f.now).toISOString());
  const actual=await core.readD1StudentCourseAccess(async(q,p)=>f.sql.prepare(q).get(...p),f.subject,{now:f.now});
  assert.deepEqual(actual.lmsOwnedSlugs,['other-published']);
  assert.throws(()=>core.scopeD1StudentAccessSql('SELECT 1',5));assert.throws(()=>core.scopeD1StudentAccessSql(core.D1_STUDENT_ACCESS_SQL,4));
});
