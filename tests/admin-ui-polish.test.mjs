import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const ext = createRequire(process.env.SUPPORT_UI_TEST_MODULE || '/private/tmp/theanh-admin-db-tests/package.json');
const React = ext('react');
const { act, create } = ext('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function load(file, mocks = {}, source) {
 const code=ts.transpileModule(source ?? fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',code)((name)=>Object.hasOwn(mocks,name)?mocks[name]:name.startsWith('@/')?load(`${name.slice(2)}.ts`,mocks):require(name),mod,mod.exports);return mod.exports;
}
const baseMocks={react:React,'react/jsx-runtime':ext('react/jsx-runtime'),'lucide-react':new Proxy({},{get:()=>()=>null})};
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):n?.props?text(n.props.children):'';

test('legacy conversion reproduces reported dark text and no longer overrides modern button, alert or selection color pairs',()=>{
 const {parseDocument}=ext('htmlparser2');const css=ext('postcss');const select=ext('css-select');
 const doc=parseDocument('<div data-admin-theme="light"><section data-admin-ui="modern"><button id="primary" class="bg-blue-600 text-white">Create</button><button id="danger" class="bg-red-600 text-white">Discard</button><div id="alert" class="bg-red-50 text-red-800">Failure</div><span id="active" class="bg-blue-50 text-blue-700">Step</span></section><button id="legacy" class="bg-slate-950 text-white">Legacy</button></div><button id="public" class="bg-slate-950 text-white">Public</button>');
 function styles(source,id,base){const el=select.selectOne('#'+id,doc.children);const result={...base};css.parse(source).walkRules(rule=>{if(!rule.selector.startsWith('[data-admin-theme="light"]'))return;if(select.is(el,rule.selector))rule.walkDecls(d=>{if(d.important)result[d.prop]=d.value;});});return result;}
 const old=execFileSync('git',['show','d83597f:app/globals.css'],{encoding:'utf8'});const current=fs.readFileSync('app/globals.css','utf8');
 assert.equal(styles(old,'primary',{color:'#ffffff'}).color,'#ffffff');
 assert.equal(styles(old,'legacy',{color:'#ffffff'}).color,'#0f172a','reported white text was forced dark');
 assert.deepEqual(styles(current,'primary',{color:'#ffffff',background:'#2563eb'}),{color:'#ffffff',background:'#2563eb'});
 assert.deepEqual(styles(current,'danger',{color:'#ffffff',background:'#dc2626'}),{color:'#ffffff',background:'#dc2626'});
 assert.equal(styles(current,'alert',{background:'#fef2f2'}).background,'#fef2f2');
 assert.equal(styles(current,'active',{color:'#1d4ed8'}).color,'#1d4ed8');
 assert.equal(styles(current,'legacy',{color:'#ffffff'}).color,'#0f172a','legacy panels keep their old conversion');
 assert.equal(styles(current,'public',{color:'#ffffff'}).color,'#ffffff','public site remains outside the admin scope');
});

test('primary, danger and active step palette has readable text contrast',()=>{
 const palette={};ext('postcss').parse(fs.readFileSync('app/globals.css','utf8')).walkRules(rule=>{if(rule.selector==='[data-admin-ui="modern"]')rule.walkDecls(d=>{palette[d.prop]=d.value;});});
 const lum=hex=>hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
 for(const [fg,bg] of [['#ffffff',palette['--color-blue-600']],['#ffffff',palette['--color-red-600']],[palette['--color-blue-700'],palette['--color-blue-50']]]){const a=lum(fg),b=lum(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);}
});

