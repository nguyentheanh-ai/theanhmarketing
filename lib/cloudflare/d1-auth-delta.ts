import {prepareD1AuthInitialImport,type AuthSourceRow} from '@/lib/cloudflare/d1-auth-import';
import {openLegacyBcryptHash} from '@/lib/cloudflare/legacy-password';
import {authSourceRevision} from '@/lib/cloudflare/auth-source-fingerprint';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
const FIELDS=['id','normalized_email','admin_role','credential_ciphertext','email_confirmed_at','banned_until','deleted_at','is_anonymous','session_version','must_change_password','user_metadata','created_at','updated_at','source_revision','source_digest','source_project_id'] as const;
const FP=`json_array(u.id,u.normalized_email,u.admin_role,a.credential_ciphertext,a.email_confirmed_at,a.banned_until,a.deleted_at,a.is_anonymous,a.session_version,a.must_change_password,a.user_metadata,a.created_at,a.updated_at,v.source_revision,v.source_digest,v.source_project_id)`;
// Refresh EXISTING accounts only. Source export and role resolver are trusted
// backend inputs. This does not mark the whole source snapshot verified.
export async function prepareD1AuthAccountDelta(db:AuthDatabase,source:AuthSourceRow,options:{projectId:string;credentialKey:string;operationId:string;now?:number;resolveRole:(row:AuthSourceRow)=>'owner'|'editor'|null}){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.operationId))throw new Error('Invalid Auth operation');
 const plan=await prepareD1AuthInitialImport([source],options),user=plan.statements[0].params,account=plan.statements[1].params;
 const revision=authSourceRevision(source.updatedAt),payload=String(plan.statements[2].params[2]),uid=String(user[0]);
 const prior=await db.first('SELECT * FROM d1_auth_delta_operations WHERE id=?1',[options.operationId]);
 if(prior){if(prior.source_project_id!==options.projectId||prior.user_id!==uid||prior.source_revision!==revision||prior.payload_digest!==payload||prior.status!=='done')throw new Error('Auth operation conflict');return {statements:[],replay:true,securityChanged:false};}
 const row=await db.first(`SELECT u.id,u.normalized_email,u.admin_role,a.*,v.source_revision,v.source_digest,v.source_project_id
  FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id JOIN d1_auth_source_versions v ON v.user_id=u.id WHERE u.id=?1`,[uid]);
 if(!row||row.source_project_id!==options.projectId||typeof row.source_revision!=='string'||!/^[0-9]{20}$/.test(row.source_revision)||revision<=row.source_revision||!Number.isInteger(row.session_version))throw new Error('Auth source revision is stale or account baseline unavailable');
 const oldHash=typeof row.credential_ciphertext==='string'?await openLegacyBcryptHash(row.credential_ciphertext,options.credentialKey,{projectId:options.projectId,userId:uid}):null;
 const changed=oldHash!==(source.encryptedPassword||null);
 if(!changed)account[1]=row.credential_ciphertext as string|null;
 const securityChanged=changed||row.normalized_email!==user[1]||row.admin_role!==user[2]||row.email_confirmed_at!==account[2]||row.banned_until!==account[3]||row.deleted_at!==account[4]||row.is_anonymous!==account[5]||row.must_change_password!==account[6];
 const fingerprint=JSON.stringify(FIELDS.map(f=>row[f]));const stamp=new Date(options.now??Date.now()).toISOString();
 const op=[options.operationId,options.projectId,uid,revision,payload,stamp,fingerprint];
 const pending=`EXISTS(SELECT 1 FROM d1_auth_delta_operations op WHERE op.id=?1 AND op.source_project_id=?2 AND op.user_id=?3 AND op.source_revision=?4 AND op.payload_digest=?5 AND op.status='pending')`;
 return {replay:false,securityChanged,statements:[
  {sql:`INSERT INTO d1_auth_delta_operations(id,source_project_id,user_id,source_revision,payload_digest,status,created_at)
   SELECT ?1,?2,?3,?4,?5,'pending',?6 FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id JOIN d1_auth_source_versions v ON v.user_id=u.id
   WHERE u.id=?3 AND v.source_project_id=?2 AND v.source_revision<?4 AND ${FP}=?7 ON CONFLICT(id) DO NOTHING`,params:op},
  {sql:`UPDATE d1_auth_sync_state SET status='pending' WHERE source_project_id=?2 AND ${pending}`,params:op.slice(0,5)},
  {sql:`UPDATE d1_auth_accounts SET credential_ciphertext=?6,email_confirmed_at=?7,banned_until=?8,deleted_at=?9,is_anonymous=?10,
   must_change_password=?11,user_metadata=?12,created_at=?13,updated_at=?14,session_version=session_version+?15 WHERE user_id=?3 AND ${pending}`,params:[...op.slice(0,5),...account.slice(1),Number(securityChanged)]},
  {sql:`UPDATE d1_access_users SET normalized_email=?6,admin_role=?7 WHERE id=?3 AND ${pending}`,params:[...op.slice(0,5),user[1],user[2]]},
  {sql:`UPDATE d1_auth_source_versions SET source_revision=?4,source_digest=?5 WHERE user_id=?3 AND ${pending}`,params:op.slice(0,5)},
  {sql:`UPDATE d1_auth_delta_operations SET status='done' WHERE id=?1 AND source_project_id=?2 AND user_id=?3 AND source_revision=?4 AND payload_digest=?5 AND status='pending' RETURNING id`,params:op.slice(0,5)},
 ]};
}
