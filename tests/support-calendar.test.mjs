import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`, mocks);
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const domain = load('lib/support-booking/admin-calendar.ts');
const today = '2026-09-06';
const now = new Date('2026-09-06T02:00:00Z');
const event = (patch = {}) => ({ id: 'fixture-a', appointmentDate: '2026-09-10', appointmentTime: '09:00', startsAt: '2026-09-10T02:00:00Z', endsAt: '2026-09-10T03:00:00Z', topic: 'ai-agent', note: 'Nội dung riêng của buổi hỗ trợ', status: 'confirmed', durationMinutes: 60, bookingType: 'student', customerName: 'Fixture Alpha', email: 'fixture@example.invalid', phone: '0900000000', amount: 1_500_000, orderCode: 'TESTONLY', paidAt: '2026-09-06T00:00:00Z', holdExpiresAt: '2026-09-06T00:20:00Z', ...patch });
const snapshot = (patch = {}) => ({ ...domain.calendarRange(today, 'month'), now: now.toISOString(), minDate: '2026-09-09', maxDate: '2026-10-06', bookings: [event()], busyDates: [], ...patch });
function dbRow(index) { return { id: `fixture-${index}`, appointment_date: '2026-09-01', appointment_time: '09:00:00', starts_at: '2026-09-01T02:00:00Z', ends_at: '2026-09-01T03:00:00Z', status: index % 2 ? 'needs_review' : 'confirmed', duration_minutes: 60, booking_type: 'consultation', note: null }; }
function serviceFixture({ count = 501, failPage = -1, changedCount = false } = {}) {
  const calls = [];
  const service = load('services/supportCalendarService.ts', { '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ from(table) {
    let offset = 0;
    const query = { select(columns, options) { calls.push({ table, columns, options }); return query; }, gte(column, value) { calls.push({ column, value }); return query; }, lte(column, value) { calls.push({ column, value }); return query; }, order() { return query; }, range(start) { offset = start; return query; }, then(resolve, reject) {
      return Promise.resolve(table === 'support_busy_dates' ? { data: [{ busy_date: '2026-09-10', note: 'Fixture note' }], error: null } : offset === failPage ? { error: { message: 'fixture failure' } } : { data: Array.from({ length: Math.max(0, Math.min(500, count - offset)) }, (_, index) => dbRow(offset + index)), count: count + (offset && changedCount ? 1 : 0), error: null }).then(resolve, reject);
    } }; return query;
  } }) } });
  return { service, calls };
}

test('month/week/day navigation keeps real dates across leap year and year boundary', () => {
  assert.deepEqual(domain.calendarRange('2026-09-06', 'month'), { from: '2026-08-31', to: '2026-10-11' });
  assert.deepEqual(domain.calendarRange('2026-09-06', 'week'), { from: '2026-08-31', to: '2026-09-06' });
  assert.equal(domain.moveCalendarDate('2028-01-31', 'month', 1), '2028-02-29');
  assert.equal(domain.moveCalendarDate('2026-01-31', 'month', 1), '2026-02-28');
  assert.equal(domain.moveCalendarDate('2026-12-31', 'day', 1), '2027-01-01');
  assert.equal(domain.isCalendarDate('2026-02-30'), false);
  assert.equal(domain.calendarDates('2026-12-30', '2027-01-02').length, 4);
});

test('expired holds are labeled separately and overlapping historical events keep distinct lanes', () => {
  assert.equal(domain.calendarStatus(event({ status: 'held' }), now.toISOString()), 'expired');
  assert.equal(domain.calendarStatus(event({ status: 'held', holdExpiresAt: '2026-09-06T02:10:00Z' }), now.toISOString()), 'held');
  const events = domain.layoutCalendarEvents([event({ id: 'a' }), event({ id: 'b', appointmentTime: '09:30', durationMinutes: 60 }), event({ id: 'c', appointmentTime: '10:00', durationMinutes: 30 }), event({ id: 'd', appointmentTime: '11:00', durationMinutes: 30 })]);
  assert.deepEqual(events.map((item) => [item.booking.id, item.lane, item.lanes]), [['a', 0, 2], ['b', 1, 2], ['c', 0, 2], ['d', 0, 1]]);
});

test('calendar loads all pages, historical and paid-review records by appointment date', async () => {
  const { service, calls } = serviceFixture();
  const data = await service.getSupportCalendar('2026-08-31', '2026-10-11', now);
  assert.equal(data.bookings.length, 501);
  assert.equal(data.bookings[1].status, 'needs_review');
  assert.equal(data.bookings[0].note, '');
  assert.equal(data.bookings[0].appointmentDate, '2026-09-01');
  assert.equal(data.busyDates[0].note, 'Fixture note');
  assert.equal(calls.filter((call) => call.column === 'appointment_date').length, 4);
  assert.equal(calls.some((call) => call.column === 'starts_at'), false);
});

test('invalid ranges, partial pagination and concurrent count changes never become empty successful calendars', async () => {
  const { service } = serviceFixture();
  for (const range of [['2026-02-30', '2026-03-02'], ['2026-01-01', '2026-03-02'], ['2026-09-07', '2026-09-01']]) await assert.rejects(service.getSupportCalendar(...range, now), /42 ngày/);
  await assert.rejects(serviceFixture({ failPage: 500 }).service.getSupportCalendar('2026-09-01', '2026-09-30', now), /Không tải/);
  await assert.rejects(serviceFixture({ changedCount: true }).service.getSupportCalendar('2026-09-01', '2026-09-30', now), /vừa thay đổi/);
  assert.equal((await serviceFixture({ count: 0 }).service.getSupportCalendar('2026-09-01', '2026-09-30', now)).bookings.length, 0);
});

test('calendar endpoint denies nonowners before data reads and disables response caching', async () => {
  for (const adminRole of [null, 'editor', 'owner']) {
    let reads = 0;
    const route = load('app/api/admin/crm-v2/support-bookings/route.ts', {
      '@/lib/auth/session': { getCurrentAuth: async () => ({ adminRole }), canAccessAdminRole: (role, roles) => roles.includes(role) },
      '@/services/supportCalendarService': { validateSupportCalendarRange() {}, getSupportCalendar: async () => { reads++; return snapshot(); } },
    });
    const response = await route.GET(new Request('https://example.invalid/api/admin/crm-v2/support-bookings?from=2026-09-01&to=2026-09-30'));
    assert.equal(response.status, adminRole === 'owner' ? 200 : 403);
    assert.equal(reads, adminRole === 'owner' ? 1 : 0);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('calendar endpoint returns data-read failure as 503, not an empty calendar', async () => {
  const route = load('app/api/admin/crm-v2/support-bookings/route.ts', {
    '@/lib/auth/session': { getCurrentAuth: async () => ({ adminRole: 'owner' }), canAccessAdminRole: () => true },
    '@/services/supportCalendarService': { validateSupportCalendarRange() {}, getSupportCalendar: async () => { throw new Error('internal fixture message'); } },
  });
  const response = await route.GET(new Request('https://example.invalid/api/admin/crm-v2/support-bookings?from=2026-09-01&to=2026-09-30'));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /internal fixture/);
});

test('malformed busy dates are rejected before database access and API does not truncate date suffix', async () => {
  let reads = 0;
  const service = load('services/supportBookingService.ts', { '@/lib/supabase/admin': { createSupabaseAdminClient: () => { reads++; throw new Error('unexpected read'); } }, '@/lib/course-access': {}, '@/services/orderService': {} });
  for (const date of ['2026-09-10BAD', '2026-02-30', '2026-13-01']) await assert.rejects(service.setSupportBusyDate({ date, busy: true }, now), /Ngày bận không hợp lệ/);
  assert.equal(reads, 0);
  let actual;
  const route = load('app/api/admin/crm-v2/support-bookings/actions/route.ts', { '@/lib/auth/session': { getCurrentAuth: async () => ({ adminRole: 'owner' }), canAccessAdminRole: () => true }, '@/services/supportBookingService': { setSupportBusyDate: async (input) => { actual = input.date; throw new Error('Ngày bận không hợp lệ.'); } } });
  assert.equal((await route.POST(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ date: '2026-09-10BAD', busy: true }) }))).status, 400);
  assert.equal(actual, '2026-09-10BAD');
});

async function withCalendar(fn, props = {}) {
  const runtime = process.env.SUPPORT_UI_TEST_MODULE;
  assert.ok(runtime, 'Run with SUPPORT_UI_TEST_MODULE pointing to isolated react-test-renderer');
  const runtimeRequire = createRequire(path.join(runtime, 'package.json'));
  const React = runtimeRequire('react');
  const { create, act } = runtimeRequire('react-test-renderer');
  const component = load('components/crm-v2/support-bookings-client.tsx', {
    react: React, 'react/jsx-runtime': runtimeRequire('react/jsx-runtime'),
    'lucide-react': new Proxy({}, { get: () => (props) => React.createElement('svg', props) }),
    '@/components/admin/admin-dialog': { AdminDialog: ({ open, title, children, onClose }) => open ? React.createElement('section', { role: 'dialog', 'aria-label': title }, React.createElement('button', { onClick: onClose }, 'Fermer'), children) : null },
  }).SupportBookingsClient;
  const previousFetch = globalThis.fetch;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(component, { today, initialSnapshot: snapshot(), ...props })); });
    await fn({ renderer, act, React, button: (text) => renderer.root.findAllByType('button').find((node) => node.children.join('') === text), text: () => JSON.stringify(renderer.toJSON()) });
  } finally { if (renderer) await act(async () => renderer.unmount()); globalThis.fetch = previousFetch; delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
}

test('registered event appears inside month grid, opens profile detail, and supports search/filter', async () => {
  await withCalendar(async ({ renderer, act, button, text }) => {
    assert.match(text(), /Fixture Alpha/);
    assert.doesNotMatch(text(), /Nội dung riêng của buổi hỗ trợ/);
    const booking = renderer.root.findAllByType('button').find((node) => node.props.title?.includes('Fixture Alpha'));
    await act(async () => booking.props.onClick());
    assert.match(text(), /Nội dung riêng của buổi hỗ trợ/);
    assert.match(text(), /AI Agent/);
    assert.match(text(), /1.500.000đ/);
    await act(async () => button('Fermer').props.onClick());
    await act(async () => renderer.root.findByProps({ 'aria-label': 'Tìm lịch trong khoảng đang xem' }).props.onChange({ target: { value: 'unmatched' } }));
    assert.doesNotMatch(text(), /Fixture Alpha/);
    assert.match(text(), /Không có buổi hẹn phù hợp/);
    await act(async () => renderer.root.findByProps({ 'aria-label': 'Tìm lịch trong khoảng đang xem' }).props.onChange({ target: { value: '' } }));
    assert.doesNotMatch(text(), /Fixture Cancelled/);
    await act(async () => renderer.root.findByProps({ 'aria-label': 'Trạng thái lịch' }).props.onChange({ target: { value: 'all' } }));
    assert.match(text(), /Fixture Cancelled/);
  }, { initialSnapshot: snapshot({ bookings: [event(), event({ id: 'cancelled', customerName: 'Fixture Cancelled', status: 'cancelled' })] }) });
});

test('busy-day save recovers after network failure and successful write preserves booked event', async () => {
  await withCalendar(async ({ renderer, act, button, text }) => {
    await act(async () => renderer.root.findByProps({ 'aria-label': 'Mở ngày 2026-09-10' }).props.onClick());
    const draft = 'Công tác';
    await act(async () => renderer.root.findByType('textarea').props.onChange({ target: { value: draft } }));
    globalThis.fetch = async () => { throw new Error('Mất kết nối fixture'); };
    await act(async () => button('Đánh dấu ngày bận').props.onClick());
    assert.match(text(), /Mất kết nối fixture/);
    assert.equal(button('Đánh dấu ngày bận').props.disabled, false);
    let sent;
    globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; };
    await act(async () => button('Đánh dấu ngày bận').props.onClick());
    assert.deepEqual(sent, { date: '2026-09-10', busy: true, note: draft });
    assert.match(text(), /Đã lưu ngày bận/);
    assert.match(text(), /Fixture Alpha/);
    assert.ok(button('Mở lại ngày'));
  });
});

test('week navigation reloads exact range and ignores a late response from an aborted prior range', async () => {
  await withCalendar(async ({ renderer, act, button, text }) => {
    const pending = [];
    globalThis.fetch = (url, options) => new Promise((resolve) => pending.push({ url, signal: options.signal, resolve }));
    await act(async () => button('Tuần').props.onClick());
    assert.match(pending[0].url, /from=2026-08-31&to=2026-09-06/);
    await act(async () => renderer.root.findByProps({ 'aria-label': 'Khoảng lịch sau' }).props.onClick());
    assert.equal(pending[0].signal.aborted, true);
    await act(async () => pending[1].resolve({ ok: true, json: async () => ({ ok: true, snapshot: snapshot({ from: '2026-09-07', to: '2026-09-13' }) }) }));
    assert.match(text(), /Fixture Alpha/);
    await act(async () => pending[0].resolve({ ok: true, json: async () => ({ ok: true, snapshot: snapshot({ from: '2026-08-31', to: '2026-09-06', bookings: [] }) }) }));
    assert.match(text(), /Fixture Alpha/);
  });
});
