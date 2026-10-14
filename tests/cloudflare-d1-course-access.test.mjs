import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const bundle = await build({ entryPoints: ["lib/cloudflare/d1-course-access.ts"],
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const { readD1StudentCourseAccess } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const now = Date.parse("2026-10-14T12:00:00Z");
const stamp = new Date(now).toISOString();
const student = { id: "qa-user-a", email: "qa-a@example.invalid" };

function fixture(t) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec(readFileSync("scripts/d1-lms-compatibility-prototype.sql", "utf8"));
  db.exec(readFileSync("scripts/d1-course-access-source-prototype.sql", "utf8"));
  db.prepare("INSERT INTO d1_access_users VALUES (?,?,?)").run(student.id, student.email, null);
  db.prepare("INSERT INTO d1_access_users VALUES (?,?,?)").run("qa-user-b", "qa-b@example.invalid", null);
  db.prepare("INSERT INTO d1_access_sync_state VALUES (?,?,?,?)").run("vsxxgdzwtscuxcmjfckt", stamp, stamp, "verified");
  const read = async (sql, args) => db.prepare(sql).get(...args) ?? null;
  const resolve = (subject = student) => readD1StudentCourseAccess(read, subject, { now });
  const order = (id, slug, email = student.email, plan = null, items = null, status = "paid") =>
    db.prepare("INSERT INTO d1_access_orders VALUES (?,?,?,?,?,?,?,?)").run(id, email, status, slug, "Fixture", plan, items, null);
  const override = (id, source, at = stamp, deleted = null) =>
    db.prepare("INSERT INTO d1_access_overrides VALUES (?,?,?,?,?)").run(id, student.email, source, at, deleted);
  const enrollment = (id, slug, user = student.id, contact = null, status = "active", expiry = null, metadata = "{}") => {
    db.prepare("INSERT OR IGNORE INTO d1_lms_courses VALUES (?,?,?,?)").run(`course-${slug}`, slug, "published", "enrolled");
    db.prepare("INSERT INTO d1_lms_enrollments (id,contact_id,user_id,course_id,course_slug,status,expires_at,updated_at,metadata) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, contact, user, `course-${slug}`, slug, status, expiry, stamp, metadata);
  };
  return { db, read, resolve, order, override, enrollment };
}

test("paid-only and LMS-only rights are merged; another student's orders are excluded", async (t) => {
  const f = fixture(t);
  f.order("paid-a", "paid-course");
  f.order("paid-b", "private-b", "qa-b@example.invalid");
  f.order("pending-a", "pending-course", student.email, null, null, "pending");
  f.enrollment("enrollment-a", "lms-course");
  f.enrollment("enrollment-b", "other-lms", "qa-user-b");
  const result = await f.resolve();
  assert.deepEqual(result.ownedSlugs, ["paid-course", "lms-course"]);
  assert.deepEqual(result.enrollmentIdsBySlug["lms-course"], ["enrollment-a"]);
});

test("ordered overrides revoke and grant paid rights, preserving same-time ID order", async (t) => {
  const f = fixture(t);
  f.order("paid-a", "paid-course");
  f.override("01", "admin-access-revoke:paid-course");
  f.override("02", "admin-access-grant:paid-course");
  f.override("03", "admin-access-revoke:paid-course");
  f.override("04", "admin-access-grant:manual-course");
  f.override("05", "admin-access-revoke:manual-course", stamp, stamp);
  assert.deepEqual((await f.resolve()).ownedSlugs, ["manual-course"]);
});

test("deposit rule and order-items override fallback slug using the production helper", async (t) => {
  const f = fixture(t);
  const kit = "bo-agent-kit-x10-hieu-suat-cong-viec";
  f.order("deposit", kit, student.email, "agent-kit-preorder-deposit-399");
  f.order("items", "unused-fallback", student.email, null, '[{"slug":"item-course","title":"Fixture"}]');
  assert.deepEqual((await f.resolve()).ownedSlugs, ["item-course"]);
  f.override("grant-kit", `admin-access-grant:${kit}`);
  assert.deepEqual((await f.resolve()).ownedSlugs, ["item-course", kit]);
});

test("expired, paused and draft LMS rights do not grant access", async (t) => {
  const f = fixture(t);
  f.enrollment("expired", "expired-course", student.id, null, "active", stamp);
  f.enrollment("paused", "paused-course", student.id, null, "paused");
  f.enrollment("draft", "draft-course");
  f.db.prepare("UPDATE d1_lms_courses SET lms_status='draft' WHERE slug=?").run("draft-course");
  assert.deepEqual((await f.resolve()).ownedSlugs, []);
});

test("RPC email fallback uses original contact email then metadata, never normalized_email", async (t) => {
  const f = fixture(t);
  f.db.prepare("INSERT INTO d1_lms_contacts VALUES (?,?,?)").run("contact-a", student.email, "qa-b@example.invalid");
  f.enrollment("not-a", "contact-b-course", null, "contact-a");
  f.db.prepare("INSERT INTO d1_lms_contacts VALUES (?,?,?)").run("contact-empty", "different@example.invalid", "");
  f.enrollment("metadata-a", "metadata-course", null, "contact-empty", "active", null, JSON.stringify({ student_email: student.email }));
  assert.deepEqual((await f.resolve()).ownedSlugs, ["metadata-course"]);
});

test("completed progress stays scoped to this user's active enrollment", async (t) => {
  const f = fixture(t);
  f.enrollment("ea", "course-a"); f.enrollment("eb", "course-a", "qa-user-b");
  f.db.prepare("INSERT INTO d1_lms_modules VALUES (?,?,?)").run("module-a", "course-course-a", "published");
  f.db.prepare("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,?,?)").run("lesson-a", "course-course-a", "module-a", "lesson-a", "published", 1);
  f.db.prepare("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,?,?)").run("lesson-b", "course-course-a", "module-a", "lesson-b", "published", 1);
  f.db.prepare("INSERT INTO d1_lms_progress VALUES (?,?,?,?,?,?,?,?)").run("pa", "ea", "lesson-a", "completed", 100, stamp, stamp, "{}");
  f.db.prepare("INSERT INTO d1_lms_progress VALUES (?,?,?,?,?,?,?,?)").run("pb", "eb", "lesson-b", "completed", 100, stamp, stamp, "{}");
  assert.deepEqual((await f.resolve()).completedLessonIds, ["lesson-a"]);
});

test("identity mismatch and injected email cannot read another user's rights", async (t) => {
  const f = fixture(t);
  f.order("paid-b", "private-b", "qa-b@example.invalid");
  await assert.rejects(f.resolve({ id: student.id, email: "qa-b@example.invalid" }), /identity/);
  await assert.rejects(f.resolve({ id: student.id, email: "' OR 1=1 --" }), /identity/);
  assert.deepEqual((await f.resolve({ ...student, email: "  QA-A@example.invalid  " })).ownedSlugs, []);
});

test("importing, stale, expired, future and missing sync markers fail closed", async (t) => {
  const f = fixture(t);
  for (const state of ["importing", "stale"]) {
    f.db.prepare("UPDATE d1_access_sync_state SET status=?").run(state);
    await assert.rejects(f.resolve(), /current and verified/);
  }
  for (const badStamp of [new Date(now - 300001).toISOString(), new Date(now + 1).toISOString(), "invalid"]) {
    f.db.prepare("UPDATE d1_access_sync_state SET status='verified',source_snapshot_at=?,last_verified_at=?").run(badStamp, badStamp);
    await assert.rejects(f.resolve(), /current and verified/);
  }
  f.db.exec("DELETE FROM d1_access_sync_state");
  await assert.rejects(f.resolve(), /Invalid access snapshot/);
});

test("admin path is explicitly gated and malformed source data cannot grant access", async (t) => {
  const f = fixture(t);
  f.db.prepare("UPDATE d1_access_users SET admin_role='owner' WHERE id=?").run(student.id);
  await assert.rejects(f.resolve(), /Admin access projection/);
  f.db.prepare("UPDATE d1_access_users SET admin_role=NULL WHERE id=?").run(student.id);
  f.order("bad-items", "paid-course", student.email, null, '["invalid-item"]');
  await assert.rejects(f.resolve(), /Invalid access snapshot/);
});
