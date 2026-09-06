import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/') ? load(`${name.slice(2)}.ts`, mocks) : require(name), mod, mod.exports);
  return mod.exports;
}
const email = 'fixture@example.invalid';
const lead = (id, patch = {}) => ({ id, name: 'Same fixture name', email: '', phone: '', source: 'public-form', need: id, createdAt: '2026-09-06T00:00:00Z', ...patch });
const order = (id, createdAt, patch = {}) => ({ id, email, phone: '0900000000', studentName: 'Fixture', status: 'paid', orderCode: id, orderItems: [], courseSlug: 'course-fixture', courseTitle: 'Course fixture', createdAt, paidAt: createdAt, ...patch });
function studentService({ leads = [], orders = [], courses = [], deleted = new Set() } = {}) {
  return load('services/studentAccessService.ts', {
    '@/services/lmsService': { listAdminLmsCourses: async () => courses, isEnrollmentCurrentlyActive: (row) => row.status === 'active' },
    '@/services/adminDeletionService': { getActiveDeletedStudentKeys: async (options) => { assert.equal(options.strict, true); return deleted; } },
    '@/services/leadService': { getLeads: async () => leads },
    '@/services/orderService': { getPaymentOrders: async () => orders },
    '@/lib/admin/admin-emails': { getConfiguredOwnerEmails: () => [] },
  });
}
const getRecords = (fixture) => studentService(fixture).getStudentAccessRecords({ includeAllLeads: true, strict: true });

test('same-name contacts without email or phone remain distinct profiles by source record id', async () => {
  const rows = await getRecords({ leads: [lead('a'), lead('b')] });
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((row) => row.id)).size, 2);
  assert.deepEqual(rows.map((row) => row.note).sort(), ['a', 'b']);
});

test('profile registration and last update stay correct regardless of source order', async () => {
  const older = order('OLDER', '2026-01-01T00:00:00Z');
  const newer = order('NEWER', '2026-09-06T00:00:00Z');
  for (const orders of [[older, newer], [newer, older]]) {
    const [row] = await getRecords({ orders });
    assert.equal(row.registeredAt, older.createdAt);
    assert.equal(row.updatedAt, newer.createdAt);
    assert.deepEqual(row.paidOrderCodes.slice().sort(), ['NEWER', 'OLDER']);
  }
});

test('empty emails never transfer a different phone identity paid access; own LMS access and progress remain', async () => {
  const phone = '0911111111';
  const rows = await getRecords({
    leads: [lead('lead-a', { phone })],
    orders: [order('OTHER', '2026-09-01T00:00:00Z', { email: '', phone: '0922222222' })],
    courses: [{ slug: 'own-course', title: 'Own course', enrollments: [{ id: 'own-enrollment', email: '', phone, studentName: 'Fixture A', status: 'active', progressPercent: 40, createdAt: '2026-09-01T00:00:00Z' }] }],
  });
  const person = rows.find((row) => row.phone === phone);
  assert.ok(person);
  assert.deepEqual(person.accessibleCourseSlugs, ['own-course']);
  assert.equal(person.progressPercent, 40);
  assert.equal(person.paidOrderCodes.length, 0);
  assert.equal(person.paymentStatus, 'Không có đơn thanh toán');
});

function deletionService(client) {
  return load('services/adminDeletionService.ts', { '@/lib/supabase/admin': { createSupabaseAdminClient: () => client }, '@/lib/admin/admin-emails': { getConfiguredOwnerEmails: () => ['owner@example.invalid'] } });
}

test('strict deleted-profile reader includes tombstones beyond 1000 and fails closed on read error', async () => {
  const all = Array.from({ length: 1201 }, (_, index) => ({ id: String(index), student_key: `record:${index}` }));
  let calls = 0;
  const client = { from(table) {
    assert.equal(table, 'admin_deleted_students');
    let offset = 0, end = 499;
    const q = { select() { return q; }, is(column, value) { assert.equal(column, 'restored_at'); assert.equal(value, null); return q; }, order() { return q; }, range(from, to) { offset = from; end = to; return q; }, then(resolve, reject) { calls++; return Promise.resolve({ data: all.slice(offset, end + 1), count: all.length, error: null }).then(resolve, reject); } };
    return q;
  } };
  const keys = await deletionService(client).getActiveDeletedStudentKeys({ strict: true });
  assert.equal(keys.size, 1201);
  assert.ok(keys.has('record:1200'));
  assert.equal(calls, 3);
  const failing = { from() { const q = { select() { return q; }, is() { return q; }, order() { return q; }, range() { return q; }, then(resolve) { return Promise.resolve({ error: { message: 'fixture read denied' }, data: null, count: null }).then(resolve); } }; return q; } };
  await assert.rejects(deletionService(failing).getActiveDeletedStudentKeys({ strict: true }), /fixture read denied/);
  await assert.rejects(deletionService(null).getActiveDeletedStudentKeys({ strict: true }), /Không đọc/);
});

test('strict profile path honors supplied tombstones and does not re-read a weaker source', async () => {
  const service = studentService({ leads: [lead('a', { email })] });
  const rows = await service.getStudentAccessRecords({ includeAllLeads: true, strict: true, deletedStudentKeys: new Set([`email:${email}`]) });
  assert.deepEqual(rows, []);
});

