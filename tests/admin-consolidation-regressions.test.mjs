import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file, mocks={}) {
  const full=path.resolve(file);
  const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',code)((name)=>{
    if(Object.hasOwn(mocks,name)) return mocks[name];
    if(name.startsWith('.')) return load(path.resolve(path.dirname(full),name)+'.ts',mocks);
    if(name.startsWith('@/')) return load(name.slice(2)+'.ts',mocks);
    if(name==='server-only') return {};
    return require(name);
  },mod,mod.exports);
  return mod.exports;
}
const id='11111111-1111-4111-8111-111111111111';
function lms(client) {
  return load('services/lmsService.ts',{
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},
    '@/services/activityLogService':{logStudentActivity:async()=>{}},
    '@/services/studentProvisioningOperationService':{ProvisioningOperationLostLeaseError:class extends Error{}},
  });
}
function fakeClient({readError=null,rpcError=null}={}) {
  const calls=[];
  return {calls,from(table){
    let operation='read';
    const q={select(){return q},order(){return q},in(){return q},
      update(data){operation='write';calls.push({table,operation,data});return q},
      eq(column,value){calls.push({table,column,value});return q},
      maybeSingle:async()=>({data:{id,slug:'existing-course',course_id:id},error:null}),
      then(resolve,reject){return Promise.resolve({data:table==='courses'?[{id,slug:'existing-course'}]:[{id}],error:operation==='read'?readError:null}).then(resolve,reject)} };
    return q;
  },rpc:async(name,args)=>{calls.push({name,args});return {data:{enrollments:[],progress:[]},error:rpcError}}};
}
test('standard UUID course ID is queried by id; slug remains stable',async()=>{
  const db=fakeClient();await lms(db).updateLmsCourse({courseId:id,title:'Updated'});
  assert.equal(db.calls[0].column,'id');
  await assert.rejects(lms(db).updateLmsCourse({courseId:id,slug:'changed-course'}),/slug|định danh/i);
});
test('reordering rejects duplicate IDs and reports database failure',async()=>{
  const db=fakeClient({rpcError:{message:'write denied'}});
  await assert.rejects(lms(db).reorderLmsModules({courseId:id,moduleIds:[id,id]}),/hợp lệ|trùng/i);
  await assert.rejects(lms(db).reorderLmsModules({courseId:id,moduleIds:[id]}),/write denied/);
  assert.ok(db.calls.some(call=>call.name==='admin_lms_reorder'));
  assert.equal(db.calls.filter(call=>call.operation==='write').length,0);
});
test('failed enrollment read is unavailable, never a successful empty admin snapshot',async()=>{
  const result=await lms(fakeClient({rpcError:{message:'read denied'}})).getAdminLmsSnapshot();
  assert.equal(result.ok,false);
  assert.match(result.message,/read denied/);
});
test('yesterday, custom long range, and year boundaries share Ads/revenue buckets',()=>{
  const revenue=load('lib/crm-v2/revenue-series.ts');
  const ads=load('lib/meta-ads/timezone.ts');
  for(const range of [
    {range:'yesterday',from:'2026-09-05',to:'2026-09-05'},
    {range:'custom',from:'2026-06-01',to:'2026-09-05'},
    {range:'custom',from:'2025-12-29',to:'2027-01-05'},
  ]) {
    const r=revenue.buildAdaptiveRevenueSeries([],range);
    const a=ads.aggregateMetaAdsForVietnam([],range,'Asia/Ho_Chi_Minh');
    assert.deepEqual(r.rows.map(x=>x.label),a.rows.map(x=>x.label));
    assert.equal(new Set(r.rows.map(x=>x.label)).size,r.rows.length);
    assert.notEqual(a.quality.status,'final');
  }
});
test('Vietnam midnight paid_at determines revenue; pending orders do not contribute',()=>{
  const {buildAdaptiveRevenueSeries}=load('lib/crm-v2/revenue-series.ts');
  const result=buildAdaptiveRevenueSeries([
    {status:'paid',paid_at:'2026-09-04T17:15:00Z',created_at:'2026-08-01T00:00:00Z',amount:500},
    {status:'pending',created_at:'2026-09-04T17:30:00Z',amount:900},
  ],{range:'yesterday',from:'2026-09-05',to:'2026-09-05'});
  assert.equal(result.resolution,'hour');assert.equal(result.rows[0].value,500);
  assert.equal(result.rows.reduce((sum,x)=>sum+x.value,0),500);
});
test('paid lead and paid order are one paid order; unknown source is never a course slug',()=>{
  const {aggregateRevenueAttribution}=load('lib/crm-v2/report-source.ts');
  const rows=aggregateRevenueAttribution([{source:'facebook',stage:'paid'}],[{status:'paid',amount:500,utm_source:'facebook'},{status:'pending',amount:900},{status:'paid',amount:200,course_slug:'private-course'}]);
  assert.equal(rows.reduce((sum,x)=>sum+x.paid,0),2);
  assert.equal(rows.find(x=>x.channel==='Facebook Ads').paid,1);
  assert.equal(rows.find(x=>x.channel==='Chưa rõ nguồn').revenue,200);
  assert.ok(!rows.some(x=>x.channel==='private-course'));
  assert.equal(rows.reduce((sum,x)=>sum+x.revenue,0),700);
});
test('report pagination reads all rows, retains a real zero, rejects truncation/error/changing totals',async()=>{
  const {readReportPages}=load('lib/crm-v2/report-source.ts');
  const fixture=Array.from({length:1005},(_,i)=>({id:String(i)}));
  const all=await readReportPages(async(offset,limit)=>({data:fixture.slice(offset,offset+limit),error:null,count:fixture.length}));
  assert.equal(all.length,1005);
  assert.deepEqual(await readReportPages(async()=>({data:[],error:null,count:0})),[]);
  await assert.rejects(readReportPages(async()=>({data:[],error:{message:'denied'},count:0})),/đủ nguồn/);
  await assert.rejects(readReportPages(async()=>({data:[],error:null,count:4})),/cắt ngắn/);
  await assert.rejects(readReportPages(async()=>({data:fixture,error:null,count:1005}),100),/giới hạn/);
  await assert.rejects(readReportPages(async(offset,limit)=>({data:fixture.slice(offset,offset+limit),error:null,count:offset?1004:1005})),/thay đổi/);
});
test('granting another course to an existing account preserves password and returns its real Auth ID',async()=>{
  const writes=[];
  const account={id,email:'fixture@example.invalid',user_metadata:{must_change_password:false}};
  const client={auth:{admin:{listUsers:async()=>({data:{users:[account]},error:null}),updateUserById:async(...args)=>{writes.push(args)},createUser:async(...args)=>{writes.push(args)}}}};
  const before=process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY='local-test-sentinel';
  try {
    const accountService=load('services/studentAccountService.ts',{
      '@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},
      '@/services/activityLogService':{logStudentActivity:async()=>{}},
      '@/lib/auth/student-account':{buildAutoStudentAccountCredentials:()=>({email:account.email,password:'fixture-password-not-used'})},
    });
    const result=await accountService.ensureStudentAccountForAccessGrant({studentName:'Fixture',email:account.email,phone:'',courseSlug:'course',courseTitle:'Course'},{preserveExistingAuth:true});
    assert.equal(result.ok,true);assert.equal(result.userId,id);assert.equal(result.temporaryPassword,null);assert.deepEqual(writes,[]);
  } finally { if(before===undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=before; }
});
test('every CRM page checks owner/editor permissions before fetching protected data',async()=>{
  const pages=[];
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.name==='page.tsx')pages.push(p)}}
  walk('app/admin/crm-v2');
  for(const file of pages){
    let allowed;
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const mod={exports:{}};
    const deny=async(_path,roles)=>{allowed=roles;throw new Error('permission-denied')};
    const uncalled=new Proxy({}, {get:()=>()=>{throw new Error('data-read-before-auth')}});
    new Function('require','module','exports',code)((name)=>name==='@/lib/auth/session'?{requireAdminAuth:deny}:name==='react/jsx-runtime'?require(name):uncalled,mod,mod.exports);
    await assert.rejects(mod.exports.default({params:Promise.resolve({}),searchParams:Promise.resolve({})}),/permission-denied/,file);
    const shared=file.includes('/courses/')||['students','customers','leads','settings'].some(route=>file.endsWith(`/${route}/page.tsx`));
    assert.deepEqual(allowed,shared?['owner','editor']:['owner'],file);
  }
});
test('student compatibility URL preserves search and resumable operation without executing writes',async()=>{
  let location='';
  const page=load('app/admin/hoc-vien/page.tsx',{
    '@/lib/auth/session':{requireAdminAuth:async()=>({adminRole:'owner'})},
    'next/navigation':{redirect:(url)=>{location=url;throw new Error('redirect')}},
  });
  await assert.rejects(page.default({searchParams:Promise.resolve({q:'Fixture',add_student:'1',operation_id:id,unsafe:'drop'})}),/redirect/);
  const url=new URL(location,'https://example.invalid');
  assert.equal(url.pathname,'/admin/crm-v2/students');assert.equal(url.searchParams.get('operation_id'),id);assert.equal(url.searchParams.get('q'),'Fixture');assert.equal(url.searchParams.has('unsafe'),false);
});
test('shared shell uses unified profiles, stable settings navigation, and role-filtered tools',()=>{
  const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
  let pathname='/admin/crm-v2/settings';
  const link=({href,children,...props})=>React.createElement('a',{href,...props},children);
  const shell=load('components/crm-v2/crm-components.tsx',{
    'next/navigation':{usePathname:()=>pathname,useSearchParams:()=>new URLSearchParams(),useRouter:()=>({refresh(){}})},
    'next/link':link,
    '@/components/auth/sign-out-button':{SignOutButton:()=>React.createElement('button',null,'Đăng xuất')},
  });
  const settings=load('components/admin/admin-settings-workspace.tsx',{'next/link':link});
  const render=adminRole=>renderToStaticMarkup(React.createElement(shell.CrmShell,{adminRole},'Fixture'));
  const editor=render('editor'),owner=render('owner');
  for(const html of [editor,owner]) {
    assert.ok(html.includes('href="/admin/crm-v2/courses"'));assert.ok(html.includes('href="/admin/crm-v2/customers"'));
    assert.ok(!html.includes('href="/admin/crm-v2/leads"'));assert.ok(!html.includes('href="/admin/crm-v2/students"'));
    assert.ok(html.includes('href="/admin/crm-v2/settings" aria-current="page"'));
    assert.equal((html.match(/<aside/g)||[]).length,1);assert.ok(html.includes('Đăng xuất'));
    assert.ok(html.includes('action="/admin/crm-v2/customers"'));assert.ok(!html.includes('Nâng cao'));
  }
  assert.ok(!editor.includes('href="/admin/crm-v2/reports"'));assert.ok(owner.includes('href="/admin/crm-v2/reports"'));
  const settingsHtml=role=>renderToStaticMarkup(React.createElement(settings.AdminSettingsWorkspace,{role}));
  const ownerTools=settingsHtml('owner'),editorTools=settingsHtml('editor');
  for(const route of ['/admin/crm-v2/team','/admin/database','/admin/crm-v2/integrations']){assert.ok(ownerTools.includes(`href="${route}"`));assert.ok(!editorTools.includes(`href="${route}"`))}
  assert.ok(editorTools.includes('href="/admin/cms"'));assert.ok(!editorTools.includes('href="/admin/seo"'));
  pathname='/admin/crm-v2/team';assert.ok(render('owner').includes('href="/admin/crm-v2/settings" aria-current="page"'));
});

