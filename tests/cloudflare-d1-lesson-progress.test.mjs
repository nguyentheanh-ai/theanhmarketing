import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const bundle=await build({entryPoints:["lib/cloudflare/d1-lesson-progress.ts"],bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const {markD1LessonCompleted}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const id=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const now=Date.parse("2026-10-14T13:00:00Z"),stamp=new Date(now).toISOString();
function fixture(t){
 const db=new DatabaseSync(":memory:");t.after(()=>db.close());db.exec("PRAGMA foreign_keys=ON");
 for(const file of ["d1-lms-compatibility-prototype.sql","d1-course-access-source-prototype.sql","d1-lms-progress-operations-prototype.sql"]) db.exec(readFileSync(`scripts/${file}`,"utf8"));
 db.prepare("INSERT INTO d1_access_users VALUES (?,?,NULL)").run(id(1),"qa@example.invalid");
 db.prepare("INSERT INTO d1_access_users VALUES (?,?,NULL)").run(id(2),"other@example.invalid");
 db.prepare("INSERT INTO d1_access_sync_state VALUES (?,?,?,'verified')").run("vsxxgdzwtscuxcmjfckt",stamp,stamp);
 db.prepare("INSERT INTO d1_lms_courses VALUES (?,?,'published','enrolled')").run(id(3),"qa-course");
 db.prepare("INSERT INTO d1_lms_modules VALUES (?,?,'published')").run(id(4),id(3));
 for(const n of [5,6]) db.prepare("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,'published',1)").run(id(n),id(3),id(4),`lesson-${n}`);
 db.prepare("INSERT INTO d1_lms_contacts VALUES (?,?,?)").run(id(7),"qa@example.invalid","different@example.invalid");
 db.prepare("INSERT INTO d1_lms_enrollments VALUES (?,?,?,?,?,'active',NULL,?,'{}',NULL)").run(id(8),id(7),id(1),id(3),"qa-course",stamp);
 const input={userId:id(1),email:"qa@example.invalid",courseSlug:"qa-course",lessonId:id(5),lessonTitle:"Bài thử",operationId:id(10)};
 const execute=async(statements,failAt=-1)=>{
   db.exec("BEGIN IMMEDIATE");try{const results=statements.map((s,i)=>{if(i===failAt)throw new Error("injected transactional failure");return {results:db.prepare(s.sql).all(...s.params)}});db.exec("COMMIT");return results}
   catch(e){db.exec("ROLLBACK");throw e}
 };
 const write=(patch={},op=id(10),failAt=-1)=>markD1LessonCompleted(s=>execute(s,failAt),{...input,...patch,operationId:op},{now});
 return{db,write,input};
}

test("completion and undo update progress, metadata and last-seen with source status semantics",async(t)=>{
 const f=fixture(t);let r=await f.write();assert.equal(r.progressPercent,50);assert.deepEqual(r.completedLessonIds,[id(5)]);
 assert.equal(f.db.prepare("SELECT last_seen_at FROM d1_lms_enrollments").get().last_seen_at,stamp);
 r=await f.write({lessonId:id(6)},id(11));assert.equal(r.progressPercent,100);
 assert.equal(f.db.prepare("SELECT status FROM d1_lms_enrollments").get().status,"completed");
 r=await f.write({completed:false},id(12));assert.equal(r.progressPercent,50);assert.deepEqual(r.completedLessonIds,[id(6)]);
 // Source RPC keeps enrollment completed after undo; preserve that behavior.
 assert.equal(f.db.prepare("SELECT status FROM d1_lms_enrollments").get().status,"completed");
 const p=f.db.prepare("SELECT * FROM d1_lms_progress WHERE lesson_id=?").get(id(5));assert.equal(p.completed_at,null);assert.equal(p.status,"in_progress");
});

test("retry is idempotent and a late retry cannot undo a later operation",async(t)=>{
 const f=fixture(t);const first=await f.write();const row=f.db.prepare("SELECT id FROM d1_lms_progress").get();
 assert.deepEqual(await f.write(),first);
 await f.write({completed:false},id(12));assert.deepEqual(await f.write(),first);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM d1_lms_progress").get().n,1);
 assert.equal(f.db.prepare("SELECT id,status FROM d1_lms_progress").get().id,row.id);
 assert.equal(f.db.prepare("SELECT status FROM d1_lms_progress").get().status,"in_progress");
});

test("an operation ID cannot be reused with another payload or identity",async(t)=>{
 const f=fixture(t);await f.write();
 await assert.rejects(f.write({completed:false}),/not authorized or operation conflicts/);
 await assert.rejects(f.write({userId:id(2),email:"other@example.invalid"}),/not authorized or operation conflicts/);
 assert.equal(f.db.prepare("SELECT status FROM d1_lms_progress").get().status,"completed");
});

test("cross-account, course and unpublished lesson requests write no progress",async(t)=>{
 const f=fixture(t);
 for(const patch of [{userId:id(2),email:"other@example.invalid"},{email:"other@example.invalid"},{courseSlug:"wrong-course"},{lessonId:id(99)}]) await assert.rejects(f.write(patch),/not authorized/);
 f.db.exec("UPDATE d1_lms_modules SET status='draft'");await assert.rejects(f.write(),/not authorized/);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM d1_lms_progress").get().n,0);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM d1_lms_progress_operations").get().n,0);
});

test("writer preserves RPC normalized-email fallback and does not invent enrollment for paid-only access",async(t)=>{
 const f=fixture(t);f.db.exec("UPDATE d1_lms_enrollments SET user_id=NULL");assert.equal((await f.write()).progressPercent,50);
 f.db.exec("DELETE FROM d1_lms_progress_operations;DELETE FROM d1_lms_progress;DELETE FROM d1_lms_enrollments");
 f.db.prepare("INSERT INTO d1_access_orders VALUES (?,?,'paid','qa-course','Fixture',NULL,NULL,NULL)").run(id(30),"qa@example.invalid");
 await assert.rejects(f.write(),/not authorized/);
});

test("expired enrollment, unverified snapshot and admin role block writes",async(t)=>{
 const f=fixture(t);f.db.prepare("UPDATE d1_lms_enrollments SET expires_at=?").run(stamp);await assert.rejects(f.write(),/not authorized/);
 f.db.exec("UPDATE d1_lms_enrollments SET expires_at=NULL;UPDATE d1_access_sync_state SET status='stale'");await assert.rejects(f.write(),/not authorized/);
 f.db.exec("UPDATE d1_access_sync_state SET status='verified';UPDATE d1_access_users SET admin_role='owner'");await assert.rejects(f.write(),/not authorized/);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM d1_lms_progress").get().n,0);
});

test("failure after progress insertion rolls back progress, enrollment and operation together",async(t)=>{
 const f=fixture(t);await assert.rejects(f.write({},id(10),2),/injected transactional failure/);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM d1_lms_progress").get().n,0);
 assert.equal(f.db.prepare("SELECT count(*) AS n FROM d1_lms_progress_operations").get().n,0);
 assert.equal(f.db.prepare("SELECT last_seen_at FROM d1_lms_enrollments").get().last_seen_at,null);
 assert.equal((await f.write()).progressPercent,50);
});
