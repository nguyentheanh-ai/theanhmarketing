import {normalizeNativeAccountProfile} from '@/lib/cloudflare/d1-account-profile';
type Row=Record<string,unknown>;
const columns=['user_id','credential_ciphertext','email_confirmed_at','banned_until','deleted_at','is_anonymous','session_version','must_change_password','user_metadata','created_at','updated_at'];
function row(value:unknown):Row{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid QA profile state');return value as Row;}
function account(value:unknown){const result=row(value);if(Object.keys(result).length!==columns.length||columns.some(k=>!(k in result)||!(result[k]===null||typeof result[k]==='string'||typeof result[k]==='number'&&Number.isFinite(result[k]))))throw Error('Invalid QA account columns');return result;}
function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Row)[k])).join(',')+'}';return JSON.stringify(value);}
function clock(value:unknown){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw Error('Invalid QA action clock');return Date.parse(value);}
// Operator-only restoration after one planned QA profile action. No Source,
// credential write, DELETE, account creation or runtime route uses this helper.
export function prepareQaProfileRestore(value:unknown){
 const request=row(value),qa=row(request.qa),before=account(request.before),after=account(request.after),profile=normalizeNativeAccountProfile(request.profile);
 if(typeof qa.userId!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(qa.userId))||typeof qa.email!=='string'||!qa.email||qa.email!==qa.email.trim().toLowerCase()||before.user_id!==qa.userId||after.user_id!==qa.userId)throw Error('Exact QA identity required');
 if(columns.some(k=>!['user_metadata','updated_at'].includes(k)&&canonical(before[k])!==canonical(after[k])))throw Error('QA authority changed');
 const start=clock(request.startedAt),end=clock(request.finishedAt),updated=clock(after.updated_at);
 if(start>end||updated<start||updated>end||clock(before.updated_at)>updated)throw Error('Unrecognized QA update clock');
 const expected={...row(JSON.parse(String(before.user_metadata))),full_name:profile.fullName,phone:profile.phone};
 if(canonical(row(JSON.parse(String(after.user_metadata))))!==canonical(expected))throw Error('Unrecognized QA metadata change');
 const inactive=`(SELECT count(*) FROM d1_access_users)=1 AND EXISTS(SELECT 1 FROM d1_access_users WHERE id=?2 AND normalized_email=?3 AND admin_role IS NULL)
 AND (SELECT count(*) FROM d1_auth_accounts)=1
 AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE revoked_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE revoked_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM d1_auth_credential_operations)`;
 const assert=(state:Row)=>({sql:`SELECT CASE WHEN ${inactive} AND EXISTS(SELECT 1 FROM d1_auth_accounts a WHERE ${columns.map(k=>`a.${k} IS json_extract(?1,'$.${k}')`).join(' AND ')}) THEN 1 ELSE json('qa_profile_restore_conflict') END AS matched`,params:[JSON.stringify(state),qa.userId as string,qa.email as string]});
 return {statements:[assert(after),{sql:'UPDATE d1_auth_accounts SET user_metadata=?1,updated_at=?2 WHERE user_id=?3',params:[before.user_metadata as string,before.updated_at as string,qa.userId]},assert(before)],restoredRows:1,credentialAndAuthorityPreserved:true};
}
