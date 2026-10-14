import { createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey } from 'jose';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import type { AuthDatabase } from '@/lib/cloudflare/d1-auth-core';
const proof=Symbol('verified-google-id-token');
export type VerifiedGoogleSubject=Readonly<{provider:'google';subject:string;clientId:string;projectId:string;nonce:string;[proof]:true}>;
// Public signing keys only, fixed Google origin. No user-supplied URL or key.
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:600000});
export function createGoogleIdTokenVerifier(config:{clientId:string;projectId:string},trustedKeys:JWTVerifyGetKey=googleKeys){
 if(!config.clientId.endsWith('.apps.googleusercontent.com')||config.clientId.length>512||!/^[a-z0-9]{20}$/.test(config.projectId))throw new Error('Invalid Google OIDC policy');
 // trustedKeys override is solely for backend fixture tests, never HTTP input.
 return async(token:string,expectedNonce:string,now=Date.now()):Promise<VerifiedGoogleSubject|null>=>{
  if(typeof token!=='string'||token.length>16384||!/^[A-Za-z0-9_-]{43}$/.test(expectedNonce)||!Number.isFinite(now))return null;
  try{
   const {payload}=await jwtVerify(token,trustedKeys,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:config.clientId,
    requiredClaims:['iss','aud','sub','iat','exp','nonce'],currentDate:new Date(now),clockTolerance:0});
   if(typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||!/^[\x21-\x7e]+$/.test(payload.sub)||payload.nonce!==expectedNonce||typeof payload.iat!=='number'||payload.iat>now/1000||payload.exp===undefined||payload.exp<=payload.iat||(payload.azp!==undefined&&payload.azp!==config.clientId)||(Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==config.clientId))return null;
   return Object.freeze({provider:'google',subject:payload.sub,clientId:config.clientId,projectId:config.projectId,nonce:expectedNonce,[proof]:true as const});
  }catch{return null;}
 };
}
// Lookup only. Callback must consume nonce/state once, enforce PKCE, and issue
// a guarded D1 session separately. This function never links/registers users.
export async function lookupD1VerifiedGoogleSubject(db:AuthDatabase,subject:VerifiedGoogleSubject,now=Date.now()){
 if(!subject||subject[proof]!==true||!Number.isFinite(now))throw new Error('Verified Google token required');
 const mirror=await assertD1AuthMirrorReady(db,{projectId:subject.projectId,now});
 const row=await db.first(`SELECT u.id,u.normalized_email,u.admin_role,a.session_version,a.must_change_password,i.id AS identity_id
  FROM d1_auth_provider_identities i JOIN d1_access_users u ON u.id=i.user_id JOIN d1_auth_accounts a ON a.user_id=u.id
  WHERE i.provider='google' AND i.provider_id=?1 AND i.source_project_id=?3
  AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2)
  AND a.deleted_at IS NULL AND a.is_anonymous=0 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2)) AND ${authMirrorReadySql(3,4)}`,[subject.subject,new Date(now).toISOString(),subject.projectId,mirror.floor]);
 if(!row){await assertD1AuthMirrorReady(db,{projectId:subject.projectId,now});return null;}
 if(typeof row.id!=='string'||typeof row.normalized_email!=='string'||typeof row.identity_id!=='string'||!Number.isInteger(row.session_version)||Number(row.session_version)<1)throw new Error('Google identity projection unavailable');
 return {id:row.id,email:row.normalized_email,identityId:row.identity_id,sessionVersion:Number(row.session_version),adminRole:row.admin_role==='owner'||row.admin_role==='editor'?row.admin_role:null,mustChangePassword:row.must_change_password===1};
}