test('access panel recovers from network failure and distinguishes committed access from failed email', async () => {
  const runtime = process.env.SUPPORT_UI_TEST_MODULE;
  assert.ok(runtime, 'Run with the documented isolated React test runtime');
  const external = createRequire(runtime);
  const React = external('react');
  const { create, act } = external('react-test-renderer');
  let refreshed = 0;
  const { StudentAccessActions } = load('components/admin/student-access-actions.tsx', {
    react: React, 'react/jsx-runtime': external('react/jsx-runtime'),
    'next/navigation': { useRouter: () => ({ refresh: () => refreshed++ }) },
    '@/components/admin/student-activity-timeline': { StudentActivityTimeline: () => null },
  });
  const oldFetch = globalThis.fetch, oldWindow = globalThis.window, oldFormData = globalThis.FormData;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = { confirm: () => true };
  globalThis.FormData = class { get() { return 'grant'; } };
  const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  let view;
  try {
    await act(() => { view = create(React.createElement(StudentAccessActions, {
      courses: [{slug:'test-course',title:'Test'}],
      student: {email:'fixture@example.invalid',name:'Fixture',phone:'',courseSlugs:['test-course'],accessibleCourseSlugs:['test-course']},
    })); });
    const button = label => view.root.findAllByType('button').find(node => text(node).includes(label));
    globalThis.fetch = async () => { throw new Error('offline'); };
    await act(() => button('Cấp lại mật khẩu').props.onClick());
    assert.equal(button('Cấp lại mật khẩu').props.disabled,false);
    assert.match(JSON.stringify(view.toJSON()), /Mất kết nối/);
    assert.equal(refreshed,1);
    await act(() => button('Quản lý quyền').props.onClick());
    globalThis.fetch = async () => ({ok:false,json:async()=>({ok:false,accessUpdated:true,message:'Đã cập nhật quyền; email thất bại'})});
    await act(() => view.root.findByType('form').props.onSubmit({preventDefault(){},currentTarget:{},nativeEvent:{submitter:{value:'grant'}}}));
    assert.equal(refreshed,2);
    assert.equal(view.root.findAllByType('form').length,0);
    assert.match(JSON.stringify(view.toJSON()), /email thất bại/);
  } finally {
    if(view) await act(() => view.unmount());
    globalThis.fetch=oldFetch; globalThis.window=oldWindow; globalThis.FormData=oldFormData;
  }
});

