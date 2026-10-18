// Actual production Worker artifact -> real PostgREST -> encrypted PostgreSQL
// clone. Auth, App B and Resend are bounded transport fixtures. No provider is
// contacted and the restore's customer tables are never exposed by PostgREST.
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const prefix=process.env.TAM_QA_ORDER_PREFIX,jwt=process.env.TAM_QA_API_JWT;
assert.match(prefix??'',/^TAMCFQA[A-F0-9]{12}$/);
assert.equal(process.env.TAM_QA_POSTGREST_ORIGIN,'http://127.0.0.1:55449');
const root=path.resolve('dist/server'),config=JSON.parse(readFileSync(path.join(root,'wrangler.json'),'utf8')),modules={};
assert.equal(config.name,'theanh-main-cf-production');assert.equal(config.vars.CF_CRON_MODE,'disabled');
function add(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())add(f);else{const type={'.js':'esm','.mjs':'esm','.json':'json','.wasm':'wasm'}[path.extname(f)];if(type)modules[path.relative(root,f)]={type,contents:readFileSync(f,type==='wasm'?undefined:'utf8')};}}}add(root);
const env=Object.fromEntries(Object.entries(config.vars).map(([k,value])=>[k,{type:'text',value}]));
const fakeKey='synthetic-sepay-webhook-key-0123456789';
for(const [k,value] of Object.entries({SUPABASE_SERVICE_ROLE_KEY:jwt,SEPAY_WEBHOOK_API_KEY:fakeKey,SEPAY_BANK_ACCOUNT_NUMBER:'9999000001',RESEND_API_KEY:'re_fixture_never_transmitted',STUDENT_PORTAL_PROVISION_URL:'https://app.theanhmarketing.com/qa-provision',STUDENT_PORTAL_PROVISION_SECRET:'synthetic-provision-secret'}))env[k]={type:'text',value};
env.NATIVE_AUTH_DB={type:'d1',name:'payment-local-only',id:'payment-local-only'};env.ASSETS={type:'assets'};env.PRIVATE_ASSETS={type:'r2',name:'payment-local-only'};
const userId='11111111-1111-4111-8111-111111111111',email='migration-qa@example.invalid';
let user=null,authDown=false,portalDown=false,loseProviderResponse=false,blocked=0,authCalls=0,portalCalls=0,emailCalls=0;
const delivered=new Map();
const json=(body,status=200)=>Response.json(body,{status});
async function outbound(req){
 const u=new URL(req.url);
 if(u.host==='vsxxgdzwtscuxcmjfckt.supabase.co'){
  if(u.pathname==='/rest/v1/orders'){
   const headers=new Headers(req.headers);headers.set('accept-profile','qa_transport');headers.set('content-profile','qa_transport');
   return fetch('http://127.0.0.1:55449/orders'+u.search,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:await req.arrayBuffer(),redirect:'manual'});
  }
  if(u.pathname==='/rest/v1/users'&&req.method==='PATCH')return json(req.headers.get('accept')?.includes('vnd.pgrst.object')?{id:userId}:[{id:userId}]);
  if(u.pathname==='/rest/v1/activity_logs')return req.method==='GET'?json([]):new Response(null,{status:201});
  if(u.pathname==='/auth/v1/admin/users'){
   authCalls++;if(authDown)return json({message:'Synthetic Auth outage'},503);
   if(req.method==='GET')return json({users:user?[user]:[],aud:'authenticated',next_page:null,last_page:1,total:user?1:0});
   const data=await req.json();assert.equal(data.email,email);
   if(user)return json({msg:'User already registered'},422);
   user={id:userId,email,role:'authenticated',aud:'authenticated',created_at:new Date().toISOString(),email_confirmed_at:new Date().toISOString(),user_metadata:data.user_metadata,app_metadata:{provider:'email',providers:['email']}};
   return json(user);
  }
  if(u.pathname==='/auth/v1/token'){
   if(authDown)return json({error:'server_error',error_description:'Synthetic outage'},503);
   const payload=Buffer.from(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',email})).toString('base64url');
   return json({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.fixture',token_type:'bearer',refresh_token:'local-fixture-refresh',expires_in:3600,user});
  }
  if(u.pathname==='/auth/v1/logout')return new Response(null,{status:204});
 }
 if(u.host==='app.theanhmarketing.com'&&u.pathname==='/qa-provision'){
  portalCalls++;const data=await req.json();assert.equal(data.email,email);return json({ok:!portalDown},portalDown?503:200);
 }
 if(u.host==='api.resend.com'&&u.pathname==='/emails'){
  emailCalls++;const data=await req.json();assert.equal(data.to,email);const key=req.headers.get('idempotency-key');assert(key?.startsWith('tam-sepay-paid-email/'+prefix));
  const hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  if(delivered.has(key))assert.equal(delivered.get(key).hash,hash);else delivered.set(key,{hash,id:'local-message-'+delivered.size});
  if(loseProviderResponse){loseProviderResponse=false;return json({message:'Response lost after synthetic acceptance'},503);}
  return json({id:delivered.get(key).id});
 }
 blocked++;return json({message:'Outbound blocked by isolated QA harness'},599);
}
const mf=new Miniflare({workers:[{config:{name:'payment-local',compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,manifest:{mainModule:'index.js',modulesRoot:root,modules},assets:{directory:path.resolve('dist/client'),notFoundHandling:'none',hasUserWorker:true},env},dev:{outboundService:{type:'fetcher',handler:outbound}}}]});
const payload=(suffix,amount=2000)=>({id:'worker-local-'+suffix,code:prefix+suffix,transferType:'in',transferAmount:amount,accountNumber:'9999000001'});
async function post(suffix,{authorized=true,amount=2000}={}){const r=await mf.dispatchFetch('https://www.theanhmarketing.com/api/sepay/webhook',{method:'POST',headers:{'content-type':'application/json',authorization:'Apikey '+(authorized?fakeKey:'wrong')},body:JSON.stringify(payload(suffix,amount))});const body=await r.json();return{status:r.status,body};}
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,reason:e instanceof assert.AssertionError?'assertion_failed':e.name});}}
try{
 await check('wrong bank key is rejected before database/Auth/provider actions',async()=>{const before=authCalls;const r=await post('A',{authorized:false});assert.equal(r.status,401);assert.equal(authCalls,before);assert.equal(emailCalls,0);});
 await check('valid bank receipt settles and fulfills through actual Workers HTTP route',async()=>{const r=await post('A');assert.equal(r.status,200);assert.equal(r.body.success,true);assert.equal(delivered.size,1);assert.equal(portalCalls,1);});
 await check('paid replay creates no second email or Auth operation',async()=>{const before=authCalls;assert.equal((await post('A')).status,200);assert.equal(delivered.size,1);assert.equal(emailCalls,1);assert.equal(authCalls,before);});
 await check('Auth outage after paid commit returns503 then retry finishes access/email',async()=>{authDown=true;assert.equal((await post('B')).status,503);authDown=false;assert.equal((await post('B')).status,200);assert.equal(delivered.size,2);});
 await check('App B provisioning outage blocks email until a successful retry',async()=>{portalDown=true;const before=emailCalls;assert.equal((await post('C')).status,503);assert.equal(emailCalls,before);portalDown=false;assert.equal((await post('C')).status,200);assert.equal(delivered.size,3);});
 await check('provider accepted-response loss retries one idempotent delivery',async()=>{loseProviderResponse=true;assert.equal((await post('D')).status,503);assert.equal((await post('D')).status,200);assert.equal(delivered.size,4);});
 await check('two concurrent bank events deliver one email and retain paid state',async()=>{const before=delivered.size;const r=await Promise.all([post('E'),post('E')]);assert(r.some(x=>x.status===200));assert.equal(delivered.size-before,1);assert.equal((await post('E')).status,200);assert.equal(delivered.size-before,1);});
 await check('underpayment does not create an account or send mail',async()=>{const before=emailCalls;assert.equal((await post('F',{amount:1000})).status,422);assert.equal(emailCalls,before);});
 const report={checkedAt:new Date().toISOString(),status:checks.every(x=>x.passed)?'PASS':'FAIL',checks,providerRequests:emailCalls,simulatedDeliveries:delivered.size,unexpectedOutboundBlocked:blocked,productionContacted:false,scope:'Actual cfproduction artifact HTTP webhook, actual Source SDK and PostgREST/PostgreSQL clone; Auth, B and Resend transport fixtures. No live bank, live Auth issuance, real emails or production data writes.'};
 writeFileSync(process.env.TAM_QA_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=report.status==='PASS'?0:1;
}finally{await mf.dispose();}
