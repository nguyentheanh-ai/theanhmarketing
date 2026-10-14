// Sensitive stdin/stdout pair: called only by the capturing Python parent.
// Never run with an uncaptured terminal/stdout. No raw source hash is returned.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
try{
 let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>131072)throw Error('Input too large')}
 const input=JSON.parse(text);
 const qa=JSON.parse(readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
 const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-auth-import";export * from "./lib/cloudflare/legacy-password";export {isAdminEmail} from "./lib/course-access";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const helpers=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const row=input.source;
 if(qa.auth_user_id&&row.id!==qa.auth_user_id||row.email.toLowerCase()!==qa.email.toLowerCase()||!row.emailConfirmedAt||row.deletedAt||row.isAnonymous||row.bannedUntil&&Date.parse(row.bannedUntil)>Date.now()||!row.encryptedPassword)throw Error('QA source mismatch');
 if(helpers.isAdminEmail(row.email)||['owner','editor'].includes(row.appMetadata?.admin_role))throw Error('QA cannot be an administrator');
 if(!await helpers.verifyLegacyBcryptPassword(qa.password,row.encryptedPassword))throw Error('QA credential mismatch');
 const prepared=await helpers.prepareD1AuthInitialImport([row],{projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:input.credentialKey,resolveRole:()=>null});
 const decrypted=await helpers.openLegacyBcryptHash(prepared.statements[1].params[1],input.credentialKey,{projectId:'vsxxgdzwtscuxcmjfckt',userId:row.id});
 if(decrypted!==row.encryptedPassword)throw Error('QA ciphertext mismatch');
 process.stdout.write(JSON.stringify({status:'PREPARED_ONLY',summary:prepared.summary,ciphertextRoundtrip:true,sourcePasswordMatches:true,statements:prepared.statements}));
}catch{
 process.stdout.write(JSON.stringify({status:'FAILED',message:'QA Auth preparation failed; sensitive output withheld'}));process.exitCode=1;
}
