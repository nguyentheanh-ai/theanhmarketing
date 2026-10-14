import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
const bundle=await build({entryPoints:["lib/cloudflare/d1-lesson-progress.ts"],bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
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
