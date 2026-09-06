import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',source)((name)=>{
    if(Object.hasOwn(mocks,name)) return mocks[name];
    if(name.startsWith('@/')) { const p=name.slice(2);return load(fs.existsSync(p+'.ts')?p+'.ts':p+'.tsx',mocks); }
    return require(name);
  },mod,mod.exports);return mod.exports;
}
const seed=(patch={})=>({id:'email:fixture@example.invalid',name:'Fixture',email:'fixture@example.invalid',phone:'0900000001',role:'Lead',accessStatus:'Chưa cấp quyền',paymentStatus:'Không có đơn thanh toán',accessibleCourseSlugs:[],courseTitles:[],courseSlugs:[],paidOrderCodes:[],pendingOrderCodes:[],source:'Website',note:'',registeredAt:'2026-09-06',progressPercent:0,progressNote:'',updatedAt:'2026-09-06',...patch});
function service(client,extra={}) {return load('services/adminCustomerService.ts',{'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/admin/admin-emails':{getConfiguredOwnerEmails:()=>['owner@example.invalid']},'@/services/studentAccessService':{getStudentAccessRecords:async()=>[]},'@/services/adminDeletionService':{getActiveDeletedStudentKeys:async()=>new Set()},'@/services/activityLogService':{logStudentActivity:async()=>({ok:true})},...extra});}
test('counted pagination reads beyond a capped page and rejects changing/incomplete sources',async()=>{
 const {readAllAdminRows}=load('lib/admin/read-all-rows.ts');const all=Array.from({length:1201},(_,id)=>({id}));
 const rows=await readAllAdminRows(async(from,to)=>({data:all.slice(from,Math.min(to+1,from+200)),error:null,count:all.length}),'fixture');assert.equal(rows.length,1201);
 await assert.rejects(readAllAdminRows(async()=>({data:[],error:null,count:4}),'fixture'),/không đầy đủ/);
 let calls=0;await assert.rejects(readAllAdminRows(async()=>({data:[{id:1}],error:null,count:++calls===1?3:4}),'fixture'),/vừa thay đổi/);
 await assert.rejects(readAllAdminRows(async()=>({data:[],error:{message:'denied'},count:0}),'fixture'),/denied/);
});
test('directory merges exact email identities and never merges different emails sharing phone',async()=>{
 const contacts=[{id:'a',email:'FIXTURE@example.invalid',phone:'0900000001'},{id:'b',email:'other@example.invalid',phone:'0900000001'},{id:'c',email:'deleted@example.invalid',phone:''}];
 let q; q={select(){return q},order(){return q},range:async()=>({data:contacts,count:3,error:null})};
 const s=service({schema:()=>({from:()=>q})},{'@/services/studentAccessService':{getStudentAccessRecords:async(options)=>{assert.equal(options.includeAllLeads,true);assert.equal(options.strict,true);return [seed()];}},'@/services/adminDeletionService':{getActiveDeletedStudentKeys:async()=>new Set(['email:deleted@example.invalid'])}});
 const rows=await s.listAdminCustomerProfiles();assert.equal(rows.length,2);assert.ok(rows.some(r=>r.email==='other@example.invalid'));assert.equal(rows.filter(r=>r.id==='email:fixture@example.invalid').length,1);
});
test('account block changes only ban duration and verifies actual resulting state',async()=>{
 const calls=[];let blocked=false;const user={id:'customer',email:'fixture@example.invalid',app_metadata:{}};
 const db={auth:{admin:{listUsers:async()=>({data:{users:[user]},error:null}),updateUserById:async(id,payload)=>{calls.push({id,payload});blocked=payload.ban_duration!=='none';return {error:null};},getUserById:async()=>({data:{user:{...user,banned_until:blocked?'2099-01-01':null}},error:null})}}};
 const s=service(db);assert.equal((await s.setCustomerAccountBlocked(user.email,true,{id:'owner'})).blocked,true);assert.equal((await s.setCustomerAccountBlocked(user.email,false,{id:'owner'})).blocked,false);
 assert.deepEqual(calls,[{id:'customer',payload:{ban_duration:'876000h'}},{id:'customer',payload:{ban_duration:'none'}}]);
});
test('owner, editor, self, and failed account read cannot be blocked',async()=>{
 for(const user of [{id:'x',email:'owner@example.invalid',app_metadata:{}},{id:'x',email:'editor@example.invalid',app_metadata:{admin_role:'editor'}},{id:'actor',email:'self@example.invalid',app_metadata:{}}]) {
  let writes=0;const s=service({auth:{admin:{listUsers:async()=>({data:{users:[user]},error:null}),updateUserById:async()=>{writes++;return {error:null};}}}});
  await assert.rejects(s.setCustomerAccountBlocked(user.email,true,{id:'actor'}),/quản trị/);assert.equal(writes,0);
 }
 const s=service({auth:{admin:{listUsers:async()=>({data:null,error:{message:'offline'}})}}});await assert.rejects(s.findCustomerAccount('fixture@example.invalid'),/Không đọc/);
});
test('unverified ban readback is never reported successful',async()=>{
 const user={id:'c',email:'fixture@example.invalid',app_metadata:{}};
 const s=service({auth:{admin:{listUsers:async()=>({data:{users:[user]},error:null}),updateUserById:async()=>({error:null}),getUserById:async()=>({data:{user},error:null})}}});
 await assert.rejects(s.setCustomerAccountBlocked(user.email,true,{id:'owner'}),/chưa xác nhận/);
});
test('account endpoints deny visitors and editor writes before reading the body or touching accounts',async()=>{
 for(const auth of [{user:null,adminRole:null},{user:{id:'e'},adminRole:'editor'}]) {
  let calls=0;const api=load('app/api/admin/customers/account/route.ts',{'@/lib/auth/session':{getCurrentAuth:async()=>auth},'@/services/adminCustomerService':{setCustomerAccountBlocked:async()=>{calls++;}},'@/lib/security/rate-limit':{checkRateLimit:()=>({ok:true}),rateLimitKey:()=>''}});
  const result=await api.POST({json:()=>{throw Error('must not read');}});assert.equal(result.status,403);assert.equal(calls,0);
 }
});
test('legacy customer/student links preserve operation_id and return to unified directory',async()=>{
 for(const route of ['leads','students']) {
  let target='';const page=load(`app/admin/crm-v2/${route}/page.tsx`,{'@/lib/auth/session':{requireAdminAuth:async()=>({adminRole:'owner'})},'next/navigation':{redirect:url=>{target=url;throw Error('redirect');}}});
  await assert.rejects(page.default({searchParams:Promise.resolve({q:'fixture',operation_id:'op',view:'progress'})}),/redirect/);
  const url=new URL(target,'https://example.invalid');assert.equal(url.pathname,'/admin/crm-v2/customers');assert.equal(url.searchParams.get('operation_id'),'op');assert.equal(url.searchParams.get('q'),'fixture');
 }
});
test('directory opens no arbitrary profile, filters by course, and isolates mutations behind explicit confirmation',async()=>{
 const runtime=process.env.SUPPORT_UI_TEST_MODULE;assert.ok(runtime,'isolated React runtime required');const ext=createRequire(runtime.endsWith('.json')?runtime:path.join(runtime,'package.json'));
 const React=ext('react'),{create,act}=ext('react-test-renderer');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const oldFetch=globalThis.fetch;const calls=[];let refreshes=0;
 globalThis.fetch=async(url,options={})=>{calls.push({url,...options});return {ok:true,json:async()=>url.startsWith('/api/admin/customers/account?')?{ok:true,exists:true,blocked:false,protected:false}:{ok:true,message:'Done'}};};
 const {CustomerDirectory}=load('components/admin/customer-directory.tsx',{react:React,'react/jsx-runtime':ext('react/jsx-runtime'),'lucide-react':new Proxy({},{get:()=>()=>null}),'next/navigation':{useRouter:()=>({refresh:()=>refreshes++})},'@/components/admin/admin-dialog':{AdminDialog:({open,children})=>open?React.createElement('section',{'data-profile':true},children):null},'@/components/admin/student-activity-timeline':{StudentActivityTimeline:()=>null}});
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
 let view;try {
  await act(()=>{view=create(React.createElement(CustomerDirectory,{records:[seed(),seed({id:'second',name:'Second',email:'second@example.invalid',courseSlugs:['course'],courseTitles:['Long course title'],accessibleCourseSlugs:['course']})],courses:[{slug:'course',title:'Long course title'}],canManageAccount:true,createAction:null}));});
  assert.equal(view.root.findAllByProps({'data-profile':true}).length,0);assert.equal(calls.length,0);
  await act(()=>view.root.findByProps({'aria-label':'Lọc khóa học'}).props.onChange({target:{value:'course'}}));assert.equal(view.root.findAllByProps({'aria-label':'Mở hồ sơ Fixture'}).length,0);
  await act(()=>view.root.findByProps({'aria-label':'Mở hồ sơ Second'}).props.onClick());
  const button=label=>view.root.findAllByType('button').find(n=>text(n)===label);
  await act(()=>button('Quyền học').props.onClick());await act(()=>button('Thu quyền').props.onClick());assert.equal(calls.filter(x=>x.method==='POST').length,0);
  globalThis.fetch=async(url,options)=>{calls.push({url,...options});return {ok:false,json:async()=>({ok:false,accessUpdated:true,message:'Quyền đã cập nhật; email lỗi'})};};
  await act(()=>button('Xác nhận').props.onClick());assert.equal(calls.filter(x=>x.method==='POST').length,1);assert.equal(refreshes,1);assert.match(JSON.stringify(view.toJSON()),/email lỗi/);assert.equal(button('Xác nhận'),undefined);
 }finally {if(view)await act(()=>view.unmount());globalThis.fetch=oldFetch;}
});
test('editor cannot reset owner credentials through direct password endpoint',async()=>{
 let reads=0,writes=0;
 const api=load('app/api/admin/students/password-reset/route.ts',{
  '@/lib/auth/session':{isAuthGuardEnabled:()=>true,getCurrentAuth:async()=>({adminRole:'editor',user:{id:'editor'}}),canAccessAdminRole:()=>true},
  '@/services/adminCustomerService':{findCustomerAccount:async()=>({id:'owner'}),isProtectedCustomerAccount:()=>true},
  '@/lib/notifications/student-access-email':{sendStudentAccessEmail:async()=>{writes++;}},
  '@/lib/supabase/admin':{createSupabaseAdminClient:()=>{reads++;return null;}},
  '@/services/adminDataService':{invalidateAdminModules:()=>{}},
  '@/services/activityLogService':{},'@/services/courseService':{getCourses:async()=>[]},
  '@/services/studentAccountService':{ensureStudentAccountForAccessGrant:async()=>{writes++;}},
  '@/lib/security/rate-limit':{checkRateLimit:()=>({ok:true}),rateLimitKey:()=>''},
 });
 const result=await api.POST(new Request('https://example.invalid/api/admin/students/password-reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'owner@example.invalid'})}));
 assert.equal(result.status,403);assert.equal(reads,0);assert.equal(writes,0);
});
test('password reset accepts existing email identity without phone and separates changed password from failed email',async()=>{
 let changed=false;let query;query={select(){return query},eq(){return query},ilike(){return query},order(){return query},limit(){return query},maybeSingle:async()=>({data:{order_code:'fixture-order',student_name:'Fixture',email:'fixture@example.invalid',phone:'',course_slug:'course-one,course-two',course_title:'One | Two'},error:null})};
 const api=load('app/api/admin/students/password-reset/route.ts',{
  '@/lib/auth/session':{isAuthGuardEnabled:()=>true,getCurrentAuth:async()=>({adminRole:'owner',user:{id:'owner'}}),canAccessAdminRole:()=>true},
  '@/services/adminCustomerService':{findCustomerAccount:async()=>({id:'customer'}),isProtectedCustomerAccount:()=>false},
  '@/lib/notifications/student-access-email':{sendStudentAccessEmail:async(payload)=>{assert.deepEqual(payload.courseTitles,['One','Two']);return {ok:false,reason:'fixture-mail-outage'};}},
  '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>query})},
  '@/services/adminDataService':{invalidateAdminModules:()=>{}},
  '@/services/activityLogService':{logStudentActivity:async()=>({ok:true})},'@/services/courseService':{getCourses:async()=>[{slug:'course-one',title:'One'},{slug:'course-two',title:'Two'}]},
  '@/services/studentAccountService':{ensureStudentAccountForAccessGrant:async(input,options)=>{assert.ok(options.temporaryPassword.length>=20);assert.equal(options.forcePasswordUpdate,true);changed=true;return {ok:true,userId:'customer',email:input.email,temporaryPassword:options.temporaryPassword};}},
  '@/lib/security/rate-limit':{checkRateLimit:()=>({ok:true}),rateLimitKey:()=>''},
 });
 const response=await api.POST(new Request('https://example.invalid/api/admin/students/password-reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'fixture@example.invalid'})}));
 assert.equal(response.status,500);const result=await response.json();assert.equal(result.accountUpdated,true);assert.equal(changed,true);assert.match(result.message,/chưa gửi/);assert.equal(result.temporaryPassword,undefined);
});
