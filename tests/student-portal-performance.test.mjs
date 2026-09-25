import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
function load(file,mocks={}) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const m={exports:{}}; new Function('exports','module','require',code)(m.exports,m,(name)=>{
  if(name in mocks)return mocks[name];
  if(name.startsWith('@/'))return load(`${name.slice(2)}.ts`,mocks);
  throw new Error(`Unexpected import ${name}`);
 });return m.exports;
}
function clientFixture(rows) {
 const calls=[];
 return {calls,client:{from(table){const ops=[];calls.push({table,ops});const q={};for(const method of ['select','ilike','eq','is','like','order'])q[method]=(...args)=>{ops.push([method,...args]);return q;};q.range=async(from,to)=>{ops.push(['range',from,to]);return {data:(rows[table]||[]).slice(from,to+1),count:(rows[table]||[]).length,error:null};};return q;}}};
}
function access(client) { return load('services/studentPortalAccessService.ts',{'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/auth/session':{createSupabaseAuthServerClient:async()=>null}}); }
test('student access queries are literal, scoped, minimal and paginated',async()=>{
 const fixture=clientFixture({orders:Array.from({length:501},(_,i)=>({id:String(i),email:'a_b%@example.invalid',status:'paid',course_slug:'course',payment_plan:'full',order_items:[]})),leads:[{id:'l',email:'a_b%@example.invalid',source:'admin-access-revoke:course',created_at:'2026-01-01'}]});
 const records=await access(fixture.client).getStudentPortalAccessRecords(' A_B%@example.invalid ');
 assert.equal(records.orders.length,501);assert.equal(records.leads[0].source,'admin-access-revoke:course');
 assert.equal(fixture.calls.length,3);
 for(const call of fixture.calls){assert.ok(call.ops.some(x=>x[0]==='ilike'&&x[1]==='email'&&x[2]==='a\\_b\\%@example.invalid'));assert.ok(!call.ops.find(x=>x[0]==='select')[1].includes('*'));}
 assert.ok(fixture.calls.filter(x=>x.table==='orders').every(x=>x.ops.some(y=>y[0]==='eq'&&y[1]==='status'&&y[2]==='paid')));
 assert.ok(fixture.calls.find(x=>x.table==='leads').ops.some(x=>x[0]==='is'&&x[1]==='deleted_at'));
});
test('missing identity never starts a global query',async()=>{const f=clientFixture({});assert.deepEqual(await access(f.client).getStudentPortalAccessRecords(' '),{orders:[],leads:[]});assert.equal(f.calls.length,0);});
test('access read failure is surfaced instead of rendering an empty ownership list',async()=>{const q=new Proxy({},{get:(_,k)=>k==='range'?async()=>({data:null,error:{message:'offline'}}):()=>q});await assert.rejects(access({from:()=>q}).getStudentPortalAccessRecords('a@example.invalid'),/offline/);});
test('dashboard response does not wait for activity writes',async()=>{
 const scheduled=[];let logged=0;const page=load('app/dashboard/page.tsx',{'next/server':{after:(fn)=>scheduled.push(fn)},'react/jsx-runtime':{jsx,jsxs:jsx},'@/components/app/student-dashboard':{StudentDashboard:'dashboard'},'@/services/studentPortalService':{getStudentPortalSnapshot:async()=>({user:{id:'fixture',email:'fixture@example.invalid'},courses:[],resources:[],ownedSlugs:[],progressBySlug:{},email:'fixture@example.invalid',displayName:'Fixture'})},'@/services/activityLogService':{logStudentActivity:async()=>{logged++;}}});
 assert.equal((await page.default()).type,'dashboard');assert.equal(logged,0);assert.equal(scheduled.length,1);await scheduled[0]();assert.equal(logged,1);
});

