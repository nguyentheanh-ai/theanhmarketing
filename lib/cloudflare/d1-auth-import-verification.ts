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
