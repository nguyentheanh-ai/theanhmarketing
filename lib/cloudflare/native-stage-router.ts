import type {InferEnv,UnwrapConfig} from 'cf/config';
import type config from '@/cloudflare.config';
import {createD1AuthDatabase} from '@/lib/cloudflare/d1-auth-database';
import {handleD1PasswordChangeHttp} from '@/lib/cloudflare/d1-password-change-http';
import {handleD1AuthHttp} from '@/lib/cloudflare/d1-auth-http';
import {handleD1StudentHttp} from '@/lib/cloudflare/d1-student-http';
import {consumeD1AuthAttempt} from '@/lib/cloudflare/d1-auth-rate-limit';
import {resolveD1ProgressLesson} from '@/lib/cloudflare/d1-progress-publication';
type WorkerConfig=UnwrapConfig<UnwrapConfig<typeof config>['worker']>;
export type NativeStageEnv=Pick<InferEnv<WorkerConfig>,'CF_NATIVE_AUTH_MODE'|'CF_NATIVE_AUTH_ORIGIN'|'CF_NATIVE_QA_USERS'|'CF_NATIVE_QA_PROGRESS_MODE'|'NATIVE_AUTH_DB'|'NATIVE_AUTH_CREDENTIAL_KEY'|'NATIVE_AUTH_LIMITER_KEY'|'PRIVATE_ASSETS'|'R2_PRIVATE_URL_SECRET'> & Partial<Pick<InferEnv<WorkerConfig>,'STUDENT_PORTAL_PROVISION_SECRET'|'CF_NATIVE_QA_CREDENTIAL_WRITES'>>;
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
function unavailable(code='NATIVE_D1_DISABLED'){return Response.json({ok:false,code},{status:503,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});}
export function resolveNativeStageOptions(request:Request,env:NativeStageEnv){
 if((env.CF_NATIVE_AUTH_MODE as string)!=='qa')return null;
 if(env.CF_NATIVE_AUTH_ORIGIN!==origin||new URL(request.url).origin!==origin)throw new Error('STAGING_ORIGIN_REQUIRED');
  const cohort:unknown=JSON.parse(env.CF_NATIVE_QA_USERS);
  if(!Array.isArray(cohort)||!cohort.length||cohort.length>100||cohort.some(id=>typeof id!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(id))||new Set(cohort).size!==cohort.length)throw new Error('QA_CONFIG_REQUIRED');
  if(!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_CREDENTIAL_KEY??'')||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_LIMITER_KEY??''))throw new Error('NATIVE_SECRET_REQUIRED');
  const db=createD1AuthDatabase(env.NATIVE_AUTH_DB),sessionTtlMs=3600000;
  return {db,origin,sessionTtlMs,allowedUserIds:cohort as string[]};
}
// Staging A only. Disabled mode preserves the existing Supabase path.
// Google broker stays unmounted until provider callback/logging gates pass.
export async function handleNativeStageRequest(request:Request,env:NativeStageEnv):Promise<Response|null>{
 const url=new URL(request.url),auth=url.pathname.startsWith('/api/cloudflare-auth/'),student=url.pathname.startsWith('/api/cloudflare-student/');
 if(!auth&&!student)return null;
 const mode:string=env.CF_NATIVE_AUTH_MODE;
 if(mode!=='qa')return unavailable();
 if(env.CF_NATIVE_AUTH_ORIGIN!==origin||url.origin!==origin)return unavailable('STAGING_ORIGIN_REQUIRED');
 try{
  const options=resolveNativeStageOptions(request,env);if(!options)return unavailable();
  const {db,sessionTtlMs,allowedUserIds:cohort}=options;
  if(auth&&url.pathname==='/api/cloudflare-auth/change-password')return handleD1PasswordChangeHttp(request,{db,origin,projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:env.NATIVE_AUTH_CREDENTIAL_KEY,sessionTtlMs,allowedUserIds:cohort,writeEnabled:(env.CF_NATIVE_QA_CREDENTIAL_WRITES as string)==='qa',
   allowAttempt:async(req,subject)=>{const ip=req.headers.get('CF-Connecting-IP');if(!ip)throw Error('Trusted edge required');return consumeD1AuthAttempt(db,{projectId:'vsxxgdzwtscuxcmjfckt',ip,email:subject},{secret:env.NATIVE_AUTH_LIMITER_KEY,ip:{limit:10,windowMs:60000},email:{limit:5,windowMs:60000}})}});
  if(auth)return handleD1AuthHttp(request,{db,origin,projectId:'vsxxgdzwtscuxcmjfckt',credentialKey:env.NATIVE_AUTH_CREDENTIAL_KEY,sessionTtlMs,allowedUserIds:cohort,
   allowAttempt:async(req,email)=>{const ip=req.headers.get('CF-Connecting-IP');if(!ip)throw new Error('Trusted edge required');return consumeD1AuthAttempt(db,{projectId:'vsxxgdzwtscuxcmjfckt',ip,email},{secret:env.NATIVE_AUTH_LIMITER_KEY,ip:{limit:10,windowMs:60000},email:{limit:5,windowMs:60000}})}});
  // The default remains read-only. This switch permits only the same backend
  // QA identity cohort, and every write must recheck a verified content receipt.
  const qaProgress=(env.CF_NATIVE_QA_PROGRESS_MODE as string)==='qa';
  return handleD1StudentHttp(request,{db,origin,sessionTtlMs,allowedUserIds:cohort,
   ...(qaProgress?{qaWriteUserIds:cohort,requirePublicationProof:true,resolveLesson:(slug:string,id:string)=>resolveD1ProgressLesson(db,slug,id)}:{})});
 }catch{return unavailable('NATIVE_CONFIG_UNAVAILABLE');}
}
