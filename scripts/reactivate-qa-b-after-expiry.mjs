// Exact QA-only recovery after the previously revoked token has expired.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';
if(process.argv.slice(2).join(' ')!=='--apply-qa'){console.log('PLAN_ONLY: reactivate exact QA B profile after recorded revocation + token TTL');process.exit(0);}
const revoked=JSON.parse(fs.readFileSync('reports/cloudflare-handoff-20261018/qa-b-session-revocation.json','utf8'));
if(revoked.status!=='SECURED_QA_INACTIVE'||!revoked.qaGlobalSessionsRevoked||Date.now()<Date.parse(revoked.checkedAt)+3_601_000)throw Error('QA_TOKEN_TTL_NOT_PASSED');
const qa=JSON.parse(fs.readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
if(!qa.email?.includes('+cloudflare-qa-'))throw Error('QA_SCOPE_REQUIRED');
const keys=parseEnv(execFileSync('/usr/bin/textutil',['-convert','txt','-stdout',process.env.HOME+'/Documents/key.rtf'],{encoding:'utf8'}));
const key=keys.SUPABASE_SERVICE_ROLE_KEY?.trim();
const claims=JSON.parse(Buffer.from(key?.split('.')[1]??'','base64url').toString());
if(claims.ref!=='pppiqhkectojxbmhqcnx'||claims.role!=='service_role')throw Error('WRONG_PROJECT');
const admin=createClient('https://pppiqhkectojxbmhqcnx.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:profile,error}=await admin.from('profiles').select('id,email,status,role').eq('email',qa.email).single();
if(error||profile.status!=='inactive'||profile.role!=='student')throw Error('EXACT_INACTIVE_QA_REQUIRED');
const user=await admin.auth.admin.getUserById(profile.id);
if(user.error||user.data.user.email!==qa.email||Date.parse(user.data.user.created_at)<Date.parse('2026-10-12T00:00:00Z'))throw Error('EXACT_QA_AUTH_REQUIRED');
const changed=await admin.from('profiles').update({status:'active'}).eq('id',profile.id).eq('email',qa.email).eq('role','student').eq('status','inactive').select('status');
if(changed.error||changed.data?.length!==1||changed.data[0].status!=='active')throw Error('QA_REACTIVATION_FAILED');
const receipt={checkedAt:new Date().toISOString(),status:'QA_ACTIVE_AFTER_REVOKED_TOKEN_EXPIRY',profileCount:1,previousQaSessionsRevoked:true,minimumExpiryPassed:true,scope:'Only existing QA alias B; no real student, password, entitlement, secret or DNS change'};
fs.writeFileSync('reports/cloudflare-handoff-20261018/qa-b-reactivation.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