test('create window keeps draft across modes and refuses close or tab changes while an operation is busy',async()=>{
 let busy;let studentMounts=0;
 function Wizard({onBusyChange}){busy=onBusyChange;const [value,setValue]=React.useState('');React.useEffect(()=>{studentMounts++;},[]);return React.createElement('input',{'data-draft':true,value,onChange:e=>setValue(e.target.value)});}
 const {StudentCreateDialog}=load('components/admin/student-create-dialog.tsx',{...baseMocks,'next/dynamic':loader=>String(loader).includes('student-provisioning-wizard')?Wizard:()=>React.createElement('div',{'data-payment':true}), '@/components/admin/admin-dialog':{AdminDialog:({open,children,...props})=>open?React.createElement('section',{'data-window':true,...props},children):null}});
 let view;try{await act(()=>{view=create(React.createElement(StudentCreateDialog,{courses:[]}));});assert.equal(studentMounts,0);
 const button=label=>view.root.findAllByType('button').find(n=>text(n)===label);
 await act(()=>button('Tạo học viên').props.onClick());await act(()=>view.root.findByProps({'data-draft':true}).props.onChange({target:{value:'Fixture draft'}}));
 await act(()=>button('Gửi form thanh toán').props.onClick());await act(()=>button('Tạo tài khoản & quyền học').props.onClick());assert.equal(studentMounts,1);assert.equal(view.root.findByProps({'data-draft':true}).props.value,'Fixture draft');
 await act(()=>busy(true));assert.equal(button('Gửi form thanh toán').props.disabled,true);await act(()=>view.root.findByProps({'data-window':true}).props.onClose());assert.equal(view.root.findAllByProps({'data-window':true}).length,1);
 await act(()=>busy(false));await act(()=>view.root.findByProps({'data-window':true}).props.onClose());assert.equal(view.root.findAllByProps({'data-window':true}).length,0);
 }finally{if(view)await act(()=>view.unmount());}
});

test('payment form network failure releases busy state, retains input and prevents duplicate in-flight submit',async()=>{
 const originalFetch=globalThis.fetch,originalFormData=globalThis.FormData;let rejectFetch,calls=0,resets=0;const busy=[];
 globalThis.FormData=class{get(){return 'fixture';}};globalThis.fetch=()=>{calls++;return new Promise((_,reject)=>{rejectFetch=reject;});};
 const {PaymentLinkForm}=load('components/admin/payment-link-form.tsx',{...baseMocks,'next/navigation':{useRouter:()=>({refresh:()=>{}})},'@/components/ui/button':{Button:({isLoading,loadingLabel,children,...props})=>React.createElement('button',{...props,disabled:isLoading},isLoading?loadingLabel:children)}});
 let view;try{await act(()=>{view=create(React.createElement(PaymentLinkForm,{courses:[],onBusyChange:v=>busy.push(v)}));});const event={preventDefault(){},currentTarget:{reset(){resets++;}}};let pending;
 await act(()=>{pending=view.root.findByType('form').props.onSubmit(event);});assert.equal(view.root.findByType('fieldset').props.disabled,true);
 await act(()=>view.root.findByType('form').props.onSubmit(event));assert.equal(calls,1);
 await act(async()=>{rejectFetch(new Error('offline'));await pending;});assert.equal(view.root.findByType('fieldset').props.disabled,false);assert.equal(resets,0);assert.deepEqual(busy,[true,false]);assert.match(JSON.stringify(view.toJSON()),/Thông tin đã nhập vẫn được giữ/);
 }finally{if(view)await act(()=>view.unmount());globalThis.fetch=originalFetch;globalThis.FormData=originalFormData;}
});

test('profile LMS summaries preserve enrollment and progress while skipping resource and lesson body reads',async()=>{
 const course={id:'course-id',slug:'fixture',title:'Fixture',course_modules:[{status:'published',lessons:[{status:'published'},{status:'draft'}]}]};
 const queries=[];const client={from(table){let fields='';const q={select(value){fields=value;queries.push({table,fields});return q;},order(){return q;},range(){return q;},then(resolve){return Promise.resolve({data:table==='courses'?[course]:[],error:null,count:table==='courses'?1:0}).then(resolve);}};return q;},rpc:async name=>{assert.equal(name,'crm_v2_lms_enrollments_raw');return {data:{enrollments:[{id:'enrollment',course_id:'course-id',course_slug:'fixture',status:'active',expires_at:'2027-01-01',contacts:{email:'fixture@example.invalid',full_name:'Fixture'}}],progress:[{enrollment_id:'enrollment',status:'completed'}]},error:null};}};
 const service=load('services/lmsService.ts',{'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/services/activityLogService':{},'@/services/studentProvisioningOperationService':{}});
 const full=await service.listAdminLmsCourses();queries.length=0;const light=await service.listAdminLmsStudentSummaries();
 assert.deepEqual(light,full.map(({slug,title,enrollments})=>({slug,title,enrollments})));
 assert.equal(light[0].enrollments[0].progressPercent,100);assert.equal(queries.length,1);assert.equal(queries[0].fields,'id,slug,title,course_modules(status,lessons(status))');
});

