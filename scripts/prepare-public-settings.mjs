// Operator only. Payload and OAuth credential arrive through captured stdin, never argv/logs.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const account='8035ac71ae1041614760882f4b8862b2',database='694139c9-6cda-4b8c-9228-c973dbcbb719';
const worker='theanh-main-cf-staging',project='vsxxgdzwtscuxcmjfckt';
try {
 const input=JSON.parse(readFileSync(0,'utf8'));
 assert.equal(input.mode,'apply-staging');assert.equal(typeof input.oauth,'string');
 assert(Array.isArray(input.source)&&input.source.length===2);
 assert.deepEqual(input.source.map(s=>s.key).sort(),['brand','marketing']);
 for(const source of input.source){assert.equal(source.source_project_id,project);assert.equal(typeof source.source_exists,'boolean');const age=Date.now()-Date.parse(source.captured_at);assert(age>=0&&age<120000);}
 const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-marketing-settings";export * from "./lib/cloudflare/d1-brand-settings";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
 const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 async function api(path,body){
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+input.oauth,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('CLOUDFLARE_HTTP_'+response.status);
  const value=await response.json();if(value.success!==true)throw Error('CLOUDFLARE_API_FAILED');return value.result;
 }
 async function requireOff(){
  const settings=await api('/workers/scripts/'+worker+'/settings'),bindings=Object.fromEntries(settings.bindings.map(b=>[b.name,b]));
  assert.equal(bindings.NATIVE_AUTH_DB?.id,database);assert.equal(bindings.CF_NATIVE_QA_USERS?.text,'[]');
  for(const key of ['CF_NATIVE_AUTH_MODE','CF_NATIVE_MARKETING_MODE','CF_NATIVE_QA_PROGRESS_MODE','CF_NATIVE_QA_REFRESH_MODE','CF_NATIVE_QA_AUTH_CONTEXT_MODE','CF_NATIVE_QA_CREDENTIAL_WRITES'])assert.equal(bindings[key]?.text,'disabled');
 }
 async function query(statements){const results=await api('/d1/database/'+database+'/query',{batch:statements});assert.equal(results.length,statements.length);assert(results.every(r=>r.success===true));return results;}
 await requireOff();
 const db={
  first:async(sql,params)=>{const rows=(await query([{sql,params}]))[0].results;assert(rows.length<=1);return rows[0]??null;},
  batch:async statements=>{await requireOff();return query(statements);},
 };
 const plans=[];
 for(const source of input.source){const prepare=source.key==='brand'?h.prepareD1BrandSettings:h.prepareD1MarketingSettings;plans.push(await prepare(source));}
 await db.batch(plans.map(p=>p.statement));
 const receipts=[];
 for(let i=0;i<input.source.length;i++){
  const source=input.source[i],plan=plans[i],verify=source.key==='brand'?h.verifyD1BrandSettings:h.verifyD1MarketingSettings,read=source.key==='brand'?h.readD1BrandSettings:h.readD1MarketingSettings;
  await verify(db,source);assert.deepEqual(await read(db),plan.normalized);
  receipts.push({key:source.key,sourceExists:plan.exists,sourceSnapshotAt:plan.captured,sourceUpdatedAt:plan.updated,sourceDigest:plan.sourceDigest,normalizedDigest:plan.normalizedDigest,snapshotId:plan.snapshotId,readbackMatched:true});
 }
 await requireOff();
 input.oauth='';input.source=[];
 console.log(JSON.stringify({status:'STAGING_PUBLIC_SETTINGS_VERIFIED_GATES_OFF',checkedAt:new Date().toISOString(),receipts,productionWrites:false,limits:'Two public settings only; five-minute Source snapshot, no native-primary/admin writer or hosted render claim'}));
}catch(error){
 const code=/^CLOUDFLARE_HTTP_\d+$|^CLOUDFLARE_API_FAILED$/.test(error?.message??'')?error.message:'PUBLIC_SETTINGS_PREPARATION_FAILED';
 console.log(JSON.stringify({status:'FAILED',code,limits:'Raw source and credentials withheld; gates are never opened by this operator'}));process.exitCode=1;
}