function purgeFixture(tombstones, leads, users = []) {
  const deletedAuth = [];
  const state = { admin_deleted_students: tombstones, leads };
  const touched = [];
  const client = {
    auth: { admin: { listUsers: async () => ({ data: { users }, error: null }), deleteUser: async (id) => { deletedAuth.push(id); return { error: null }; } } },
    from(table) {
      assert.ok(Object.hasOwn(state, table), `Unexpected data mutation: ${table}`);
      let action = 'read', patch;
      const predicates = [];
      const q = {
        select() { return q; }, delete() { action = 'delete'; return q; }, update(value) { action = 'update'; patch = value; return q; },
        eq(column, value) { predicates.push((row) => row[column] === value); return q; },
        is(column, value) { predicates.push((row) => (row[column] ?? null) === value); return q; },
        not(column, operator, value) { assert.equal(operator, 'is'); predicates.push((row) => (row[column] ?? null) !== value); return q; },
        lte(column, value) { predicates.push((row) => row[column] != null && row[column] <= value); return q; },
        or(filters) {
          if (filters === 'email.is.null,email.eq.') predicates.push((row) => !row.email);
          else if (filters === 'source.ilike.admin-student%,source.ilike.admin-access-%') predicates.push((row) => /^admin-student|^admin-access-/i.test(row.source ?? ''));
          else throw new Error(`Unexpected filter: ${filters}`);
          return q;
        },
        then(resolve, reject) {
          const matches = state[table].filter((row) => predicates.every((predicate) => predicate(row)));
          if (action !== 'read') touched.push({ table, action, ids: matches.map((row) => row.id) });
          if (action === 'delete') state[table] = state[table].filter((row) => !matches.includes(row));
          if (action === 'update') for (const row of matches) Object.assign(row, patch);
          return Promise.resolve({ data: matches, count: matches.length, error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { service: deletionService(client), state, deletedAuth, touched };
}
const tombstone = (id, patch = {}) => ({ id, student_key: `record:${id}`, email: '', phone: '', name: 'Fixture', deleted_at: '2026-01-01', delete_after: '2026-02-01', purged_at: null, restored_at: null, ...patch });

test('purge of email identity preserves another customer sharing phone and never touches orders or progress', async () => {
  const phone = '0900000000';
  const fixture = purgeFixture([tombstone('a', { email: 'a@example.invalid', phone })], [
    { id: 'a-marker', email: 'a@example.invalid', phone, source: 'admin-access-grant:course' },
    { id: 'b-marker', email: 'b@example.invalid', phone, source: 'admin-access-grant:course' },
    { id: 'a-public', email: 'a@example.invalid', phone, source: 'public-form' },
  ], [{ id: 'auth-a', email: 'a@example.invalid', app_metadata: {} }]);
  const result = await fixture.service.purgeExpiredAdminDeletes(new Date('2026-09-06T00:00:00Z'));
  assert.equal(result.purgedStudents, 1);
  assert.deepEqual(fixture.state.leads.map((row) => row.id).sort(), ['a-public', 'b-marker']);
  assert.deepEqual(fixture.deletedAuth, ['auth-a']);
});

test('phone-only purge affects only markers without an email; restored or protected profiles stay intact', async () => {
  const phone = '0900000000';
  const fixture = purgeFixture([
    tombstone('phone', { phone }), tombstone('restored', { email: 'restored@example.invalid', restored_at: '2026-09-01' }), tombstone('owner', { email: 'owner@example.invalid' }), tombstone('editor', { email: 'editor@example.invalid' }),
  ], [
    { id: 'phone-marker', email: null, phone, source: 'admin-student:manual' },
    { id: 'other-email', email: 'different@example.invalid', phone, source: 'admin-access-grant:course' },
    { id: 'restored-marker', email: 'restored@example.invalid', source: 'admin-access-grant:course' },
    { id: 'owner-marker', email: 'owner@example.invalid', source: 'admin-access-grant:course' },
    { id: 'editor-marker', email: 'editor@example.invalid', source: 'admin-access-grant:course' },
  ], [{ id: 'auth-owner', email: 'owner@example.invalid', app_metadata: {} }, { id: 'auth-editor', email: 'editor@example.invalid', app_metadata: { admin_role: 'editor' } }]);
  const result = await fixture.service.purgeExpiredAdminDeletes(new Date('2026-09-06T00:00:00Z'));
  assert.equal(result.purgedStudents, 1);
  assert.deepEqual(fixture.state.leads.map((row) => row.id).sort(), ['editor-marker', 'other-email', 'owner-marker', 'restored-marker']);
  assert.deepEqual(fixture.deletedAuth, []);
  assert.equal(fixture.state.admin_deleted_students.find((row) => row.id === 'restored').purged_at, null);
});


test('editor directory keeps student scope and never queries CRM prospects; default owner view includes them', async () => {
  for (const includeProspects of [false, true]) {
    let contactReads = 0;
    let observedOptions;
    const deleted = new Set();
    const client = { schema(name) {
      contactReads++;
      assert.equal(includeProspects, true, 'Editor must not query CRM schema');
      assert.equal(name, 'crm_v2');
      return { from(table) {
        assert.equal(table, 'contacts');
        const query = { select() { return query; }, order() { return query; }, range: async () => ({ data: [], count: 0, error: null }) };
        return query;
      } };
    } };
    const service = load('services/adminCustomerService.ts', {
      '@/lib/supabase/admin': { createSupabaseAdminClient: () => client },
      '@/services/studentAccessService': { getStudentAccessRecords: async (options) => { observedOptions = options; return []; } },
      '@/services/adminDeletionService': { getActiveDeletedStudentKeys: async () => deleted },
      '@/services/activityLogService': {},
    });
    await service.listAdminCustomerProfiles(includeProspects ? undefined : { includeProspects: false });
    assert.equal(observedOptions.includeAllLeads, includeProspects);
    assert.equal(observedOptions.strict, true);
    assert.equal(observedOptions.deletedStudentKeys, deleted);
    assert.equal(contactReads, includeProspects ? 1 : 0);
  }
});