test('indexed profile access preserves legacy results and bounds scanned records to each email group',async()=>{
 const orders=Array.from({length:250},(_,i)=>({id:`order-${i}`,email:`person-${i}@example.invalid`,phone:'',studentName:`Fixture ${i}`,status:'paid',orderCode:`ORDER${i}`,orderItems:[],courseSlug:'fixture',courseTitle:'Fixture',createdAt:'2026-09-06T00:00:00Z',paidAt:'2026-09-06T00:00:00Z'}));
 const leads=orders.map((o,i)=>({id:`lead-${i}`,name:o.studentName,email:o.email,phone:'',source:'admin-access-revoke:fixture',need:'',createdAt:'2026-09-06T01:00:00Z'}));
 const originalAccess=load('lib/course-access.ts',{'@/lib/admin/admin-emails':{getConfiguredOwnerEmails:()=>[]}});let visits=0;
 const mocks={'@/services/lmsService':{listAdminLmsCourses:async()=>[],listAdminLmsStudentSummaries:async()=>[],isEnrollmentCurrentlyActive:()=>true},'@/services/adminDeletionService':{getActiveDeletedStudentKeys:async()=>new Set()},'@/services/leadService':{getLeads:async()=>leads},'@/services/orderService':{getPaymentOrders:async()=>orders},'@/lib/course-access':{...originalAccess,getCourseAccessSlugs:input=>{visits+=input.orders.length+input.leads.length;return originalAccess.getCourseAccessSlugs(input);}}};
 const beforeSource=execFileSync('git',['show','d83597f:services/studentAccessService.ts'],{encoding:'utf8'});
 const before=await load('services/studentAccessService.ts',mocks,beforeSource).getStudentAccessRecords({strict:true,includeAllLeads:true});const beforeVisits=visits;visits=0;
 const after=await load('services/studentAccessService.ts',mocks).getStudentAccessRecords({strict:true,includeAllLeads:true});assert.deepEqual(after,before);assert.equal(visits,500);assert.equal(beforeVisits,250000);assert.ok(after.every(row=>row.accessibleCourseSlugs.length===0));
});

test('payment form uses its captured form after an asynchronous response and reports server failure without clearing input',async()=>{
 const originalFetch=globalThis.fetch,originalFormData=globalThis.FormData;let resolveFetch,resets=0,refreshes=0;
 globalThis.FormData=class{get(){return 'fixture';}};globalThis.fetch=()=>new Promise(resolve=>{resolveFetch=resolve;});
 const {PaymentLinkForm}=load('components/admin/payment-link-form.tsx',{...baseMocks,'next/navigation':{useRouter:()=>({refresh:()=>refreshes++})},'@/components/ui/button':{Button:({isLoading,loadingLabel,children,...props})=>React.createElement('button',{...props,disabled:isLoading},isLoading?loadingLabel:children)}});
 let view;try{await act(()=>{view=create(React.createElement(PaymentLinkForm,{courses:[]}));});
 const form={reset(){resets++;}};let pending;const event={preventDefault(){},currentTarget:form};await act(()=>{pending=view.root.findByType('form').props.onSubmit(event);});event.currentTarget=null;
 await act(async()=>{resolveFetch({ok:true,json:async()=>({ok:true,paymentUrl:'https://example.invalid/payment'})});await pending;});assert.equal(resets,1);assert.equal(refreshes,1);assert.equal(view.root.findAllByType('a').length,1);
 await act(()=>{pending=view.root.findByType('form').props.onSubmit({preventDefault(){},currentTarget:form});});await act(async()=>{resolveFetch({ok:false,json:async()=>({ok:false,message:'Fixture denied'})});await pending;});assert.equal(resets,1);assert.equal(refreshes,1);assert.match(JSON.stringify(view.toJSON()),/Fixture denied/);
 }finally{if(view)await act(()=>view.unmount());globalThis.fetch=originalFetch;globalThis.FormData=originalFormData;}
});
