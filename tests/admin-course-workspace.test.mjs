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
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(full), name) + '.ts', mocks);
    if (name === 'server-only') return {};
    return require(name);
  }, mod, mod.exports);
  return mod.exports;
}
const cid = '10000000-0000-4000-8000-000000000001';
const mid = '20000000-0000-4000-8000-000000000001';
const mid2 = '20000000-0000-4000-8000-000000000002';
const lid = '30000000-0000-4000-8000-000000000001';
const rid = '40000000-0000-4000-8000-000000000001';
function database({ legacy = false, crossCourse = false, missing = false, writeError = null } = {}) {
  const calls = [];
  const records = {
    courses: [{ id: cid, slug: 'fixture-course' }],
    course_modules: [{ id: mid, course_id: cid }, { id: mid2, course_id: crossCourse ? '10000000-0000-4000-8000-000000000002' : cid }],
    lessons: [{ id: lid, course_id: cid, module_id: mid, slug: 'fixture-lesson', youtube_url: 'https://youtube.com/watch?v=old-video' }],
    course_resources: legacy || missing ? [] : [{ id: rid, course_id: cid, module_id: mid, lesson_id: lid, title: 'Original' }],
    lesson_resources: legacy && !missing ? [{ id: rid, lesson_id: lid, title: 'Original' }] : [],
  };
  const client = { from(table) {
    let filters = [], mutation = null;
    const result = () => { const found = (records[table] || []).find((row) => filters.every(([key, value]) => row[key] === value)); return { data: found || null, error: mutation ? writeError : null }; };
    const q = { select() { return q; }, eq(key, value) { filters.push([key, value]); return q; }, neq() { return q; }, order() { return q; }, limit() { return q; },
      update(data) { mutation = 'update'; calls.push({ table, operation: mutation, data }); return q; },
      delete() { mutation = 'delete'; calls.push({ table, operation: mutation }); return q; },
      insert(data) { mutation = 'insert'; calls.push({ table, operation: mutation, data }); return q; },
      maybeSingle: async () => result(), single: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    }; return q;
  }, rpc: async () => ({ data: { enrollments: [], progress: [] }, error: null }) };
  return { client, calls };
}
function lms(client) { return load('services/lmsService.ts', { '@/lib/supabase/admin': { createSupabaseAdminClient: () => client }, '@/services/activityLogService': { logStudentActivity: async () => {} }, '@/services/studentProvisioningOperationService': { ProvisioningOperationLostLeaseError: class extends Error {} } }); }

test('lesson cannot move to another course; same-course moves retain the lesson identity', async () => {
  const bad = database({ crossCourse: true });
  await assert.rejects(lms(bad.client).updateLmsLesson({ lessonId: lid, moduleId: mid2 }), /khóa khác/);
  assert.equal(bad.calls.length, 0);
  const good = database();
  await lms(good.client).updateLmsLesson({ lessonId: lid, moduleId: mid2, title: 'Moved' });
  assert.equal(good.calls[0].data.module_id, mid2);
  assert.equal(good.calls[0].data.course_id, cid);
  assert.ok(!good.calls.some((call) => call.operation === 'delete' || call.operation === 'insert'));
});
test('resource operations find the original legacy table and do not report success for unknown IDs', async () => {
  const db = database({ legacy: true });
  await lms(db.client).updateLmsResource({ resourceId: rid, title: 'Edited', lessonId: lid, moduleId: mid });
  assert.equal(db.calls[0].table, 'lesson_resources');
  assert.equal(db.calls[0].data.title, 'Edited');
  assert.ok(!Object.hasOwn(db.calls[0].data, 'module_id'));
  await lms(db.client).deleteLmsResource({ resourceId: rid });
  assert.equal(db.calls[1].table, 'lesson_resources');
  const missing = database({ missing: true });
  await assert.rejects(lms(missing.client).updateLmsResource({ resourceId: rid, title: 'Missing' }), /không còn tồn tại/);
  await assert.rejects(lms(missing.client).deleteLmsResource({ resourceId: rid }), /không còn tồn tại/);
  assert.equal(missing.calls.length, 0);
});
test('resource parent validation rejects cross-course and mismatched module writes before mutations', async () => {
  const db = database({ crossCourse: true });
  await assert.rejects(lms(db.client).createLmsResource({ courseId: cid, moduleId: mid2, title: 'Fixture', url: 'https://example.invalid/file' }), /không thuộc khóa/);
  await assert.rejects(lms(db.client).updateLmsResource({ resourceId: rid, moduleId: mid2, lessonId: lid }), /không thuộc chương/);
  assert.equal(db.calls.length, 0);
});
test('blank titles and executable resource URLs are rejected; database errors are surfaced', async () => {
  const db = database();
  await assert.rejects(lms(db.client).updateLmsCourse({ courseId: cid, title: '  ' }), /để trống/);
  await assert.rejects(lms(db.client).updateLmsModule({ moduleId: mid, title: '  ' }), /để trống/);
  await assert.rejects(lms(db.client).updateLmsLesson({ lessonId: lid, title: '  ' }), /để trống/);
  await assert.rejects(lms(db.client).updateLmsResource({ resourceId: rid, url: 'javascript:alert(1)' }), /HTTP/);
  assert.equal(db.calls.length, 0);
  const denied = database({ writeError: { message: 'fixture write denied' } });
  await assert.rejects(lms(denied.client).updateLmsResource({ resourceId: rid, title: 'New' }), /write denied/);
});
test('archive module keeps lessons and progress; changed video derives a new embed URL', async () => {
  const db = database();
  await lms(db.client).deleteLmsModule({ moduleId: mid });
  assert.deepEqual(db.calls.map(({ table, operation }) => ({ table, operation })), [{ table: 'course_modules', operation: 'update' }]);
  assert.equal(db.calls[0].data.status, 'archived');
  await lms(db.client).updateLmsLesson({ lessonId: lid, youtubeUrl: 'https://youtube.com/watch?v=new-video', embedUrl: '' });
  assert.equal(db.calls[1].data.embed_url, 'https://www.youtube.com/embed/new-video');
  await lms(db.client).updateLmsLesson({ lessonId: lid, youtubeUrl: '', embedUrl: '' });
  assert.equal(db.calls[2].data.embed_url, '', 'clearing a video must not resurrect its previous embed');
});

