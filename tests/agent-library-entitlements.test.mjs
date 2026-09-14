import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const slug='bo-agent-kit-x10-hieu-suat-cong-viec';
const email='student@example.invalid',userId='00000000-0000-4000-8000-000000000001';
const catalog=JSON.parse(fs.readFileSync('data/agent-library-packages.json'));
const resources={resources:[{slug:'full-kit',version:'2.2.1',filename:'ai-growth-agent-kit-2.2.1.zip'},{slug:'setup-prompt',version:'2.2.1',filename:'Prompt-thiet-lap-Codex-cho-nguoi-moi-1.2.txt'}]};
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},Response,URL,Date,Set,Map});return exports;}
const lifecycle=load('lib/agent-kit-preorder.ts');
const legacy=load('lib/course-access.ts',{'@/lib/admin/admin-emails':{getConfiguredOwnerEmails:()=>[]},'@/lib/agent-kit-preorder':lifecycle});
const enrollment=(status='active',expires_at=null,extra={})=>({id:'e',course_slug:slug,status,expires_at,user_id:userId,metadata:{student_email:email},...extra});
const order=(status='paid',paymentPlan='agent-kit-standard-999',extra={})=>({email,status,courseSlug:slug,paymentPlan,courseTitle:'Đội ngũ nhân sự AI',orderItems:[],...extra});
const override=(action)=>({email,source:`admin-access-${action}:${slug}`,createdAt:'2026-09-11T00:00:00Z'});
const cases=[
 ['guest', {user:null},401],['no access',{},403],
 ['spoofed admin',{user:{id:userId,email,user_metadata:{role:'owner',isAdmin:true}}},403],
 ['owner',{adminRole:'owner'},200],['LMS active',{enrollments:[enrollment()]},200],
 ['LMS completed',{enrollments:[enrollment('completed')]},200],
 ['LMS future trial',{enrollments:[enrollment('active','2099-01-01T00:00:00Z')]},200],
 ['LMS expired trial',{enrollments:[enrollment('active','2000-01-01T00:00:00Z')]},403],
 ['LMS paused',{enrollments:[enrollment('paused')]},403],['LMS revoked',{enrollments:[enrollment('revoked')]},403],
 ['LMS other course',{enrollments:[enrollment('active',null,{course_slug:'ai-agent-master-2026'})]},403],
 ['LMS other identity',{enrollments:[enrollment('active',null,{user_id:'other',metadata:{student_email:'other@example.invalid'}})]},403],
 ['paid full',{orders:[order()]},200],['paid remaining',{orders:[order('paid','agent-kit-preorder-remaining-400')]},200],
 ['paid deposit only',{orders:[order('paid','agent-kit-preorder-deposit-399')]},403],
 ['legacy deposit title',{orders:[order('paid',null,{courseTitle:'Đội ngũ nhân sự AI - Cọc preorder'})]},403],
 ['pending full',{orders:[order('pending')]},403],['expired order',{orders:[order('expired')]},403],
 ['paid wrong course',{orders:[order('paid',null,{courseSlug:'ai-agent-master-2026'})]},403],
 ['paid wrong email',{orders:[order('paid',null,{email:'other@example.invalid'})]},403],
 ['explicit grant',{leads:[override('grant')]},200],['deposit plus explicit grant',{orders:[order('paid','agent-kit-preorder-deposit-399')],leads:[override('grant')]},200],
 ['paid then atomic revoke',{orders:[order()],enrollments:[enrollment('revoked')],leads:[override('revoke')]},403],
 ['email normalization',{user:{id:userId,email:' STUDENT@EXAMPLE.INVALID '},orders:[order()]},200],
];
for(const [name,scenario,expected] of cases)test(`all twelve library downloads: ${name}`,async()=>{
 const courses=[slug,'ai-agent-master-2026'].map((s,i)=>({id:String(i),slug:s,title:s,status:'open',lms_status:'published',course_modules:[]}));
 const client={from:table=>{const q={select:()=>q,order:()=>q,then:resolve=>resolve({data:table==='courses'?courses:[],error:null})};return q;},rpc:async()=>({data:{enrollments:scenario.enrollments??[],progress:[]},error:null})};
 const lms=load('services/lmsService.ts',{'@/lib/admin/read-all-rows':{},'@/lib/security/validation':{},'@/lib/crm-v2/normalize':{normalizeEmail:v=>(v??'').trim().toLowerCase()},'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/lib/youtube':{},'@/services/activityLogService':{},'@/lib/admin/command-center-source':{},'@/services/studentProvisioningOperationService':{}});
 const access=load('lib/agent-library-access.ts',{'@/lib/auth/session':{getCurrentAuth:async()=>({user:Object.hasOwn(scenario,'user')?scenario.user:{id:userId,email},adminRole:scenario.adminRole??null})},'@/lib/agent-kit-preorder':lifecycle,'@/lib/course-access':legacy,'@/services/lmsService':lms,'@/services/orderService':{getPaymentOrders:async()=>scenario.orders??[]},'@/services/leadService':{getLeads:async()=>scenario.leads??[]}});
 const signed=[];
 const files=load('lib/agent-library-files.ts',{'@/data/agent-library-packages.json':catalog,'@/data/agent-library-resources.json':resources,'@/lib/supabase/admin':{createSupabaseAdminClient:()=>({storage:{getBucket:async()=>({data:{public:false}}),from:bucket=>({createSignedUrl:async(path,ttl,options)=>{signed.push({bucket,path,ttl,options});return {data:{signedUrl:'https://storage.example.invalid/'+path}};}})}})}});
 const route=load('app/api/agent-library/[agent]/download/route.ts',{'@/lib/agent-library-access':access,'@/lib/agent-library-files':files});
 for(const e of [...catalog.agents,...resources.resources]){const id=e.slug.replace(/-agent$/,'');const response=await route.GET(new Request('https://www.theanhmarketing.com/api/agent-library/'+id+'/download?format=json'),{params:Promise.resolve({agent:id})});assert.equal(response.status,expected,`${name}: ${id}`);if(expected===200){assert.equal((await response.json()).url,`https://storage.example.invalid/${e.version}/${e.filename}`);const s=signed.at(-1);assert.equal(s.bucket,'agent-library-private');assert.equal(s.ttl,120);assert.equal(s.options.download,e.filename);}assert.match(response.headers.get('cache-control'),/no-store/);}
 assert.equal(signed.length,expected===200?12:0);
});
test('deposit excludes only Agent Kit in a mixed order',()=>{const result=legacy.getCourseAccessSlugs({email,orders:[order('paid','agent-kit-preorder-deposit-399',{orderItems:[{slug},{slug:'ebook-facebook-ads-2026'}]})]});assert.deepEqual(Array.from(result),['ebook-facebook-ads-2026']);});
