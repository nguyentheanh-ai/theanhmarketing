import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}
const model = load('lib/admin/sales-dashboard.ts');
const defaults = { ...model.initialSalesFilters({ range: 'all' }, '2026-10-01') };
const row = (patch = {}) => ({ id: 'one', name: 'Đặng Ánh', email: 'fixture@example.invalid', phone: '+84 900 000 001', source: 'Website', note: '', registeredAt: '2026-09-30T17:00:00Z', updatedAt: '2026-10-01T06:00:00Z', courseSlugs: ['course'], courseTitles: ['Khóa học'], paidOrderCodes: [], pendingOrderCodes: [], ...patch });
const filter = (rows, patch) => model.filterSalesCustomers(rows, { ...defaults, ...patch });
test('date range uses Vietnam midnight and includes both endpoints', () => {
  const rows = [row(), row({ id: 'before', registeredAt: '2026-09-30T16:59:59Z' }), row({ id: 'last', registeredAt: '2026-10-01T16:59:59Z' }), row({ id: 'after', registeredAt: '2026-10-01T17:00:00Z' })];
  assert.deepEqual(filter(rows, { from: '2026-10-01', to: '2026-10-01' }).map(r => r.id), ['last', 'one']);
  assert.equal(filter(rows, { from: '2026-10-02', to: '2026-10-01' }).length, 0);
});
test('date presets span months and years without local host timezone assumptions', () => {
  assert.deepEqual(model.datePreset('yesterday', '2026-01-01'), { from: '2025-12-31', to: '2025-12-31' });
  assert.deepEqual(model.datePreset('7d', '2026-10-01'), { from: '2026-09-25', to: '2026-10-01' });
  assert.deepEqual(model.datePreset('all', '2026-10-01'), { from: '', to: '' });
});
test('bad URL values do not become valid filter choices', () => {
  const f = model.initialSalesFilters({ from: '2026-02-31', to: ['2026-01-01'], status: 'anything', dateField: 'paidAt' }, '2026-10-01');
  assert.equal(f.from, '2026-10-01'); assert.equal(f.to, '2026-10-01'); assert.equal(f.status, 'all'); assert.equal(f.dateField, 'registeredAt');
});
test('missing dates stay visible only without a date bound and sort last', () => {
  const missing = row({ id: 'missing', registeredAt: '' });
  assert.equal(filter([missing], { from: '2026-01-01' }).length, 0);
  assert.deepEqual(filter([missing, row()], { sort: 'oldest' }).map(r => r.id), ['one', 'missing']);
});
test('search supports Vietnamese names, email, formatted phones and order codes', () => {
  const records = [row({ paidOrderCodes: ['TAM-TEST-1'] })];
  for (const q of ['dang anh', 'FIXTURE@', '0900000001', '+84 900 000 001', 'TAM-TEST-1']) assert.equal(filter(records, { q }).length, 1, q);
  assert.equal(filter(records, { q: 'missing' }).length, 0);
});
test('paid and unpaid are mutually exclusive, including customers without orders', () => {
  const rows = [row({ paidOrderCodes: ['paid'], pendingOrderCodes: ['pending'] }), row({ id: 'two', source: 'CRM', email: '', phone: '', courseSlugs: [] })];
  assert.equal(filter(rows, { status: 'paid', course: 'course', source: 'Website', contact: 'phone' }).length, 1);
  assert.equal(filter(rows, { status: 'unpaid' }).length, 1);
  assert.equal(filter(rows, { status: 'unpaid' })[0].id, 'two');
  assert.equal(model.salesPaymentStatus(rows[0]), 'Paid');
  assert.equal(model.salesPaymentStatus(rows[1]), 'Unpaid');
  assert.equal(model.initialSalesFilters({ status: 'no-order' }, '2026-10-01').status, 'all');
  assert.equal(filter(rows, { contact: 'missing' }).length, 1);
  assert.equal(filter(rows, { source: 'CRM', contact: 'email' }).length, 0);
});
test('updated date filter is separate from first recorded date', () => {
  const rows = [row({ registeredAt: '2025-01-01T00:00:00Z' })];
  assert.equal(filter(rows, { from: '2026-10-01' }).length, 0);
  assert.equal(filter(rows, { from: '2026-10-01', dateField: 'updatedAt' }).length, 1);
});
test('bulk copy deduplicates email and Vietnam phone variants without merging customer identities', () => {
  const rows = [row(), row({ id: 'two', email: 'FIXTURE@example.invalid', phone: '0900 000 001' }), row({ id: 'three', email: '', phone: '' })];
  assert.deepEqual(model.salesContacts(rows, 'email'), ['fixture@example.invalid']);
  assert.deepEqual(model.salesContacts(rows, 'phone'), ['+84 900 000 001']);
  assert.equal(filter(rows, {}).length, 3);
});
test('CSV quotes multiline text, neutralizes formula cells and preserves phone leading zero', () => {
  const csv = model.salesCsv([row({ name: '=1+1', phone: '0900000001', email: 'quoted "text"\nline' })]);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=1+1"')); assert.ok(csv.includes('"\'0900000001"')); assert.ok(csv.includes('"quoted ""text""\nline"'));
});
test('page authenticates before fetching and keeps existing role scope', async () => {
  for (const role of ['owner', 'editor']) {
    let guarded = false; let options;
    const page = load('app/admin/crm-v2/sales/page.tsx', {
      '@/lib/auth/session': { requireAdminAuth: async (path, roles) => { assert.equal(path, '/admin/crm-v2/sales'); assert.deepEqual(roles, ['owner', 'editor']); guarded = true; return { adminRole: role }; } },
      '@/services/courseService': { getCourseSummariesStrict: async () => [{ slug: 'course', title: 'Khóa học' }] },
      '@/services/adminCustomerService': { listAdminCustomerProfiles: async (input) => { assert.ok(guarded); options = input; return [row({ secret: 'never-project' })]; } },
      '@/components/admin/sales-dashboard': { SalesDashboard: () => null },
      '@/lib/admin/sales-dashboard': model,
    });
    const result = await page.default({ searchParams: Promise.resolve({}) });
    assert.equal(options.includeProspects, role === 'owner'); assert.equal(result.props.includeProspects, role === 'owner');
    assert.equal(result.props.records[0].secret, undefined);
  }
});
test('auth rejection prevents data loading', async () => {
  let fetched = false;
  const page = load('app/admin/crm-v2/sales/page.tsx', {
    '@/lib/auth/session': { requireAdminAuth: async () => { throw new Error('redirect'); } },
    '@/services/courseService': { getCourseSummariesStrict: async () => [{ slug: 'course', title: 'Khóa học' }] },
      '@/services/adminCustomerService': { listAdminCustomerProfiles: async () => { fetched = true; return []; } },
    '@/components/admin/sales-dashboard': { SalesDashboard: () => null }, '@/lib/admin/sales-dashboard': model,
  });
  await assert.rejects(page.default({ searchParams: Promise.resolve({}) }), /redirect/); assert.equal(fetched, false);
});
test('dashboard renders labeled filters, empty state and real contact details', () => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const { SalesDashboard } = load('components/admin/sales-dashboard.tsx', { 'next/navigation': { useRouter: () => ({ refresh() {} }) }, '@/lib/admin/sales-dashboard': model, '@/components/admin/admin-dialog': { AdminDialog: () => null } });
  const props = { today: '2026-10-01', loadedAt: '2026-10-01T00:00:00Z', initialFilters: defaults, includeProspects: true };
  const html = renderToStaticMarkup(require('react').createElement(SalesDashboard, { ...props, records: [row(), row({id: 'paid', paidOrderCodes: ['paid'], pendingOrderCodes: ['pending']})] }));
  const ext = createRequire(process.env.SUPPORT_UI_TEST_MODULE || '/private/tmp/theanh-sales-ui-20261001/package.json');
  const { parseDocument } = ext('htmlparser2'); const select = ext('css-select');
  const doc = parseDocument(html);
  const textOf = node => node.type === 'text' ? node.data : (node.children || []).map(textOf).join('');
  assert.deepEqual(select.selectAll('thead th', doc).map(textOf), ['Ngày', 'Tên', 'SĐT', 'Tình trạng', 'Sản phẩm', 'Email']);
  const section = select.selectOne('section[aria-label="Danh sách khách hàng"]', doc);
  assert.equal(select.selectAll('[aria-label="Bộ lọc khách hàng"]', section).length, 1);
  assert.equal(select.selectAll('section', doc).length, 1);
  const statuses = select.selectAll('tbody tr', doc).map(tr => textOf(select.selectAll('td',tr)[3]));
  assert.deepEqual(statuses.sort(), ['Paid', 'Unpaid']);
  assert.ok(select.selectOne('tbody .text-emerald-700', doc)); assert.ok(select.selectOne('tbody .text-red-700', doc));
  for (const text of ['Bộ lọc khách hàng', 'Từ ngày', 'Đến ngày', 'fixture@example.invalid', '+84 900 000 001', 'Lấy email', 'Lấy SĐT', 'Tải CSV']) assert.ok(html.includes(text), text);
  const empty = renderToStaticMarkup(require('react').createElement(SalesDashboard, { ...props, records: [] }));
  assert.ok(empty.includes('Không có khách khớp bộ lọc'));
});
test('sale interactions copy selected rows, reset selection on filter and recover from clipboard denial', async () => {
  const ext = createRequire(process.env.SUPPORT_UI_TEST_MODULE || '/private/tmp/theanh-support-ui-20260928/package.json');
  const React = ext('react'); const { create, act } = ext('react-test-renderer');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const copied = [];
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => copied.push(value) } } });
  const { SalesDashboard } = load('components/admin/sales-dashboard.tsx', {
    react: React, 'react/jsx-runtime': ext('react/jsx-runtime'), 'next/navigation': { useRouter: () => ({ refresh() {} }) },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
    'lucide-react': new Proxy({}, { get: () => () => null }), '@/lib/admin/sales-dashboard': model,
    '@/components/admin/admin-dialog': { AdminDialog: ({ open, children }) => open ? React.createElement('div', { 'data-dialog': true }, children) : null },
  });
  let renderer;
  const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
  try {
    await act(async () => { renderer = create(React.createElement(SalesDashboard, { records: [row(), row({ id: 'two', name: 'Khách B', email: 'second@example.invalid', phone: '' })], today: '2026-10-01', loadedAt: '2026-10-01T00:00:00Z', initialFilters: defaults, includeProspects: true })); });
    const button = prefix => renderer.root.findAllByType('button').find(n => text(n).startsWith(prefix));
    await act(async () => button('Lấy email').props.onClick());
    assert.equal(copied[0].split('\n').length, 2);
    await act(async () => renderer.root.findAllByType('input').find(n => n.props['aria-label'] === 'Chọn Khách B').props.onChange());
    await act(async () => button('Lấy email').props.onClick()); assert.equal(copied[1], 'second@example.invalid');
    assert.equal(button('Lấy SĐT').props.disabled, true);
    await act(async () => renderer.root.findByProps({ type: 'search' }).props.onChange({ target: { value: 'dang anh' } }));
    assert.ok(!button('Bỏ chọn'));
    await act(async () => button('Lấy email').props.onClick()); assert.equal(copied[2], 'fixture@example.invalid');
    await act(async () => renderer.root.findByProps({ 'aria-label': 'Xem chi tiết Đặng Ánh' }).props.onClick()); assert.equal(renderer.root.findAllByProps({ 'data-dialog': true }).length, 1);
    await act(async () => button('Đóng').props.onClick()); assert.equal(renderer.root.findAllByProps({ 'data-dialog': true }).length, 0);
    globalThis.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
    await act(async () => button('Lấy email').props.onClick()); assert.ok(text(renderer.root.findByProps({ role: 'status' })).includes('chưa cho phép'));
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
  }
});

