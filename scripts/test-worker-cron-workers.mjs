// Local-only harness on the real vinext build (dist/server): Cloudflare
// `scheduled` -> worker-cron dispatcher -> actual Next cron routes with the
// Bearer CRON_SECRET check. All outbound (Supabase etc.) is blocked and counted.
// Also checks the apex -> www redirect. Never deploy this harness.
import {Miniflare} from 'miniflare';import {readFileSync,readdirSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';
const root=path.resolve('dist/server'),modules={};
function add(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())add(f);else{const ext=path.extname(f),type={'.js':'esm','.mjs':'esm','.json':'json','.wasm':'wasm'}[ext];if(type)modules[path.relative(root,f)]={type,contents:readFileSync(f,type==='wasm'?undefined:'utf8')};}}}add(root);
const config=JSON.parse(readFileSync(path.join(root,'wrangler.json'),'utf8'));
const secret='synthetic-cron-secret-0123456789abcdef';
function makeEnv(cronSecret){const env=Object.fromEntries(Object.entries(config.vars).map(([k,value])=>[k,{type:'text',value}]));
 for(const [k,value] of Object.entries({CF_CRON_MODE:'enabled',CF_CRON_ORIGIN:'https://www.theanhmarketing.com',CRON_SECRET:cronSecret,SUPABASE_SERVICE_ROLE_KEY:'synthetic-not-a-key',NATIVE_AUTH_REFRESH_KEY:'A'.repeat(43),NATIVE_AUTH_CREDENTIAL_KEY:'B'.repeat(43),NATIVE_AUTH_LIMITER_KEY:'C'.repeat(43)}))env[k]={type:'text',value};
 env.NATIVE_AUTH_DB={type:'d1',name:'cron-local-only',id:'cron-local-only'};env.ASSETS={type:'assets'};env.PRIVATE_ASSETS={type:'r2',name:'cron-local-only'};return env;}
const outbound=[];
const worker=(name,cronSecret)=>({config:{name,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,manifest:{mainModule:'index.js',modulesRoot:root,modules},assets:{directory:path.resolve('dist/client'),notFoundHandling:'none',hasUserWorker:true},env:makeEnv(cronSecret)},dev:{outboundService:{type:'fetcher',handler:req=>{const u=new URL(req.url);outbound.push({worker:name,host:u.host,path:u.pathname});return new Response(null,{status:599})}}}});
const mf=new Miniflare({workers:[worker('cron-ok',secret)]});
let checks=0;const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
try{
 const w=await mf.getWorker('cron-ok');
 await check('apex domain answers 307 to www with path and query kept',async()=>{const r=await mf.dispatchFetch('https://theanhmarketing.com/khoa-hoc?utm_source=fb',{redirect:'manual'});assert.equal(r.status,307);assert.equal(r.headers.get('location'),'https://www.theanhmarketing.com/khoa-hoc?utm_source=fb')});
 await check('cron route rejects a missing or wrong bearer without touching Supabase',async()=>{const before=outbound.length;for(const auth of [undefined,'Bearer wrong-secret-wrong-secret-wrong']){const r=await mf.dispatchFetch('https://www.theanhmarketing.com/api/orders/expire',{redirect:'manual',headers:auth?{authorization:auth}:{}});assert.equal(r.status,401);await r.arrayBuffer()}assert.equal(outbound.length,before)});
 await check('scheduled 01:30 UTC runs orders/expire and email worker through the real routes (reach Supabase)',async()=>{const before=outbound.length;await w.scheduled({scheduledTime:new Date(Date.UTC(2026,9,16,1,30,4)),cron:'*/5 * * * *'});const calls=outbound.slice(before);assert(calls.length>0,'routes did not run past the cron guard');assert(calls.every(c=>c.host.endsWith('supabase.co')||c.host==='api.resend.com'),JSON.stringify(calls))});
 await check('scheduled at a quiet minute calls nothing',async()=>{const before=outbound.length;await w.scheduled({scheduledTime:new Date(Date.UTC(2026,9,16,3,0,2)),cron:'*/5 * * * *'});assert.equal(outbound.length,before)});
 const report={checkedAt:new Date().toISOString(),status:'PASS',checks,build:config.name,outboundHosts:[...new Set(outbound.map(o=>o.host))],scope:'Real vinext build: scheduled -> worker-cron -> Next cron routes with Bearer CRON_SECRET; apex->www redirect',limits:'Outbound blocked (Supabase returns 599), so route side effects are not executed; not hosted'};
 writeFileSync('reports/cloudflare-d1/worker-cron-workers.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await mf.dispose()}