function fixture() {
  const lesson = { id: lid, title: 'Bài Alpha', slug: 'alpha', courseId: cid, moduleId: mid, status: 'published', description: '', content: 'Draft body', lessonType: 'video', duration: '12 phút', youtubeUrl: '', embedUrl: '', accessType: 'enrolled_only', resources: [{ id: rid, title: 'Tài liệu bài Alpha', type: 'file', url: '/fixture.pdf', courseId: cid, moduleId: mid, lessonId: lid }], position: 1 };
  const course = { id: cid, slug: 'fixture-course', title: 'Khóa học kiểm thử', status: 'published', description: '', shortDescription: '', thumbnailImage: '', bannerImage: '', previewVideoUrl: '', updatedAt: 'fixture-version', visibility: 'enrolled', stats: { modules: 2, lessons: 2, publishedLessons: 2, activeStudents: 0 }, enrollments: [], resources: [{ id: 'resource-course', title: 'Tài liệu toàn khóa', url: '/course.pdf', type: 'file', lessonId: null }], modules: [{ id: mid, title: 'Chương Alpha', status: 'published', lessons: [lesson] }, { id: mid2, title: 'Chương Beta', status: 'published', lessons: [{ ...lesson, id: '30000000-0000-4000-8000-000000000002', moduleId: mid2, title: 'Bài Beta', resources: [] }] }] };
  return { ok: true, selectedCourse: course, selectedCourseSlug: course.slug, courses: [course], enrollments: [], generatedAt: 'fixture-version' };
}
const content = (node) => typeof node === 'string' ? node : Array.isArray(node) ? node.map(content).join('') : node?.props ? content(node.props.children) : '';
async function withUI(fn, { snapshot = fixture(), step = 'curriculum', hub = false } = {}) {
  assert.ok(process.env.SUPPORT_UI_TEST_MODULE, 'Set SUPPORT_UI_TEST_MODULE to the existing isolated React test runtime');
  const external = createRequire(process.env.SUPPORT_UI_TEST_MODULE);
  const React = external('react'); const { create, act } = external('react-test-renderer');
  const previous = { fetch: globalThis.fetch, window: globalThis.window, FormData: globalThis.FormData };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = { history: { state: null, replaceState() {} }, addEventListener() {}, removeEventListener() {} };
  let values = {}, refreshed = 0, pushes = [];
  globalThis.FormData = class { get(key) { return values[key] ?? ''; } };
  const mocks = { react: React, 'react/jsx-runtime': external('react/jsx-runtime'), 'lucide-react': new Proxy({}, { get: (_target, name) => (props) => React.createElement('svg', { ...props, 'data-icon': name }) }), 'next/image': (props) => React.createElement('img', props), 'next/link': (props) => React.createElement('a', props), 'next/navigation': { useRouter: () => ({ refresh: () => refreshed++, push: (url) => pushes.push(url) }), useSearchParams: () => new URLSearchParams({ step }) }, '@/components/admin/admin-dialog': { AdminDialog: ({ open, title, children, onClose }) => open ? React.createElement('section', { 'data-dialog': title, onClose }, children) : null }, '@/lib/supabase/client': { createSupabaseBrowserClient: () => null }, '@/lib/supabase/media-upload': { uploadMediaFile: async () => '' } };
  const mod = load(hub ? 'components/crm-v2/course-hub.tsx' : 'components/crm-v2/lms-management-client.tsx', mocks);
  let view;
  try {
    await act(() => { view = create(React.createElement(hub ? mod.CourseHub : mod.CourseLmsManager, hub ? { snapshot } : { lmsSnapshot: snapshot, studioMode: true })); });
    await fn({ view, act, button: (text) => { const node = view.root.findAllByType('button').find((item) => content(item) === text || item.props['aria-label'] === text); assert.ok(node, `Missing button: ${text}`); return node; }, setValues: (next) => { values = next; }, refreshed: () => refreshed, pushes: () => pushes });
  } finally { if (view) await act(() => view.unmount()); Object.assign(globalThis, previous); }
}
test('curriculum selection immediately shows the selected module lessons', async () => withUI(async ({ view, act, button }) => {
  assert.ok(view.root.findAllByType('article').some((node) => content(node).includes('Bài Alpha')));
  await act(() => view.root.findAllByType('button').find((node) => content(node).includes('Chương Beta') && node.props['aria-pressed'] !== undefined).props.onClick());
  assert.ok(view.root.findAllByType('article').some((node) => content(node).includes('Bài Beta')));
  assert.ok(!view.root.findAllByType('article').some((node) => content(node).includes('Bài Alpha')));
  await act(() => button('Thêm bài học').props.onClick());
  assert.equal(view.root.findByProps({ name: 'moduleId' }).props.defaultValue, mid2);
}));
test('failed lesson save keeps the same editor and inputs, shows error, and permits retry', async () => withUI(async ({ view, act, button, setValues, refreshed }) => {
  await act(() => button('Sửa bài: Bài Alpha').props.onClick());
  const input = view.root.findAllByProps({ name: 'title' }).find((node) => node.props.defaultValue === 'Bài Alpha');
  const dialog = () => view.root.findByProps({ 'data-dialog': 'Sửa bài học' });
  const form = () => dialog().findByType('form');
  setValues({ title: 'Edited draft', moduleId: mid, lessonType: 'video', status: 'published', accessType: 'enrolled_only' });
  globalThis.fetch = async () => { throw new Error('fixture offline'); };
  await act(async () => form().props.onSubmit({ preventDefault() {}, currentTarget: {} }));
  assert.match(content(dialog().findByProps({ role: 'alert' })), /fixture offline/);
  assert.equal(view.root.findAllByProps({ name: 'title' }).find((node) => node.props.defaultValue === 'Bài Alpha'), input);
  assert.equal(refreshed(), 0);
  assert.equal(dialog().findAllByType('button').find((node) => node.props.type === 'submit').props.disabled, false);
  let payload;
  globalThis.fetch = async (_url, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => ({ ok: true }) }; };
  await act(async () => form().props.onSubmit({ preventDefault() {}, currentTarget: {} }));
  assert.equal(payload.title, 'Edited draft'); assert.equal(payload.lessonId, lid); assert.equal(refreshed(), 1);
  assert.equal(view.root.findAllByProps({ 'data-dialog': 'Sửa bài học' }).length, 0);
}));
test('canceling discard confirmation retains the mounted draft form', async () => withUI(async ({ view, act, button }) => {
  await act(() => button('Thêm chương học').props.onClick());
  const form = view.root.findByProps({ 'data-dialog': 'Thêm chương học' }).findByType('form');
  await act(() => form.props.onChange());
  await act(() => view.root.findByProps({ 'data-dialog': 'Thêm chương học' }).props.onClose());
  assert.equal(view.root.findByProps({ 'data-dialog': 'Bỏ các thay đổi chưa lưu?' }).findByType('form'), form);
  await act(() => button('Tiếp tục sửa').props.onClick());
  assert.equal(view.root.findByProps({ 'data-dialog': 'Thêm chương học' }).findByType('form'), form);
  assert.equal(form.props.hidden, false);
}));
test('resource list includes both lesson and course resources, with scoped filtering', async () => withUI(async ({ view, act }) => {
  assert.equal(view.root.findAllByType('article').length, 2);
  await act(() => view.root.findByProps({ 'aria-label': 'Phạm vi tài liệu' }).props.onChange({ target: { value: 'lesson' } }));
  assert.equal(view.root.findAllByType('article').length, 1);
  assert.match(content(view.root.findByType('article')), /Tài liệu bài Alpha/);
}, { step: 'resources' }));
test('unavailable course data blocks creating; course creation failure keeps dialog open', async () => {
  await withUI(async ({ button }) => { assert.equal(button('Tạo khóa học').props.disabled, true); }, { hub: true, snapshot: { ...fixture(), ok: false, message: 'fixture unavailable', courses: [] } });
  await withUI(async ({ view, act, button, setValues, pushes }) => {
    await act(() => button('Tạo khóa học').props.onClick());
    setValues({ title: 'Khóa mới', slug: 'khoa-moi' });
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ ok: false, message: 'slug already exists' }) });
    await act(async () => view.root.findByType('form').props.action(new FormData()));
    assert.match(content(view.root.findByProps({ 'data-dialog': 'Tạo khóa học' })), /slug already exists/);
    assert.equal(pushes().length, 0);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, course: { slug: 'khoa-moi' } }) });
    await act(async () => view.root.findByType('form').props.action(new FormData()));
    assert.deepEqual(pushes(), ['/admin/course-studio/khoa-moi?step=curriculum']);
  }, { hub: true });
});
