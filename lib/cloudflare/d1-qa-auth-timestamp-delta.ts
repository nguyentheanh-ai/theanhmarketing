import {prepareD1AuthInitialImport,type AuthSourceRow} from './d1-auth-import';
import {verifyD1InitialAuthRow,verifyD1QaAuthAfterLogout} from './d1-auth-import-verification';
import {prepareD1AuthAccountDelta} from './d1-auth-delta';
import type {AuthDatabase} from './d1-auth-core';

// Operator-only, one existing QA account. No security/metadata changes allowed.
// A Source sign-in can advance updated_at. It must be synchronized as a real
// revision, never hidden by merely extending the verified-snapshot timestamp.
export async function prepareQaAuthTimestampDelta(source:AuthSourceRow,target:Record<string,unknown>,options:{projectId:string;credentialKey:string;operationId:string},logoutHistory?:Parameters<typeof verifyD1QaAuthAfterLogout>[3]) {
 if(['owner','editor'].includes(String(source.appMetadata?.admin_role)))throw Error('QA administrator denied');
 const opts={...options,resolveRole:()=>null};
 const expected=await prepareD1AuthInitialImport([source],opts);
 const account=expected.statements[1].params,version=expected.statements[2].params;
 const updatedCursor={...target,updated_at:account[9],source_revision:version[1],source_digest:version[2]};
 if(logoutHistory)await verifyD1QaAuthAfterLogout(source,updatedCursor,opts,logoutHistory);
 else await verifyD1InitialAuthRow(source,updatedCursor,opts);
 const localVersion=Number(target.session_version);
 const historySql="SELECT json_group_array(json_object('id',id,'project_id',project_id,'user_id',user_id,'kind',kind,'expected_version',expected_version,'target_version',target_version,'status',status)) FROM (SELECT id,project_id,user_id,kind,expected_version,target_version,status FROM d1_auth_session_security_operations ORDER BY id)";
 const historyGuard=logoutHistory?`(${historySql}) IS ?5`:"?5='null'";
 // Planning adapter answers only the exact reads needed by the delta planner;
 // the returned SQL rechecks all facts inside the real D1 transaction.
 const db:AuthDatabase={
  async first(sql) {
   if(sql==="SELECT name FROM sqlite_master WHERE type='table' AND name='d1_auth_credential_operations'")return {name:'d1_auth_credential_operations'};
   if(sql==="SELECT 1 AS changed FROM d1_auth_credential_operations WHERE user_id=?1 AND project_id=?2 LIMIT 1")return null;
   if(sql==='SELECT * FROM d1_auth_delta_operations WHERE id=?1')return null;
   if(sql.startsWith('SELECT u.id,u.normalized_email,u.admin_role,a.*,v.source_revision'))return target;
   throw Error('Unexpected QA delta read');
  },async batch(){throw Error('QA planner cannot execute');},
 };
 const delta=await prepareD1AuthAccountDelta(db,source,opts);
 if(delta.securityChanged||delta.replay)throw Error('QA timestamp-only delta required');
 const scope=`(SELECT count(*) FROM d1_access_users)=1 AND (SELECT count(*) FROM d1_auth_accounts)=1
  AND (SELECT count(*) FROM d1_auth_source_versions)=1
  AND EXISTS(SELECT 1 FROM d1_access_users WHERE id=?1 AND admin_role IS NULL)
  AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE revoked_at IS NULL OR user_id<>?1 OR project_id<>?2)
  AND NOT EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE revoked_at IS NULL OR user_id<>?1 OR project_id<>?2)
  AND NOT EXISTS(SELECT 1 FROM d1_auth_credential_operations)
  AND NOT EXISTS(SELECT 1 FROM d1_auth_delta_operations WHERE status<>'done')
  AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?1 AND session_version=?4) AND ${historyGuard}`;
 const params=[source.id,options.projectId,options.operationId,localVersion,logoutHistory?JSON.stringify(logoutHistory.operations):'null'];
 return {securityChanged:false,statements:[
  {sql:`SELECT CASE WHEN ${scope} AND NOT EXISTS(SELECT 1 FROM d1_auth_delta_operations WHERE id=?3) THEN 1 ELSE json('qa_timestamp_scope_denied') END AS matched`,params},
  ...delta.statements,
  {sql:`SELECT CASE WHEN ${scope} AND EXISTS(SELECT 1 FROM d1_auth_delta_operations WHERE id=?3 AND user_id=?1 AND source_project_id=?2 AND status='done')
   AND EXISTS(SELECT 1 FROM d1_auth_accounts a JOIN d1_auth_source_versions v ON v.user_id=a.user_id WHERE a.user_id=?1 AND a.session_version=?4 AND a.updated_at=?6 AND v.source_revision=?7 AND v.source_digest=?8)
   THEN 1 ELSE json('qa_timestamp_commit_denied') END AS matched`,params:[...params,account[9],version[1],version[2]]},
 ]};
}
