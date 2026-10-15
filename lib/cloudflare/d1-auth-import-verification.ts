import {prepareD1AuthInitialImport,type AuthSourceRow} from '@/lib/cloudflare/d1-auth-import';
import {authSourceDigest} from '@/lib/cloudflare/auth-source-fingerprint';
import {openLegacyBcryptHash} from '@/lib/cloudflare/legacy-password';
// Initial imported account verification only; not a native-session/delta verifier.
// Hash/plaintext identity data stay in process; return no digest or source values.
export async function verifyD1InitialAuthRow(source:AuthSourceRow,target:Record<string,unknown>,options:{projectId:string;credentialKey:string;resolveRole:(row:AuthSourceRow)=>'owner'|'editor'|null}){
 const expected=await prepareD1AuthInitialImport([source],options);
 const user=[target.id,target.normalized_email,target.admin_role];
 const account=[target.user_id,target.credential_ciphertext,target.email_confirmed_at,target.banned_until,target.deleted_at,target.is_anonymous,target.must_change_password,target.user_metadata,target.created_at,target.updated_at];
 if(target.session_version!==1||target.source_project_id!==options.projectId||target.source_revision!==expected.statements[2].params[1]||target.source_digest!==expected.statements[2].params[2])throw new Error('Initial Auth import verification failed');
 let hash:string|null=null;
 if(target.credential_ciphertext!==null){
  if(typeof target.credential_ciphertext!=='string')throw new Error('Initial Auth import verification failed');
  hash=await openLegacyBcryptHash(target.credential_ciphertext,options.credentialKey,{projectId:options.projectId,userId:String(target.user_id)});
 }
 if(hash!==(source.encryptedPassword||null)||await authSourceDigest(user,account,hash)!==expected.statements[2].params[2])throw new Error('Initial Auth import verification failed');
 return {matched:true as const,credentialRoundtrip:true,identityStatusMetadataAndCursorMatched:true};
}

// Explicit QA re-verification after native global logout. This never resets the
// local revocation counter and does not relax the initial-import verifier.
export async function verifyD1QaAuthAfterLogout(source:AuthSourceRow,target:Record<string,unknown>,options:Parameters<typeof verifyD1InitialAuthRow>[2],history:{operations:Record<string,unknown>[];activeSessions:number;activeFamilies:number;credentialOperations:number}){
 const fail=()=>{throw new Error('QA logout history verification failed');};
 const version=target.session_version;
 if(!Number.isSafeInteger(version)||Number(version)<1||Number(version)>10000||history.activeSessions!==0||history.activeFamilies!==0||history.credentialOperations!==0||target.admin_role!==null||options.resolveRole(source)!==null)fail();
 if(!Array.isArray(history.operations)||history.operations.length!==Number(version)-1)fail();
 const ids=new Set<string>(),steps=new Set<number>();
 for(const row of history.operations){
  const from=row.expected_version,to=row.target_version;
  if(typeof row.id!=='string'||!row.id||ids.has(row.id)||row.project_id!==options.projectId||row.user_id!==source.id||row.kind!=='global_logout'||row.status!=='done'||!Number.isSafeInteger(from)||Number(from)<1||Number(from)>=Number(version)||to!==Number(from)+1||steps.has(Number(from)))fail();
  ids.add(String(row.id));steps.add(Number(from));
 }
 const verified=await verifyD1InitialAuthRow(source,{...target,session_version:1},options);
 return {...verified,localSessionVersionPreserved:true,verifiedLogoutCount:history.operations.length};
}
