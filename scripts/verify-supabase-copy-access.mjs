// Local-only parity: load the generated projection.sql into in-memory SQLite and
// compare, for every non-admin A user, the D1 runtime resolver's owned courses
// with the production rule (paid orders + admin access leads). Prints counts only.
// Usage: node scripts/verify-supabase-copy-access.mjs <workdir>
import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {execFileSync} from 'node:child_process';import {readFileSync,writeFileSync} from 'node:fs';
const work = process.argv[2];
const b = await build({stdin: {contents: 'export {deriveD1StudentCourseAccess,D1_STUDENT_ACCESS_SQL} from "./lib/cloudflare/d1-course-access";export {getCourseAccessSlugs,isAdminEmail} from "./lib/course-access";', resolveDir: process.cwd()}, bundle: true, platform: 'node', format: 'esm', write: false});
const h = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
const users = JSON.parse(execFileSync('node_modules/.bin/wrangler', ['d1', 'execute', 'theanh-supabase-copy', '--remote', '--json', '--command', 'SELECT id,normalized_email,admin_role FROM a_auth__access_users'], {encoding: 'utf8', maxBuffer: 1 << 26}))[0].results;
const db = new DatabaseSync(':memory:');
const script = readFileSync(work + '/projection.sql', 'utf8').split('\n').filter(l => !/FROM a_auth__|^INSERT INTO d1_access_sync_state/.test(l)).join('\n');
db.exec(script);
for (const f of ['d1-lms-legacy-enrollment-owners-prototype.sql', 'd1-lms-progress-operations-prototype.sql']) db.exec(readFileSync('scripts/' + f, 'utf8'));
const now = Date.now(), stamp = new Date(now).toISOString();
db.prepare('INSERT INTO d1_access_sync_state VALUES(?,?,?,?)').run('vsxxgdzwtscuxcmjfckt', stamp, stamp, 'verified');
const ins = db.prepare('INSERT INTO d1_access_users VALUES(?,?,?)');for (const u of users) ins.run(u.id, u.normalized_email, u.admin_role);
const t = {students: 0, admins: 0, withAccess: 0, accessPairs: 0, orderLeadAccessMissingInD1: 0, studentsWithMissing: 0, extraFromEnrollments: 0, errors: 0};
for (const u of users) {
  if (h.isAdminEmail(u.normalized_email) || ['owner', 'editor'].includes(u.admin_role)) { t.admins++; continue; }
  t.students++;
  const orders = db.prepare('SELECT id,status,course_slug courseSlug,course_title courseTitle,payment_plan paymentPlan,order_items_json FROM d1_access_orders WHERE normalized_email=?').all(u.normalized_email).map(o => ({...o, email: u.normalized_email, orderItems: o.order_items_json ? JSON.parse(o.order_items_json) : []}));
  const leads = db.prepare('SELECT id,source,created_at createdAt FROM d1_access_overrides WHERE normalized_email=? AND deleted_at IS NULL').all(u.normalized_email).map(l => ({...l, email: u.normalized_email}));
  const legacy = h.getCourseAccessSlugs({email: u.normalized_email, orders, leads});
  try {
    const raw = db.prepare(h.D1_STUDENT_ACCESS_SQL).get(u.id, u.normalized_email, stamp, 'vsxxgdzwtscuxcmjfckt');
    const owned = h.deriveD1StudentCourseAccess(raw, {id: u.id, email: u.normalized_email}).ownedSlugs;
    const missing = legacy.filter(s => !owned.includes(s));
    if (owned.length) t.withAccess++;
    t.accessPairs += new Set(owned).size; t.orderLeadAccessMissingInD1 += missing.length; if (missing.length) t.studentsWithMissing++;
    t.extraFromEnrollments += owned.filter(s => !legacy.includes(s)).length;
  } catch { t.errors++; }
}
writeFileSync('reports/cloudflare-d1/supabase-copy-access-parity.json', JSON.stringify({checkedAt: stamp, ...t, status: t.orderLeadAccessMissingInD1 === 0 && t.errors === 0 ? 'PASS' : 'MISMATCH', limits: 'Local in-memory run of the generated projection; enrollment-based extras not compared to the live Supabase RPC; admins excluded.'}, null, 2) + '\n');
console.log(JSON.stringify(t));