test('product abbreviations stay short and CSV follows the requested column order', () => {
  const r = row({courseSlugs: ['facebook-ads-2026', 'ebook-facebook-ads-2026', 'bo-agent-kit-x10-hieu-suat-cong-viec'], paidOrderCodes: ['paid']});
  assert.deepEqual(model.salesProductLabels(r), ['FB Ads', 'Ebook FB', 'Agent Kit']);
  assert.ok(model.shortSalesProduct('', 'Một tên khóa học rất dài dùng để kiểm tra').length <= 20);
  assert.equal(model.salesCsv([r]).split('\r\n')[0], '\uFEFF"Ngày","Tên","SĐT","Tình trạng","Sản phẩm","Email"');
  assert.ok(model.salesCsv([r]).includes('"Paid","FB Ads; Ebook FB; Agent Kit"'));
});

test('default filter is today in Vietnam while an explicit all range remains available', () => {
  const today = model.vietnamDay('2026-09-30T17:01:00Z');
  const filters = model.initialSalesFilters({}, today);
  assert.equal(today, '2026-10-01');
  assert.equal(filters.from, today); assert.equal(filters.to, today);
  assert.deepEqual(model.datePreset('today', today), {from: today, to: today});
  const all = model.initialSalesFilters({range: 'all'}, today);
  assert.equal(all.from, ''); assert.equal(all.to, '');
});