test('LMS summary preserves active identity, expiry and progress without reading lesson content/resources', async()=>{
 const calls=[];
 const rows=[{id:'c1',slug:'course',title:'Course',status:'open',lms_status:'published',course_modules:[{id:'m1',status:'published',lessons:[{id:'l1',status:'published'},{id:'l2',status:'published'}]}]},{id:'c2',slug:'draft',lms_status:'draft',course_modules:[]}];
 const enrollments=[{id:'e1',course_id:'c1',user_id:'u1',status:'active',contacts:{email:'A@example.invalid'}},{id:'e2',course_id:'c1',user_id:'u2',status:'active',contacts:{email:'other@example.invalid'}},{id:'e3',course_id:'c1',user_id:'expired',status:'active',expires_at:'2020-01-01',contacts:{email:'expired@example.invalid'}}];
 const client={from(table){calls.push(table);assert.equal(table,'courses');const q={select(s){assert.ok(!s.includes('*'));assert.ok(!s.includes('lesson_resources'));return q;},order(){return q;},then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve);}};return q;},rpc:async(name)=>{assert.equal(name,'student_lms_enrollments_scoped');return {data:{enrollments,progress:[{enrollment_id:'e1',lesson_id:'l1',status:'completed'}]},error:null};}};
 const service=load('services/lmsService.ts',{'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/security/validation':{},'@/services/activityLogService':{},'@/services/studentProvisioningOperationService':{},'@/lib/admin/command-center-source':{}});
 const access=await service.getStudentLmsAccess({email:'a@example.invalid',userId:'u1'});
 assert.deepEqual(access.ownedSlugs,['course']);assert.equal(access.progressBySlug.course,50);assert.deepEqual(access.completedLessonIds,['l1']);
 assert.deepEqual((await service.getStudentLmsAccess({userId:'expired'})).ownedSlugs,[]);
 assert.deepEqual((await service.getStudentLmsAccess({isAdmin:true})).ownedSlugs,['course']);
 assert.ok(calls.every(x=>x==='courses'));
});

test('catalog summary keeps card data and lesson counts while skipping resource queries',async()=>{
 const calls=[];
 const client={from(table){calls.push(table);const q={select(s){assert.ok(!s.includes('lessons(*)'));return q;},order:async()=>({data:[{id:'c1',slug:'facebook-ads-2026',title:'Facebook Ads',status:'open',course_modules:[{id:'m1',title:'Module',lessons:[{id:'l1',title:'Lesson',status:'published',duration:'10 phút'}]}]}],error:null})};return q;}};
 const service=load('services/courseService.ts',{'@/lib/supabase/server':{createSupabaseServerClient:()=>client},'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/admin/command-center-source':{}});
 const courses=await service.getCourses({summaryOnly:true});
 const course=courses.find(c=>c.slug==='facebook-ads-2026');assert.equal(course.modules[0].lessons.length,1);assert.ok(course.landingPageUrl);assert.deepEqual(calls,['courses']);
});

test('single-course lookup filters before downloading lessons and only fetches that course resources',async()=>{
 const calls=[];
 const client={from(table){const ops=[];calls.push({table,ops});const q={select(s){ops.push(['select',s]);return q},eq(k,v){ops.push(['eq',k,v]);return q},order:async()=>({data:[{id:'c1',slug:'facebook-ads-2026',title:'Facebook Ads',status:'open',course_modules:[{id:'m1',title:'Module',lessons:[{id:'l1',title:'Lesson',status:'published',youtube_url:'https://www.youtube.com/watch?v=video'}]}]}],error:null}),in:async(k,v)=>{ops.push(['in',k,v]);return {data:[],error:null}}};return q;}};
 const service=load('services/courseService.ts',{'@/lib/supabase/server':{createSupabaseServerClient:()=>client},'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/admin/command-center-source':{}});
 const course=await service.getPublishedCourseForStudent('facebook-ads-2026');assert.equal(course.slug,'facebook-ads-2026');
 assert.ok(calls[0].ops.some(x=>x[0]==='eq'&&x[1]==='slug'&&x[2]==='facebook-ads-2026'));
 for(const call of calls.slice(1))assert.deepEqual(call.ops.find(x=>x[0]==='in'),['in','lesson_id',['l1']]);
});

test('anonymous preview does not read LMS data at all',async()=>{
 const service=load('services/lmsService.ts',{'@/lib/supabase/admin':{createSupabaseAdminClient:()=>{throw new Error('should not query')}},'@/lib/security/validation':{},'@/services/activityLogService':{},'@/services/studentProvisioningOperationService':{},'@/lib/admin/command-center-source':{}});
 assert.deepEqual(await service.getStudentLmsAccess({}),{ownedSlugs:[],progressBySlug:{},completedLessonIds:[],enrollmentIdsBySlug:{}});
});
