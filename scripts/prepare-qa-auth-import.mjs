// Sensitive stdin/stdout pair: called only by the capturing Python parent.
// Never run with an uncaptured terminal/stdout. No raw source hash is returned.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
try{
 let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>131072)throw Error('Input too large')}
 const input=JSON.parse(text);
 const qa=JSON.parse(readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
 const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-auth-import";export * from "./lib/cloudflare/d1-auth-import-verification";export * from "./lib/cloudflare/d1-qa-auth-timestamp-delta";export * from "./lib/cloudflare/legacy-password";export {isAdminEmail} from "./lib/course-access";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const helpers=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const row=input.source;
 if(qa.auth_user_id&&row.id!==qa.auth_user_id||row.email.toLowerCase()!==qa.email.toLowerCase()||!row.emailConfirmedAt||row.deletedAt||row.isAnonymous||row.bannedUntil&&Date.parse(row.bannedUntil)>Date.now()||!row.encryptedPassword)throw Error('QA source mismatch');
 if(helpers.isAdminEmail(row.email)||['owner','editor'].includes(row.appMetadata?.admin_role))throw Error('QA cannot be an administrator');
 if(!await helpers.verifyLegacyBcryptPassword(qa.password,row.encryptedPassword))throw Error('QA credential mismatch');
 const prepared=await helpers.prepareD1AuthInitialImport([row],{projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:input.credentialKey,resolveRole:()=>null});
 const decrypted=await helpers.openLegacyBcryptHash(prepared.statements[1].params[1],input.credentialKey,{projectId:'vsxxgdzwtscuxcmjfckt',userId:row.id});
 if(decrypted!==row.encryptedPassword)throw Error('QA ciphertext mismatch');
 if(input.timestampDelta){
  const plan=await helpers.prepareQaAuthTimestampDelta(row,input.target,{projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:input.credentialKey,operationId:input.operationId});
  process.stdout.write(JSON.stringify({status:'TIMESTAMP_DELTA_PREPARED',...plan}));process.exit(0);
 }
 if(input.target){
  try {
   const options={projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:input.credentialKey,resolveRole:()=>null};
   const verification=input.logoutHistory?await helpers.verifyD1QaAuthAfterLogout(row,input.target,options,input.logoutHistory):await helpers.verifyD1InitialAuthRow(row,input.target,options);
   process.stdout.write(JSON.stringify({status:'VERIFIED_QA_ONLY',verification}));process.exit(0);
  } catch {
   // Only field names leave this process. Never emit source/target values,
   // credential hashes, ciphertext, digests or identity metadata.
   const t=input.target,a=prepared.statements[1].params,u=prepared.statements[0].params,v=prepared.statements[2].params;
   const expected={id:u[0],user_id:a[0],normalized_email:u[1],admin_role:u[2],email_confirmed_at:a[2],banned_until:a[3],deleted_at:a[4],is_anonymous:a[5],session_version:1,must_change_password:a[6],user_metadata:JSON.parse(a[7]),created_at:a[8],updated_at:a[9],source_revision:v[1],source_digest:v[2],source_project_id:v[3]};
   const differences=Object.entries(expected).filter(([name,value])=>!isDeepStrictEqual(name==='user_metadata'?JSON.parse(t[name]):t[name],value)).map(([name])=>name);
   try {if(await helpers.openLegacyBcryptHash(t.credential_ciphertext,input.credentialKey,{projectId:'vsxxgdzwtscuxcmjfckt',userId:row.id})!==row.encryptedPassword)differences.push('credential');}catch{differences.push('credential');}
   process.stdout.write(JSON.stringify({status:'FAILED',differences}));process.exit(1);
  }
 }
 process.stdout.write(JSON.stringify({status:'PREPARED_ONLY',summary:prepared.summary,ciphertextRoundtrip:true,sourcePasswordMatches:true,statements:prepared.statements}));
}catch{
 process.stdout.write(JSON.stringify({status:'FAILED',message:'QA Auth preparation failed; sensitive output withheld'}));process.exitCode=1;
}
