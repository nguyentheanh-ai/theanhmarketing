// Build the runtime d1_* projection tables inside the separate copy D1
// (`theanh-supabase-copy`) from its raw a_/b_ source tables. Reuses the same
// course/LMS mapping as the QA import, validates every row against the real
// runtime schema (constraints + triggers) in a local in-memory SQLite, then
// uploads. Not bound to any Worker; staging and Supabase are untouched.
// Usage: node scripts/project-supabase-copy.mjs <workdir> [--upload]
import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [work, flag] = process.argv.slice(2), DB = 'theanh-supabase-copy', project = 'vsxxgdzwtscuxcmjfckt';
if (!work) throw Error('workdir required');
mkdirSync(work, {recursive: true, mode: 0o700});
const wrangler = (...args) => execFileSync('node_modules/.bin/wrangler', ['d1', 'execute', DB, '--remote', ...args], {encoding: 'utf8', maxBuffer: 1 << 28});
const read = (table, columns = '*') => { const out = []; for (let off = 0; ; off += 200) { const rows = JSON.parse(wrangler('--json', '--command', `SELECT ${columns} FROM "${table}" ORDER BY rowid LIMIT 200 OFFSET ${off}`))[0].results; out.push(...rows); if (rows.length < 200) return out; } };
const b = await build({stdin: {contents: 'export * from "./lib/cloudflare/d1-course-content";export {mapDbCourseToCourse} from "./lib/courses/course-projection";', resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false});
const h = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
const json = v => { if (v === null || v === undefined || v === '') return null; try { return JSON.parse(v); } catch { return v; } };
const email = v => (v ?? '').trim().toLowerCase();
const snapshot = new Date().toISOString();

const sql = new DatabaseSync(':memory:');
for (const f of ['d1-course-access-source-prototype.sql', 'd1-lms-compatibility-prototype.sql', 'd1-course-content-prototype.sql']) sql.exec(readFileSync('scripts/' + f, 'utf8'));
const report = {snapshot, inserted: {}, rejected: {}};
const tryInsert = (table, q, params, why) => { try { sql.prepare(q).run(...params); report.inserted[table] = (report.inserted[table] ?? 0) + 1; } catch (e) { (report.rejected[table] ??= {})[why ?? e.message] = ((report.rejected[table] ?? {})[why ?? e.message] ?? 0) + 1; } };

// Courses → content document + LMS course/module/lesson rows (same rules as QA import).
const courses = read('a_public__courses'), modules = read('a_public__course_modules'), lessons = read('a_public__lessons'), resources = read('a_public__lesson_resources');
for (const c of courses) {
  const course = {...c, price: c.price, course_modules: modules.filter(m => m.course_id === c.id).map(m => ({...m, lessons: lessons.filter(l => l.module_id === m.id).map(l => ({...l, lesson_resources: resources.filter(r => r.lesson_id === l.id)}))}))};
  try { const s = await h.prepareD1CourseContent(course, snapshot); tryInsert('d1_course_content', s.sql.replace(/\?\d+/g, '?'), s.params); }
  catch (e) { (report.rejected.d1_course_content ??= {})[e.message] = 1; continue; }
  const mapped = h.mapDbCourseToCourse(course);
  tryInsert('d1_lms_courses', 'INSERT INTO d1_lms_courses(id,slug,lms_status,visibility) VALUES(?,?,?,?)', [c.id, c.slug, mapped.lmsStatus, mapped.visibility]);
  for (const m of mapped.modules) {
    tryInsert('d1_lms_modules', 'INSERT INTO d1_lms_modules(id,course_id,status) VALUES(?,?,?)', [m.id, c.id, m.status]);
    for (const l of m.lessons) tryInsert('d1_lms_lessons', 'INSERT INTO d1_lms_lessons(id,course_id,module_id,slug,status,playable) VALUES(?,?,?,?,?,?)', [l.id, c.id, m.id, l.slug ?? null, l.status, Number(Boolean(l.youtubeUrl?.trim() || l.embedUrl?.trim() || l.content?.trim()))]);
  }
}
// CRM contacts / enrollments / progress.
for (const x of read('a_crm_v2__contacts', 'id,email')) tryInsert('d1_lms_contacts', 'INSERT INTO d1_lms_contacts(id,normalized_email,source_email) VALUES(?,?,?)', [x.id, email(x.email) || null, x.email]);
for (const e of read('a_crm_v2__enrollments', 'id,contact_id,user_id,course_id,course_slug,status,expires_at,updated_at,metadata,last_seen_at'))
  tryInsert('d1_lms_enrollments', 'INSERT INTO d1_lms_enrollments(id,contact_id,user_id,course_id,course_slug,status,expires_at,updated_at,metadata,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
    [e.id, e.contact_id, e.user_id, e.course_id, e.course_slug, e.status, e.expires_at, e.updated_at, JSON.stringify(json(e.metadata) ?? {}), e.last_seen_at]);
for (const p of read('a_crm_v2__course_progress', 'id,enrollment_id,lesson_id,status,progress_percent,completed_at,updated_at,metadata'))
  tryInsert('d1_lms_progress', 'INSERT INTO d1_lms_progress(id,enrollment_id,lesson_id,status,progress_percent,completed_at,updated_at,metadata) VALUES(?,?,?,?,?,?,?,?)',
    [p.id, p.enrollment_id, p.lesson_id, p.status, Number(p.progress_percent), p.completed_at, p.updated_at, JSON.stringify(json(p.metadata) ?? {})]);
// Orders and admin access overrides (course-access resolver inputs).
for (const o of read('a_public__orders', 'id,email,status,course_slug,course_title,payment_plan,order_items')) {
  if (!email(o.email)) { (report.rejected.d1_access_orders ??= {})['no email'] = ((report.rejected.d1_access_orders ?? {})['no email'] ?? 0) + 1; continue; }
  const items = json(o.order_items);
  tryInsert('d1_access_orders', 'INSERT INTO d1_access_orders(id,normalized_email,status,course_slug,course_title,payment_plan,order_items_json) VALUES(?,?,?,?,?,?,?)',
    [o.id, email(o.email), o.status, o.course_slug, o.course_title, o.payment_plan, Array.isArray(items) ? JSON.stringify(items) : null]);
}
for (const l of read('a_public__leads', 'id,email,source,created_at,deleted_at').filter(l => typeof l.source === 'string' && l.source.startsWith('admin-access-') && email(l.email)))
  tryInsert('d1_access_overrides', 'INSERT INTO d1_access_overrides(id,normalized_email,source,created_at,deleted_at) VALUES(?,?,?,?,?)', [l.id, email(l.email), l.source, l.created_at, l.deleted_at]);

// SQL file: schema + rows of the projection tables only.
const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'bigint' ? String(v) : "'" + String(v).replaceAll("'", "''") + "'";
let out = '';
for (const f of ['d1-course-access-source-prototype.sql', 'd1-auth-core-prototype.sql', 'd1-lms-compatibility-prototype.sql', 'd1-course-content-prototype.sql']) out += readFileSync('scripts/' + f, 'utf8').replace(/^PRAGMA.*$/gm, '') + '\n';
const order = ['d1_lms_courses', 'd1_lms_modules', 'd1_lms_lessons', 'd1_lms_contacts', 'd1_lms_enrollments', 'd1_lms_progress', 'd1_access_orders', 'd1_access_overrides', 'd1_course_content'];
for (const t of order) for (const row of sql.prepare(`SELECT * FROM ${t}`).all()) {
  const line = `INSERT INTO ${t}(${Object.keys(row).join(',')}) VALUES(${Object.values(row).map(lit).join(',')});\n`;
  if (Buffer.byteLength(line) > 90000) throw Error('Oversized projection row in ' + t);
  out += line;
}
// Auth projection from the sealed copy tables (no secrets pass through here).
out += `INSERT INTO d1_access_users SELECT * FROM a_auth__access_users;\nINSERT INTO d1_auth_accounts SELECT * FROM a_auth__auth_accounts;\nINSERT INTO d1_auth_source_versions SELECT * FROM a_auth__auth_source_versions;\n`;
out += `INSERT INTO d1_access_sync_state(source_project_id,source_snapshot_at,last_verified_at,status) VALUES('${project}','${snapshot}',NULL,'importing');\n`;
writeFileSync(work + '/projection.sql', out);
writeFileSync('reports/cloudflare-d1/supabase-copy-projection.json', JSON.stringify({...report, database: DB, limits: 'Projection of point-in-time copy; sync state left importing (not verified/native authority). Not bound to any Worker.'}, null, 2) + '\n');
console.log(JSON.stringify(report));
if (flag === '--upload') { wrangler('--yes', '--file', work + '/projection.sql'); console.log('uploaded'); }
