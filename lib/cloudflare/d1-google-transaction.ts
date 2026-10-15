import {EncryptJWT,jwtDecrypt,base64url} from 'jose';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {authProofDigest,authAuthorityContext,type AuthAuthorityPolicy} from '@/lib/cloudflare/auth-proof-domain';
import {getSafeNextPath} from '@/lib/navigation';
export const GOOGLE_TRANSACTION_COOKIE='__Host-tam-google-flow';
export type GoogleTransactionPolicy=AuthAuthorityPolicy&{allowedUserIds?:readonly string[];clientId:string;origin:string;transactionKey:string;now?:number;ttlMs?:number};
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const claimProof=Symbol('claimed-google-transaction');
export type ClaimedGoogleTransaction=Readonly<{stateHash:string;browserHash:string;nonce:string;verifier:string;projectId:string;clientId:string;redirectUri:string;returnTo:string;rememberLogin:boolean;authorityContext:string|null;[claimProof]:true}>;
function policy(options:GoogleTransactionPolicy){
 const time=options.now??Date.now(),ttl=options.ttlMs??600000,origin=new URL(options.origin);
 if(!/^[a-z0-9]{20}$/.test(options.projectId)||!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(options.clientId)||origin.protocol!=='https:'||origin.origin!==options.origin||!TOKEN.test(options.transactionKey)||!Number.isFinite(time)||!Number.isInteger(ttl)||ttl<60000||ttl>600000)throw new Error('Invalid Google transaction policy');
 const key=base64url.decode(options.transactionKey);if(key.byteLength!==32)throw new Error('Google transaction key unavailable');
 return {time,ttl,key,redirectUri:options.origin+'/api/cloudflare-auth/google/callback'};
}
function opaque(){return base64url.encode(crypto.getRandomValues(new Uint8Array(32)));}
async function hash(value:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return {hex:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),base64:base64url.encode(bytes)};}
// Backend only. HTTP adapter must enforce exact Origin/CSRF and shared limiter
// before calling; only Set-Cookie browserToken, never serialize it into JSON.
export async function beginD1GoogleTransaction(db:AuthDatabase,input:{returnTo?:string;rememberLogin?:boolean},options:GoogleTransactionPolicy){
 const p=policy(options),mirror=await assertD1AuthMirrorReady(db,{...options,now:p.time});
 const state=opaque(),browserToken=opaque(),verifier=opaque(),nonce=opaque();
 const stateHash=await authProofDigest(state,options),browserHash=await authProofDigest(browserToken,options),challenge=(await hash(verifier)).base64;
 const returnTo=getSafeNextPath(input.returnTo,'/dashboard');
 const ciphertext=await new EncryptJWT({stateHash,browserHash,verifier,nonce,authorityContext:authAuthorityContext(options),clientId:options.clientId,redirectUri:p.redirectUri,returnTo,rememberLogin:input.rememberLogin===true})
  .setProtectedHeader({alg:'dir',enc:'A256GCM',typ:'tam-google-transaction+jwt'}).setIssuer('tam-google-transaction').setAudience(options.projectId).setSubject(stateHash).setIssuedAt(Math.floor(p.time/1000)).setExpirationTime(Math.floor((p.time+p.ttl)/1000)).encrypt(p.key);
 const parameters=[stateHash,options.projectId,browserHash,ciphertext,mirror.stamp,new Date(p.time+p.ttl).toISOString(),mirror.floor];
 const ready=authMirrorReadySql(2,7,5,options.nativeAuthority);
 const created=await db.batch([{sql:`INSERT INTO d1_oauth_transactions(state_hash,source_project_id,provider,browser_hash,verifier_ciphertext,created_at,expires_at,status)
 SELECT ?1,?2,'google',?3,?4,?5,?6,'pending' WHERE ${ready}`,params:parameters},
 {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_oauth_transactions WHERE state_hash=?1 AND source_project_id=?2 AND browser_hash=?3 AND verifier_ciphertext=?4 AND created_at=?5 AND expires_at=?6 AND status='pending') AND ${ready} THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params:parameters}]);
 if(created.at(-1)?.results?.[0]?.valid!==1)throw new Error('Google transaction authority unavailable');
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [key,value] of Object.entries({client_id:options.clientId,redirect_uri:p.redirectUri,response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}))url.searchParams.set(key,value);
 return {authorizationUrl:url.toString(),browserToken,expiresAt:new Date(p.time+p.ttl).toISOString()};
}
// Claim atomically BEFORE provider code exchange. A timeout/malformed response
// consumes the flow; start a new OAuth flow, never replay the authorization code.
export async function claimD1GoogleTransaction(db:AuthDatabase,input:{state:string;browserToken:string},options:GoogleTransactionPolicy):Promise<ClaimedGoogleTransaction|null>{
 const p=policy(options);if(!TOKEN.test(input.state)||!TOKEN.test(input.browserToken))return null;
 const mirror=await assertD1AuthMirrorReady(db,{...options,now:p.time});
 const stateHash=await authProofDigest(input.state,options),browserHash=await authProofDigest(input.browserToken,options);
 const parameters=[stateHash,options.projectId,browserHash,new Date(p.time).toISOString(),mirror.floor],ready=authMirrorReadySql(2,5,4,options.nativeAuthority);
 const rows=await db.batch([{sql:`UPDATE d1_oauth_transactions SET status='claimed',claimed_at=?4
 WHERE state_hash=?1 AND source_project_id=?2 AND provider='google' AND browser_hash=?3 AND status='pending'
 AND julianday(created_at)<=julianday(?4) AND julianday(expires_at)>julianday(?4) AND ${ready} RETURNING verifier_ciphertext`,params:parameters},
 {sql:`SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM d1_oauth_transactions WHERE state_hash=?1 AND source_project_id=?2 AND browser_hash=?3 AND status='claimed' AND claimed_at=?4) OR ${ready} THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params:parameters}]);
 const envelope=rows[0]?.results?.[0]?.verifier_ciphertext;if(typeof envelope!=='string')return null;
 try{
  const {payload,protectedHeader}=await jwtDecrypt(envelope,p.key,{issuer:'tam-google-transaction',audience:options.projectId,subject:stateHash,keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM'],currentDate:new Date(p.time),clockTolerance:0,requiredClaims:['iat','exp','iss','aud','sub']});
  if(payload.authorityContext!==authAuthorityContext(options)||protectedHeader.typ!=='tam-google-transaction+jwt'||payload.stateHash!==stateHash||payload.browserHash!==browserHash||payload.clientId!==options.clientId||payload.redirectUri!==p.redirectUri||typeof payload.nonce!=='string'||!TOKEN.test(payload.nonce)||typeof payload.verifier!=='string'||!TOKEN.test(payload.verifier)||typeof payload.returnTo!=='string'||getSafeNextPath(payload.returnTo,'/dashboard')!==payload.returnTo||typeof payload.rememberLogin!=='boolean')throw new Error();
  return Object.freeze({stateHash,browserHash,nonce:payload.nonce,verifier:payload.verifier,projectId:options.projectId,clientId:options.clientId,redirectUri:p.redirectUri,returnTo:payload.returnTo,rememberLogin:payload.rememberLogin,authorityContext:authAuthorityContext(options),[claimProof]:true as const});
 }catch{
  await db.batch([{sql:"UPDATE d1_oauth_transactions SET status='failed',completed_at=?3 WHERE state_hash=?1 AND source_project_id=?2 AND status='claimed'",params:[stateHash,options.projectId,new Date(p.time).toISOString()]}]);return null;
 }
}
export function requireClaimedGoogleTransaction(transaction:ClaimedGoogleTransaction){
 if(!transaction||transaction[claimProof]!==true)throw new Error('Claimed Google transaction required');return transaction;
}
export async function failD1GoogleTransaction(db:AuthDatabase,transaction:ClaimedGoogleTransaction,now=Date.now()){
 const tx=requireClaimedGoogleTransaction(transaction);
 await db.batch([{sql:"UPDATE d1_oauth_transactions SET status='failed',completed_at=?3 WHERE state_hash=?1 AND source_project_id=?2 AND browser_hash=?4 AND status='claimed'",params:[tx.stateHash,tx.projectId,new Date(now).toISOString(),tx.browserHash]}]);
}
