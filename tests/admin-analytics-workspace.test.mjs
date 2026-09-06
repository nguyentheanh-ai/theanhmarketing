import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const full = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(full), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx', mocks);
    }
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const analytics = load('lib/crm-v2/analytics.ts');
const range = { range: 'custom', from: '2026-09-01', to: '2026-09-06' };
const catalog = [{ slug: 'a', title: 'Khóa học A có tên rất dài để kiểm tra bảng hiển thị rõ ràng' }, { slug: 'b', title: 'Sản phẩm B' }];
const order = (id, options = {}) => ({ id, order_code: id, email: `${id}@example.invalid`, course_slug: 'a', course_title: 'A', amount: 100, status: 'paid', created_at: '2026-09-02T00:00:00Z', paid_at: '2026-09-02T02:00:00Z', ...options });

test('bundle allocation preserves actual paid cash and product filters apply to every metric and drilldown', () => {
  const rows = [order('combo', { course_slug: 'a,b', amount: 799, order_items: [{ slug: 'a', title: 'A', price: 800 }, { slug: 'b', title: 'B', price: 200 }] }), order('solo', { amount: 301, email: 'COMBO@example.invalid' })];
  const all = analytics.buildAdminAnalytics(rows, catalog, { range, product: '' });
  assert.equal(all.totals.revenue, 1100); assert.equal(all.totals.paidOrders, 2); assert.equal(all.totals.buyers, 1);
  assert.equal(all.productRows.reduce((sum, row) => sum + row.revenue, 0), 1100);
  assert.equal(all.productRows.find(row => row.slug === 'a').title, catalog[0].title);
  const product = analytics.buildAdminAnalytics(rows, catalog, { range, product: 'b' });
  assert.equal(product.totals.revenue, 160); assert.equal(product.totals.paidOrders, 1); assert.equal(product.totals.createdOrders, 1);
  assert.equal(product.productRows.length, 1); assert.equal(product.orderRows[0].amount, 160);
  assert.equal(product.sourceRows.reduce((sum, row) => sum + row.revenue, 0), 160);
  assert.equal(product.trend.reduce((sum, row) => sum + row.value, 0), 160);
});
test('zero-priced bundle items get no invented revenue and repeated product lines merge', () => {
  const lines = analytics.allocateOrderProducts(order('free', { amount: 799, order_items: [{ slug: 'a', price: 799 }, { slug: 'b', price: 0 }, { slug: 'a', price: 0 }] }));
  assert.equal(lines.length, 2); assert.equal(lines.find(row => row.slug === 'b').amount, 0);
  assert.equal(lines.reduce((sum, row) => sum + row.amount, 0), 799);
  const legacy = analytics.allocateOrderProducts(order('legacy', { course_slug: 'a,b', amount: 99, order_items: [{ slug: 'a', price: 0 }, { slug: 'b', price: 0 }] }));
  assert.deepEqual(legacy.map(row => [row.slug, row.amount]), [['a,b',99]]);
});
test('fractional bundle allocation never assigns negative cash to gifts and breaks ties deterministically', () => {
  for (const amount of [1, 2, 101, 799, 799000]) {
    const input = order(`tie-${amount}`, { amount, order_items: [{ slug: 'a', price: 1 }, { slug: 'b', price: 1 }, { slug: 'gift', price: 0 }] });
    const allocated = analytics.allocateOrderProducts(input);
    assert.equal(allocated.find(row => row.slug === 'gift').amount, 0);
    assert.equal(allocated.find(row => row.slug === 'a').amount, Math.ceil(amount / 2));
    assert.equal(allocated.find(row => row.slug === 'b').amount, Math.floor(amount / 2));
    assert.equal(allocated.reduce((sum, row) => sum + row.amount, 0), amount);
    assert.ok(allocated.every(row => row.amount >= 0));
    assert.deepEqual(analytics.allocateOrderProducts(input), allocated);
    const gift = analytics.buildAdminAnalytics([input], catalog, { range, product: 'gift' });
    assert.equal(gift.totals.revenue, 0);
    assert.ok(gift.trend.every(row => row.value === 0));
  }
  const weighted = analytics.allocateOrderProducts(order('uneven', { amount: 11, order_items: [{ slug: 'gift', price: 0 }, { slug: 'a', price: 7 }, { slug: 'b', price: 2 }, { slug: 'c', price: 1 }] }));
  assert.deepEqual(weighted.map(row => row.amount), [0, 8, 2, 1]);
});
test('cash revenue uses paid_at; conversion is the same created-order cohort and cuts off future payments', () => {
  const snapshot = analytics.buildAdminAnalytics([
    order('old-created', { created_at: '2026-08-01T00:00:00Z', amount: 500 }),
    order('new-paid', { amount: 200 }),
    order('later-paid', { amount: 300, paid_at: '2026-09-07T00:00:00Z' }),
    order('expired', { status: 'expired', payment_status: 'pending', paid_at: null, amount: 400 }),
  ], catalog, { range, product: '' });
  assert.equal(snapshot.totals.revenue, 700); assert.equal(snapshot.totals.paidOrders, 2);
  assert.equal(snapshot.totals.createdOrders, 3); assert.equal(snapshot.totals.cohortPaidOrders, 1);
  assert.ok(Math.abs(snapshot.totals.conversion - 100 / 3) < 0.000001);
  assert.equal(snapshot.statuses.find(row => row.label === 'Chờ thanh toán').value, 1);
  assert.equal(snapshot.statuses.find(row => row.label === 'Hết hạn / hủy / lỗi').value, 1);
});
test('Vietnam midnight, pending payment mirrors and empty data remain truthful', () => {
  const selection = { range: { range: 'custom', from: '2026-09-06', to: '2026-09-06' }, product: '' };
  const data = analytics.buildAdminAnalytics([order('vietnam', { paid_at: '2026-09-05T17:10:00Z', created_at: '2026-08-01T00:00:00Z', payment_status: 'pending' }), order('utc', { paid_at: '2026-09-06T17:01:00Z' })], catalog, selection);
  assert.equal(data.totals.revenue, 100); assert.equal(data.trend[0].value, 100);
  assert.equal(data.resolution, 'hour');
  const empty = analytics.buildAdminAnalytics([], catalog, selection);
  assert.equal(empty.totals.revenue, 0); assert.equal(empty.totals.conversion, null); assert.equal(empty.productRows.length, 0);
  assert.ok(empty.trend.every(row => row.value === 0));
});
test('invalid ranges, duplicate IDs and invalid financial values fail explicitly', () => {
  for (const date of ['2026-02-30','2026-13-01','bad']) assert.throws(() => analytics.getAnalyticsSelection({ range: 'custom', dateFrom: date, dateTo: '2026-09-06' }), /hợp lệ/);
  assert.throws(() => analytics.getAnalyticsSelection({ range: 'custom', dateFrom: '2020-01-01', dateTo: '2026-09-06' }), /3 năm/);
  assert.throws(() => analytics.buildAdminAnalytics([order('same'),order('same')], catalog, { range, product: '' }), /trùng/);
  assert.throws(() => analytics.allocateOrderProducts(order('bad', { amount: 'invalid' })), /không hợp lệ/);
});
test('sales reader uses the public orders once, counts every page, and needs no CRM or Meta connection', async () => {
  const reads = [];
  const client = { from(table) {
    reads.push(table); let chain;
    chain = { select(){return chain}, or(){return chain}, order(){return chain}, range(offset, end){return Promise.resolve({ data: table === 'orders' ? [order('real')].slice(offset, end + 1) : catalog.map((row,index) => ({id:String(index),...row})).slice(offset,end+1), error:null, count:table==='orders'?1:2 })} };
    return chain;
  } };
  const service = load('services/adminAnalyticsService.ts', { '@/lib/supabase/admin': { createSupabaseAdminClient: () => client } });
  const data = await service.getAdminAnalytics({ range, product:'' });
  assert.equal(data.totals.revenue, 100); assert.deepEqual(reads.sort(), ['courses','orders']);
  assert.ok(!JSON.stringify(data).includes('@example.invalid'));
});
test('advertising endpoint checks owner capability before external read', async () => {
  let read = false;
  const handler = load('app/api/admin/analytics/ads/route.ts', {
    '@/lib/auth/session': { getCurrentAuth: async () => ({ adminRole: 'editor' }), canAccessAdminRole: () => false },
    '@/services/metaAdsReportService': { getMetaAdsReport: async () => { read = true; return {}; } },
    'next/server': { NextResponse: { json: (body, options) => ({body,...options}) } },
  });
  const result = await handler.GET(new Request('https://example.invalid/api/admin/analytics/ads'));
  assert.equal(result.status,403); assert.equal(read,false);
});
test('workspace filters navigate together, tabs show one panel, and Ads failure leaves sales usable', async () => {
  const external = createRequire(process.env.SUPPORT_UI_TEST_MODULE || '/private/tmp/theanh-admin-db-tests/package.json');
  const React = external('react'), { create, act } = external('react-test-renderer');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const navigation = [], oldFetch = globalThis.fetch;
  const data = analytics.buildAdminAnalytics([order('fixture')], catalog, {range,product:''});
  const chart = new Proxy({}, { get: () => () => null });
  const { AnalyticsWorkspace } = load('components/crm-v2/analytics-workspace.tsx', {
    react:React, 'react/jsx-runtime': external('react/jsx-runtime'), recharts:chart, 'lucide-react':chart,
    'next/navigation': { usePathname:()=>'/admin/crm-v2', useRouter:()=>({push:url=>navigation.push(url),refresh(){}}) },
    '@/components/admin/admin-dialog': { AdminDialog:({open,children})=>open?React.createElement('div',{role:'dialog'},children):null },
  });
  let view; const text = node => typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
  try {
    await act(()=>{view=create(React.createElement(AnalyticsWorkspace,{data}))});
    assert.equal(view.root.findAll(node=>node.props.role==='tabpanel').length,1);
    assert.equal(view.root.findAll(node=>node.props.role==='dialog').length,0);
    const productSelect = view.root.findAllByType('select').find(node=>node.props.children.some?.(child=>child?.props?.value===''));
    await act(()=>productSelect.props.onChange({target:{value:'b'}}));
    await act(()=>view.root.findByType('form').props.onSubmit({preventDefault(){}}));
    const url = new URL(navigation[0],'https://example.invalid');
    assert.equal(url.searchParams.get('course'),'b'); assert.equal(url.searchParams.get('dateFrom'),range.from);
    globalThis.fetch = async()=>{throw new Error('offline')};
    await act(async()=>{view.root.findAllByType('button').find(node=>text(node)==='Quảng cáo').props.onClick();await new Promise(resolve=>setImmediate(resolve));});
    assert.match(JSON.stringify(view.toJSON()),/đơn hàng đã thanh toán/);
    await act(()=>view.root.findAllByType('button').find(node=>text(node)==='Sản phẩm').props.onClick());
    assert.ok(JSON.stringify(view.toJSON()).includes(catalog[0].title));
    assert.equal(view.root.findAll(node=>node.props.role==='tabpanel').length,1);
    await act(()=>view.root.findAllByType('button').find(node=>text(node).includes('Đối chiếu đơn')).props.onClick());
    assert.equal(view.root.findAll(node=>node.props.role==='dialog').length,1);
  } finally { if(view) await act(()=>view.unmount()); globalThis.fetch=oldFetch; }
});