test('production source failures cannot return demo segments, automation, integrations', async () => {
  const previous={NODE_ENV:process.env.NODE_ENV,CRM_V2_ENABLED:process.env.CRM_V2_ENABLED,NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL};
  Object.assign(process.env,{NODE_ENV:'production',CRM_V2_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid'});
  let chain;chain=new Proxy({}, {get:(_,name)=>name==='then'?(resolve,reject)=>Promise.resolve({data:null,error:{message:'fixture outage'},count:0}).then(resolve,reject):()=>chain});
  try {
    const data=load('lib/crm-v2/data.ts', {
      '../supabase/admin':{createSupabaseAdminClient:()=>({schema:()=>({from:()=>chain}),rpc:()=>chain})},
      '../admin/admin-members':{listAdminMembers:async()=>[]},
      './workflow-runner':{},'./email-provider':{},'./suppression':{},
    });
    for(const method of ['listCrmV2SegmentsRows','listCrmV2AutomationWorkflows','listCrmV2Integrations']) {
      assert.equal(typeof data[method],'function',method);
      await assert.rejects(data[method](data.normalizeCrmListQuery()),/dữ liệu thật/,method);
    }
  } finally {for(const [key,value] of Object.entries(previous)) if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

test('expired admin session preserves the exact route and recovery query through login',async()=>{
  const previous=process.env.AUTH_GUARD_ENABLED;process.env.AUTH_GUARD_ENABLED='true';
  const desired='/admin/hoc-vien?add_student=1&operation_id='+id;
  let redirected='';
  try {
    const auth=load('lib/auth/session.ts',{
      'next/headers':{headers:async()=>new Headers({'x-admin-return-to':desired})},
      'next/navigation':{redirect:url=>{redirected=url;throw new Error('redirect')}},
      '@/lib/supabase/client':{hasSupabaseEnv:()=>false},
    });
    await assert.rejects(auth.requireAdminAuth('/admin/hoc-vien',['owner','editor']),/redirect/);
    assert.equal(new URL(redirected,'https://example.invalid').searchParams.get('next'),desired);
  } finally {if(previous===undefined)delete process.env.AUTH_GUARD_ENABLED;else process.env.AUTH_GUARD_ENABLED=previous;}
});
