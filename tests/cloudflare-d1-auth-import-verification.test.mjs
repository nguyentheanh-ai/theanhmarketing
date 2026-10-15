import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import bcrypt from 'bcryptjs';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-auth-import";export * from "./lib/cloudflare/d1-auth-import-verification";export * from "./lib/cloudflare/legacy-password";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const helper=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const source={id:'00000000-0000-4000-8000-000000000001',email:'fixture@example.invalid',encryptedPassword:await bcrypt.hash('Synthetic only',6),emailConfirmedAt:'2026-10-14T00:00:00Z',bannedUntil:null,deletedAt:null,isAnonymous:false,userMetadata:{display_name:'Fixture',must_change_password:false},appMetadata:{provider:'email'},createdAt:'2026-10-13T00:00:00Z',updatedAt:'2026-10-14T00:00:00.123456Z'};
const options={projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:helper.generateCredentialKey(),resolveRole:()=>null};
const plan=await helper.prepareD1AuthInitialImport([source],options),u=plan.statements[0].params,a=plan.statements[1].params,v=plan.statements[2].params;
const target={id:u[0],normalized_email:u[1],admin_role:u[2],user_id:a[0],credential_ciphertext:a[1],email_confirmed_at:a[2],banned_until:a[3],deleted_at:a[4],is_anonymous:a[5],session_version:1,must_change_password:a[6],user_metadata:a[7],created_at:a[8],updated_at:a[9],source_revision:v[1],source_digest:v[2],source_project_id:v[3]};
test('initial imported encrypted account matches complete source authority and canonical metadata',async()=>{assert((await helper.verifyD1InitialAuthRow(source,target,options)).matched);assert((await helper.verifyD1InitialAuthRow(source,{...target,user_metadata:JSON.stringify({must_change_password:false,display_name:'Fixture'})},options)).matched)});
test('identity role status flags metadata dates and cursor alterations cannot pass an unchanged stored digest',async()=>{
 for(const [field,value] of [['id','other'],['user_id','other'],['normalized_email','other@example.invalid'],['admin_role','owner'],['email_confirmed_at',null],['banned_until','2027-01-01T00:00:00Z'],['deleted_at','2026-10-15T00:00:00Z'],['is_anonymous',1],['session_version',2],['must_change_password',1],['user_metadata','{"display_name":"changed"}'],['created_at','2026-01-01T00:00:00Z'],['updated_at','2026-10-15T00:00:00Z'],['source_revision','0'.repeat(20)],['source_digest','0'.repeat(64)],['source_project_id','pppiqhkectojxbmhqcnx']])await assert.rejects(helper.verifyD1InitialAuthRow(source,{...target,[field]:value},options));
});
test('credential ciphertext and recovery-key mismatch fail without returning raw hashes',async()=>{await assert.rejects(helper.verifyD1InitialAuthRow(source,{...target,credential_ciphertext:null},options));await assert.rejects(helper.verifyD1InitialAuthRow(source,target,{...options,credentialKey:helper.generateCredentialKey()}))});

const logout={id:'fixture-logout',project_id:options.projectId,user_id:source.id,kind:'global_logout',expected_version:1,target_version:2,status:'done'};
const history={operations:[logout],activeSessions:0,activeFamilies:0,credentialOperations:0};
test('QA after logout proves the complete local version chain without lowering the counter',async()=>{
 const current={...target,session_version:2};const before=JSON.stringify(current);
 const result=await helper.verifyD1QaAuthAfterLogout(source,current,options,history);
 assert.equal(result.localSessionVersionPreserved,true);assert.equal(result.verifiedLogoutCount,1);assert.equal(JSON.stringify(current),before);
 await assert.rejects(helper.verifyD1InitialAuthRow(source,current,options));
 assert((await helper.verifyD1QaAuthAfterLogout(source,{...current,session_version:3},options,{...history,operations:[{...logout,id:'second',expected_version:2,target_version:3},logout]})).matched);
});
test('QA rejects missing, duplicate, cross-project/user and incomplete logout history',async()=>{
 const current={...target,session_version:2};
 for(const operations of [[],[logout,logout],[{...logout,status:'pending'}],[{...logout,kind:'password_change'}],[{...logout,project_id:'other'}],[{...logout,user_id:'other'}],[{...logout,expected_version:2,target_version:3}],[{...logout,target_version:3}]])await assert.rejects(helper.verifyD1QaAuthAfterLogout(source,current,options,{...history,operations}));
 await assert.rejects(helper.verifyD1QaAuthAfterLogout(source,{...current,session_version:3},options,{...history,operations:[logout,{...logout,id:'second'}]}));
 for(const session_version of [0,-1,1.5,'2',10001])await assert.rejects(helper.verifyD1QaAuthAfterLogout(source,{...target,session_version},options,history));
});
test('QA history never permits active proof, credential writes or changed source/security fields',async()=>{
 const current={...target,session_version:2};
 for(const field of ['activeSessions','activeFamilies','credentialOperations'])await assert.rejects(helper.verifyD1QaAuthAfterLogout(source,current,options,{...history,[field]:1}));
 for(const [field,value] of [['admin_role','owner'],['normalized_email','other@example.invalid'],['credential_ciphertext',null],['source_digest','0'.repeat(64)],['must_change_password',1]])await assert.rejects(helper.verifyD1QaAuthAfterLogout(source,{...current,[field]:value},options,history));
 await assert.rejects(helper.verifyD1QaAuthAfterLogout(source,current,{...options,resolveRole:()=> 'editor'},history));
});
