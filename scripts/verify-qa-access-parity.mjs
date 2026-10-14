// Full source/D1 records are kept in memory; output aggregate evidence only.
import {build} from 'esbuild';
try{
 let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>2*1024*1024)throw Error('Input too large');}
 const {source,subject,cloudToken}=JSON.parse(input);if(typeof cloudToken!=='string'||!cloudToken)throw Error('Auth unavailable');
 const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-qa-access-parity";export * from "./lib/cloudflare/d1-course-access";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const response=await fetch('https://api.cloudflare.com/client/v4/accounts/8035ac71ae1041614760882f4b8862b2/d1/database/694139c9-6cda-4b8c-9228-c973dbcbb719/query',{method:'POST',headers:{Authorization:'Bearer '+cloudToken,'Content-Type':'application/json'},body:JSON.stringify({sql:h.D1_STUDENT_ACCESS_SQL,params:[subject.id,subject.email.trim().toLowerCase(),new Date().toISOString(),'vsxxgdzwtscuxcmjfckt']}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('D1 request rejected');const value=await response.json();if(value.success!==true||value.result.length!==1||value.result[0].success!==true||value.result[0].results.length!==1)throw Error('D1 result unavailable');
 const actual=value.result[0].results[0],parity=h.verifyD1QaAccessParity(source,actual,subject);
 console.log(JSON.stringify({status:'TESTED_REMOTE_QA_ACCESS_PARITY',...parity,targetMirrorState:JSON.parse(actual.sync_json).status,sourceReadAt:source.snapshotAt,limits:'Actual source RPC plus source legacy inputs compared to D1 snapshot calculation; no marker promotion, session/UI or customer authority claim'}));
}catch{console.log(JSON.stringify({status:'FAILED',reason:'QA source/D1 parity failed; private payload and credentials withheld'}));process.exitCode=1;}
