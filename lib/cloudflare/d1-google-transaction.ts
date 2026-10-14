import {EncryptJWT,jwtDecrypt,base64url} from 'jose';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady} from '@/lib/cloudflare/d1-auth-authority';
import {getSafeNextPath} from '@/lib/navigation';
export const GOOGLE_TRANSACTION_COOKIE='__Host-tam-google-flow';
export type GoogleTransactionPolicy={projectId:string;clientId:string;origin:string;transactionKey:string;now?:number;ttlMs?:number};
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const claimProof=Symbol('claimed-google-transaction');
export type ClaimedGoogleTransaction=Readonly<{stateHash:string;browserHash:string;nonce:string;verifier:string;projectId:string;clientId:string;redirectUri:string;returnTo:string;rememberLogin:boolean;[claimProof]:true}>;
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
 const p=policy(options);await assertD1AuthMirrorReady(db,{projectId:options.projectId,now:p.time});
 const state=opaque(),browserToken=opaque(),verifier=opaque(),nonce=opaque();
 const stateHash=(await hash(state)).hex,browserHash=(await hash(browserToken)).hex,challenge=(await hash(verifier)).base64;
 const returnTo=getSafeNextPath(input.returnTo,'/dashboard');
 const ciphertext=await new EncryptJWT({stateHash,browserHash,verifier,nonce,clientId:options.clientId,redirectUri:p.redirectUri,returnTo,rememberLogin:input.rememberLogin===true})
  .setProtectedHeader({alg:'dir',enc:'A256GCM',typ:'tam-google-transaction+jwt'}).setIssuer('tam-google-transaction').setAudience(options.projectId).setSubject(stateHash).setIssuedAt(Math.floor(p.time/1000)).setExpirationTime(Math.floor((p.time+p.ttl)/1000)).encrypt(p.key);
 await db.batch([{sql:`INSERT INTO d1_oauth_transactions(state_hash,source_project_id,provider,browser_hash,verifier_ciphertext,created_at,expires_at,status)
 VALUES(?1,?2,'google',?3,?4,?5,?6,'pending')`,params:[stateHash,options.projectId,browserHash,ciphertext,new Date(p.time).toISOString(),new Date(p.time+p.ttl).toISOString()]}]);
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [key,value] of Object.entries({client_id:options.clientId,redirect_uri:p.redirectUri,response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}))url.searchParams.set(key,value);
 return {authorizationUrl:url.toString(),browserToken,expiresAt:new Date(p.time+p.ttl).toISOString()};
}
// Claim atomically BEFORE provider code exchange. A timeout/malformed response
// consumes the flow; start a new OAuth flow, never replay the authorization code.
export async function claimD1GoogleTransaction(db:AuthDatabase,input:{state:string;browserToken:string},options:GoogleTransactionPolicy):Promise<ClaimedGoogleTransaction|null>{
 const p=policy(options);if(!TOKEN.test(input.state)||!TOKEN.test(input.browserToken))return null;
 await assertD1AuthMirrorReady(db,{projectId:options.projectId,now:p.time});
 const stateHash=(await hash(input.state)).hex,browserHash=(await hash(input.browserToken)).hex;
 const rows=await db.batch([{sql:`UPDATE d1_oauth_transactions SET status='claimed',claimed_at=?4
 WHERE state_hash=?1 AND source_project_id=?2 AND provider='google' AND browser_hash=?3 AND status='pending'
 AND julianday(expires_at)>julianday(?4) RETURNING verifier_ciphertext`,params:[stateHash,options.projectId,browserHash,new Date(p.time).toISOString()]}]);
 const envelope=rows[0]?.results?.[0]?.verifier_ciphertext;if(typeof envelope!=='string')return null;
 try{
  const {payload,protectedHeader}=await jwtDecrypt(envelope,p.key,{issuer:'tam-google-transaction',audience:options.projectId,subject:stateHash,keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM'],currentDate:new Date(p.time),clockTolerance:0,requiredClaims:['iat','exp','iss','aud','sub']});
  if(protectedHeader.typ!=='tam-google-transaction+jwt'||payload.stateHash!==stateHash||payload.browserHash!==browserHash||payload.clientId!==options.clientId||payload.redirectUri!==p.redirectUri||typeof payload.nonce!=='string'||!TOKEN.test(payload.nonce)||typeof payload.verifier!=='string'||!TOKEN.test(payload.verifier)||typeof payload.returnTo!=='string'||getSafeNextPath(payload.returnTo,'/dashboard')!==payload.returnTo||typeof payload.rememberLogin!=='boolean')throw new Error();
  return Object.freeze({stateHash,browserHash,nonce:payload.nonce,verifier:payload.verifier,projectId:options.projectId,clientId:options.clientId,redirectUri:p.redirectUri,returnTo:payload.returnTo,rememberLogin:payload.rememberLogin,[claimProof]:true as const});
 }catch{
  await db.batch([{sql:"UPDATE d1_oauth_transactions SET status='failed',completed_at=?3 WHERE state_hash=?1 AND source_project_id=?2 AND status='claimed'",params:[stateHash,options.projectId,new Date(p.time).toISOString()]}]);return null;
 }
}
export function requireClaimedGoogleTransaction(transaction:ClaimedGoogleTransaction){
 if(!transaction||transaction[claimProof]!==true)throw new Error('Claimed Google transaction required');return transaction;
}
