// Approved read-only public A catalogue. Anonymous existing key is loaded from
// the existing local public build env; no credentials/rows leave this process.
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
let stage='setup';
const receipt='reports/cloudflare-phase2-20261018/source-public-student-catalog-a.json';
try{
 process.loadEnvFile('.env.cfproduction');
 if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://vsxxgdzwtscuxcmjfckt.supabase.co')throw Error();
 const full=await build({stdin:{contents:'export {getCourses} from "./services/courseService";export {createSupabaseServerClient} from "./lib/supabase/server";export {mapDbResource} from "./lib/resources/resource-projection";export * from "./lib/cloudflare/d1-student-public-catalog";export {parseExactJson} from "./lib/cloudflare/precise-json";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const core=await import('data:text/javascript;base64,'+Buffer.from(full.outputFiles[0].text).toString('base64'));
 const nativeFetch=globalThis.fetch,responses=new Map();let requests=0,failed=false;
 globalThis.fetch=async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==process.env.NEXT_PUBLIC_SUPABASE_URL||!['/rest/v1/courses','/rest/v1/resources'].includes(url.pathname)){failed=true;throw Error('READ_SCOPE_REQUIRED');}
  requests++;
  const response=await nativeFetch(request,{signal:AbortSignal.timeout(45000)});
  if(!response.ok){failed=true;throw Error('SOURCE_PUBLIC_UNAVAILABLE');}
  const reader=response.body.getReader(),parts=[];let bytes=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024){failed=true;throw Error('SOURCE_PUBLIC_TOO_LARGE');}parts.push(value);}}finally{await reader.cancel();}
  const raw=Buffer.concat(parts).toString('utf8'),rows=core.parseExactJson(raw);
  if(!Array.isArray(rows)||rows.length>=1000||responses.has(url.pathname)){failed=true;throw Error('SOURCE_PUBLIC_INCOMPLETE');}
  responses.set(url.pathname,rows);
  return new Response(raw,{status:response.status,headers:response.headers});
 };
 const warn=console.warn,info=console.info;console.warn=()=>{};console.info=()=>{};
 let expectedCourses,resourceResult;
 stage='source-anonymous-read';const startedAt=new Date().toISOString();
 try{
  expectedCourses=await core.getCourses({summaryOnly:true});
  resourceResult=await core.createSupabaseServerClient().from('resources').select('id,title,description,thumbnail,file_url,access_type,created_at').order('created_at',{ascending:false});
 }finally{globalThis.fetch=nativeFetch;console.warn=warn;console.info=info;}
 if(failed||requests!==2||responses.size!==2||resourceResult.error)throw Error();
 const source={courses:responses.get('/rest/v1/courses'),resources:responses.get('/rest/v1/resources')},capturedAt=new Date().toISOString();
 if(!source.courses.length||!source.resources.length)throw Error('EMPTY_SOURCE_REQUIRES_SEPARATE_PARITY');
 stage='native-catalog-replay';
 const sql=new DatabaseSync(':memory:');
 try{
  sql.exec(readFileSync('scripts/d1-student-public-catalog-prototype.sql','utf8'));
  const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,batch:async statements=>{sql.exec('BEGIN');try{const result=statements.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return result;}catch{sql.exec('ROLLBACK');throw Error();}}};
  const plan=await core.prepareD1StudentPublicCatalog(source,capturedAt);sql.prepare(plan.statement.sql).run(...plan.statement.params);
  await core.verifyD1StudentPublicCatalog(db,source,capturedAt);
  const actual=await core.readD1StudentPublicCatalog(db);
  const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  if(canonical(actual.courses)!==canonical(expectedCourses)||canonical(actual.resources)!==canonical(source.resources.map(core.mapDbResource)))throw Error();
  const report={status:'TESTED_PUBLIC_SOURCE_SERVICE_AND_NATIVE_CATALOG',sourceWindowStartedAt:startedAt,sourceWindowEndedAt:capturedAt,sourceAnonymousReads:requests,sourceCourses:source.courses.length,sourceResources:source.resources.length,normalizedCourses:actual.courses.length,normalizedResources:actual.resources.length,coursesComparedAgainstActualSourceService:true,resourcesComparedAgainstSharedSourceMapper:true,allRetainedFieldsReadBack:true,privateLessonContentRetained:false,database:'IN_MEMORY_SQLITE_ONLY',sourceInputsSameMvccStatement:false,productionWritten:false,remoteD1Written:false,readyForCutover:false};
  if(process.argv.includes('--apply-staging')){
   stage='staging-identity-and-disabled-gates';
   const token=readFileSync(path.join(homedir(),'Library/Preferences/.wrangler/config/default.toml'),'utf8').match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];if(!token)throw Error();
   const base='https://api.cloudflare.com/client/v4/accounts/8035ac71ae1041614760882f4b8862b2',database='694139c9-6cda-4b8c-9228-c973dbcbb719';
   async function api(suffix,body){const r=await nativeFetch(base+suffix,{method:body===undefined?'GET':'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error();const value=await r.json();if(value.success!==true)throw Error();return value.result;}
   const metadata=await api('/d1/database/'+database),settings=await api('/workers/scripts/theanh-main-cf-staging/settings'),bindings=Object.fromEntries(settings.bindings.map(b=>[b.name,b]));
   if(metadata.uuid!==database||metadata.name!=='theanh-main-db-staging'||bindings.NATIVE_AUTH_DB?.id!==database||bindings.CF_NATIVE_AUTH_MODE?.text!=='disabled'||bindings.CF_NATIVE_QA_USERS?.text!=='[]')throw Error();
   async function batch(statements){const result=await api('/d1/database/'+database+'/query',{batch:statements});if(result.length!==statements.length||result.some(r=>r.success!==true))throw Error();return result;}
   const remote={first:async(sql,params)=>{const r=await batch([{sql,params}]);if(r[0].results.length>1)throw Error();return r[0].results[0]??null;},batch};
   stage='staging-public-catalog-import';await batch([plan.statement]);await core.verifyD1StudentPublicCatalog(remote,source,capturedAt);
   const readback=await core.readD1StudentPublicCatalog(remote);if(canonical(readback)!==canonical(actual))throw Error();
   report.remoteD1Written=true;report.remoteReadbackVerified=true;report.targetDatabase='A_STAGING_ONLY';report.database='LOCAL_SQLITE_AND_REMOTE_STAGING_D1';
  }
  writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{sql.close();}
}catch{
 const report={status:'PUBLIC_CATALOG_NOT_VERIFIED',stage,privateDetailsWithheld:true,productionWritten:false,readyForCutover:false};writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));process.exitCode=2;
}
