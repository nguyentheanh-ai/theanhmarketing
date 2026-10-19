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
const model = load('lib/admin/sales-care.ts');
const row = { id: 'email:fixture@example.invalid', email: 'fixture@example.invalid', phone: '0900000001' };
const input = { customerId: row.id, status: 'called', note: 'Có nhu cầu\nHẹn ngày mai' };
const savedRow = { id: 'new-event', metadata: { action: 'sales_care', customerKey: row.id, careStatus: 'called' }, event_description: input.note, actor_name: 'Sale A', actor_email: 'sale@example.invalid', created_at: '2026-10-19T01:00:00Z' };
test('accepts only care statuses, preserves multiline notes, rejects oversized/malformed input', () => {
  assert.deepEqual(model.parseSalesCareInput(input), input);
  for (const status of ['paid', 'unpaid', '__proto__', 'toString', null]) assert.equal(model.parseSalesCareInput({ ...input, status }), null);
  for (const value of [null, [], {}, { ...input, note: 2 }, { ...input, note: 'a'.repeat(1001) }, { ...input, customerId: '' }]) assert.equal(model.parseSalesCareInput(value), null);
  assert.equal(model.parseSalesCareInput({ ...input, note: '\u0000abc\r\nxyz' }).note, 'abc\nxyz');
});
function serviceHarness(data = [savedRow], error = null) {
  const operations = []; let inserted;
  const chain = new Proxy({}, { get(_target, property) {
    if (property === 'then') return (resolve) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
    return (...args) => { operations.push([property, ...args]); if (property === 'insert') inserted = args[0]; return chain; };
  } });
  const service = load('services/salesCareService.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ from: (table) => { assert.equal(table, 'activity_logs'); return chain; } }) },
    '@/lib/admin/read-all-rows': load('lib/admin/read-all-rows.ts'),
    '@/services/adminCustomerService': { customerIdentity: (email, phone, id) => email ? `email:${email.trim().toLowerCase()}` : phone ? `phone:${phone.replace(/\D/g, '')}` : `record:${id}` },
    '@/lib/admin/sales-care': model,
  });
  return { service, operations, inserted: () => inserted };
}
test('saving appends one atomic activity with verified actor and care state, without changing customer/payment', async () => {
  const h = serviceHarness(savedRow); // single() returns an object
  const result = await h.service.saveSalesCare(row, input, { id: 'actor-id', email: 'sale@example.invalid', name: 'Sale A' });
  assert.equal(result.status, 'called'); assert.equal(result.note, input.note); assert.equal(result.actorName, 'Sale A');
  assert.equal(h.inserted().actor_id, 'actor-id'); assert.equal(h.inserted().metadata.customerKey, row.id);
  assert.equal(h.operations.filter(([op]) => op === 'insert').length, 1);
  assert.equal(h.operations.some(([op]) => ['update', 'upsert', 'delete'].includes(op)), false);
});
test('save failures never report success and history read fails closed', async () => {
  const h = serviceHarness(null, { message: 'db unavailable' });
  await assert.rejects(h.service.saveSalesCare(row, input, { id: 'a', name: 'Sale' }), /Chưa xác nhận/);
  await assert.rejects(h.service.getSalesCareHistory(row), /Không đọc/);
});
test('summary selects latest update deterministically and queries only permitted customer keys', async () => {
  const older = { ...savedRow, id: 'older', created_at: '2026-10-18T00:00:00Z', metadata: { ...savedRow.metadata, careStatus: 'zalo_contacted' } };
  const h = serviceHarness([older, savedRow]);
  const summaries = await h.service.listSalesCareSummaries([row]);
  assert.equal(summaries[row.id].status, 'called');
  assert.deepEqual(h.operations.find(([op]) => op === 'in'), ['in', 'metadata->>customerKey', [row.id]]);
  assert.deepEqual(await h.service.listSalesCareSummaries([]), {});
});
function routeHarness({ role = 'editor', user = { id: 'verified-actor', email: 'sale@example.invalid', user_metadata: { full_name: 'Sale thật' } }, records = [row], fail = false, rate = true, enabled = true } = {}) {
  const calls = [];
  const route = load('app/api/admin/crm-v2/sales/care/route.ts', {
    'next/server': { NextResponse: { json: (body, init = {}) => Response.json(body, init) } },
    '@/lib/auth/session': { getCurrentAuth: async () => ({ user, adminRole: role }) },
    '@/lib/admin/sales-care': model,
    '@/lib/crm-v2/feature-flag': { isCrmV2Enabled: () => enabled },
    '@/lib/security/rate-limit': { checkRateLimit: () => ({ ok: rate }), rateLimitKey: () => 'rate' },
    '@/services/adminCustomerService': { listAdminCustomerProfiles: async (options) => { calls.push(['scope', options]); return records; } },
    '@/services/salesCareService': { getSalesCareHistory: async (record) => { calls.push(['read', record]); if (fail) throw new Error('db'); return []; }, saveSalesCare: async (...args) => { calls.push(['write', ...args]); if (fail) throw new Error('db'); return { id: 'saved' }; } },
  });
  return { route, calls };
}
const post = (body = input, origin = 'https://www.theanhmarketing.com') => new Request('https://www.theanhmarketing.com/api/admin/crm-v2/sales/care', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('API derives actor from session, keeps editor scope, ignores forged actor and payment fields', async () => {
  const h = routeHarness();
  const response = await h.route.POST(post({ ...input, actorId: 'forged', actorName: 'Fake', paymentStatus: 'paid' }));
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(h.calls[0], ['scope', { includeProspects: false }]);
  const write = h.calls.find(([op]) => op === 'write');
  assert.deepEqual(write[3], { id: 'verified-actor', email: 'sale@example.invalid', name: 'Sale thật' });
  assert.equal(write[2].paymentStatus, undefined);
});
test('owner can access prospects; editors cannot read or write a customer outside their existing scope', async () => {
  const owner = routeHarness({ role: 'owner' });
  assert.equal((await owner.route.GET(new Request(`https://www.theanhmarketing.com/api/admin/crm-v2/sales/care?customerId=${encodeURIComponent(row.id)}`))).status, 200);
  assert.equal(owner.calls[0][1].includeProspects, true);
  const editor = routeHarness({ records: [] });
  assert.equal((await editor.route.POST(post())).status, 404);
  assert.equal((await editor.route.GET(new Request(`https://www.theanhmarketing.com/api/admin/crm-v2/sales/care?customerId=${encodeURIComponent(row.id)}`))).status, 404);
  assert.equal(editor.calls.some(([op]) => ['read', 'write'].includes(op)), false);
});
test('guest, wrong role, CSRF, malformed input and rate limit are denied before customer lookup', async () => {
  for (const options of [{ user: null }, { role: 'student' }]) {
    const h = routeHarness(options); assert.equal((await h.route.POST(post())).status, 403); assert.equal(h.calls.length, 0);
  }
  const h = routeHarness();
  assert.equal((await h.route.POST(post(input, 'https://evil.invalid'))).status, 403);
  assert.equal((await h.route.POST(post({ ...input, status: 'paid' }))).status, 400);
  assert.equal(h.calls.length, 0);
  assert.equal((await routeHarness({ enabled: false }).route.POST(post())).status, 404);
  assert.equal((await routeHarness({ rate: false }).route.POST(post())).status, 429);
  assert.equal((await routeHarness({ fail: true }).route.POST(post())).status, 503);
});

test('care editor loads latest state, saves multiline note, shows actor/history and blocks blind retries', async () => {
  const ext = createRequire('/private/tmp/theanh-crm-sales-ui/package.json');
  const React = ext('react'); const { create, act } = ext('react-test-renderer');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const previousFetch = globalThis.fetch;
  let fail = false; const posts = []; const busy = []; const saved = [];
  const entry = { id: 'old', status: 'zalo_contacted', note: 'Đã nhắn Zalo', actorName: 'Sale trước', actorEmail: 'before@example.invalid', updatedAt: '2026-10-18T00:00:00Z' };
  globalThis.fetch = async (_url, options) => {
    if (options?.method === 'POST') {
      posts.push(JSON.parse(options.body));
      if (fail) return Response.json({ ok: false, message: 'Chưa xác nhận được lần lưu' }, { status: 503 });
      return Response.json({ ok: true, saved: { ...entry, id: 'new', status: posts.at(-1).status, note: posts.at(-1).note, actorName: 'Sale mới' } });
    }
    return Response.json({ ok: true, history: [entry] });
  };
  const { SalesCareEditor } = load('components/admin/sales-care-editor.tsx', { react: React, 'react/jsx-runtime': ext('react/jsx-runtime'), '@/lib/admin/sales-care': model });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(SalesCareEditor, { customerId: row.id, onSaved: value => saved.push(value), onBusyChange: value => busy.push(value) })); });
    assert.equal(renderer.root.findByType('textarea').props.value, entry.note);
    assert.equal(renderer.root.findByType('select').props.value, 'zalo_contacted');
    await act(async () => renderer.root.findByType('select').props.onChange({ target: { value: 'zoom_met' } }));
    await act(async () => renderer.root.findByType('textarea').props.onChange({ target: { value: 'Đã họp\nKhách cần gọi lại' } }));
    await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.deepEqual(posts[0], { customerId: row.id, status: 'zoom_met', note: 'Đã họp\nKhách cần gọi lại' });
    assert.equal(saved[0].actorName, 'Sale mới'); assert.deepEqual(busy, [true, false]);
    assert.equal(renderer.root.findAllByType('article').length, 2);
    fail = true;
    await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(saved.length, 1);
    assert.equal(renderer.root.findByProps({ type: 'submit' }).props.disabled, true);
    await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(posts.length, 2);
    const reload = renderer.root.findAllByType('button').find(n => n.props.type === 'button');
    await act(async () => reload.props.onClick());
    assert.equal(renderer.root.findByProps({ type: 'submit' }).props.disabled, false);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = previousFetch;
  }
});
