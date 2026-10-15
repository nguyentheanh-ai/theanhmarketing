import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {resolveNativeStageOptions,type NativeStageEnv} from '@/lib/cloudflare/native-stage-router';
export const NATIVE_APP_MAIN_ORIGIN='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
export const NATIVE_APP_B_ORIGIN='https://theanh-student-cf-staging.12c1thdtheanh.workers.dev';
const endpoint=NATIVE_APP_B_ORIGIN+'/api/auth/native-b/issue',project='vsxxgdzwtscuxcmjfckt';
type Options={db:AuthDatabase;sessionTtlMs:number;allowedUserIds:readonly string[];sharedSecret:string;accessHeaders?:Record<string,string>;fetcher?:typeof fetch};
const privacy={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
function unavailable(status=503,code='NATIVE_APP_SIGN_IN_UNAVAILABLE'){return Response.json({ok:false,code},{status,headers:privacy});}
function redirect(url:string){return new Response(null,{status:303,headers:{...privacy,Location:url}});}
function validToken(value:unknown):value is string {if(typeof value!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value))return false;try{return btoa(atob(value.replaceAll('-','+').replaceAll('_','/')+'=')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')===value;}catch{return false;}}
async function boundedResponse(response:Response){
 if(response.status!==200||response.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')throw Error('Invalid bridge response');
 const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>8192))throw Error('Invalid bridge response');
 const reader=response.body?.getReader();if(!reader)throw Error('Invalid bridge response');let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();throw Error('Invalid bridge response');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();return JSON.parse(text) as unknown;}finally{reader.releaseLock();}
}
export async function handleNativeAppLoginBridge(request:Request,options:Options){
 const url=new URL(request.url),state=url.searchParams.get('native_state');
 if(url.origin!==NATIVE_APP_MAIN_ORIGIN||url.pathname!=='/app-login-bridge'||request.method!=='GET'||Array.from(url.searchParams.keys()).sort().join(',')!=='native_state,origin'||url.searchParams.get('origin')!==NATIVE_APP_B_ORIGIN||!validToken(state))return unavailable(400,'INVALID_NATIVE_APP_REQUEST');
 if(typeof options.sharedSecret!=='string'||options.sharedSecret.length<32||options.sharedSecret.length>512||!Array.isArray(options.allowedUserIds)||!options.allowedUserIds.length)return unavailable();
 try{
  const policy={projectId:project,sessionTtlMs:options.sessionTtlMs,allowedUserIds:options.allowedUserIds};
  const token=readD1SessionCookie(request),session=await getD1AuthSession(options.db,token,policy);
  if(!session){const next='/app-login-bridge?'+new URLSearchParams({origin:NATIVE_APP_B_ORIGIN,native_state:state});return redirect(NATIVE_APP_MAIN_ORIGIN+'/dang-nhap?'+new URLSearchParams({next}));}
  if(session.user.mustChangePassword)return unavailable(403,'NATIVE_PASSWORD_CHANGE_REQUIRED');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(session.user.id)||session.user.email.length>254||!/^[^\s@]+@[^\s@]+$/.test(session.user.email))return unavailable();
  const access=options.accessHeaders??{};
  if(Object.keys(access).some(k=>!['CF-Access-Client-Id','CF-Access-Client-Secret'].includes(k))||Object.keys(access).length===1)return unavailable();
  // A verified D1 identity is the only source of these claims. No user/role or
  // target URL is copied from request JSON, headers or a browser form.
  const response=await(options.fetcher??fetch)(endpoint,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store',headers:{'content-type':'application/json','x-student-portal-secret':options.sharedSecret,...access},body:JSON.stringify({sourceUserId:session.user.id,email:session.user.email,state})});
  const payload=await boundedResponse(response);
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||(payload as Record<string,unknown>).ok!==true||typeof(payload as Record<string,unknown>).loginUrl!=='string')return unavailable();
  const target=new URL((payload as {loginUrl:string}).loginUrl),fragment=new URLSearchParams(target.hash.slice(1));
  if(target.origin!==NATIVE_APP_B_ORIGIN||target.username||target.password||target.pathname!=='/api/auth/native-b/callback'||target.search||Array.from(fragment.keys()).sort().join(',')!=='code,state'||fragment.get('state')!==state||!validToken(fragment.get('code')))return unavailable();
  const current=await getD1AuthSession(options.db,token,policy);
  if(!current||current.user.id!==session.user.id||current.user.email!==session.user.email||current.user.mustChangePassword)return unavailable();
  return redirect(target.toString());
 }catch{
  // Raw errors may contain an active grant URL or credential-bearing response.
  return unavailable();
 }
}
export function nativeAppAccessHeaders(env:Pick<NativeStageEnv,'CF_ACCESS_STUDENT_APP_CLIENT_ID'|'CF_ACCESS_STUDENT_APP_CLIENT_SECRET'>):Record<string,string>{
 const id=env.CF_ACCESS_STUDENT_APP_CLIENT_ID?.trim(),secret=env.CF_ACCESS_STUDENT_APP_CLIENT_SECRET?.trim();
 if(!id&&!secret)return {};
 if(!id||!secret||id.length>512||secret.length>512||/[\r\n]/.test(id+secret))throw Error('Invalid staging Access bindings');
 return {'CF-Access-Client-Id':id,'CF-Access-Client-Secret':secret};
}
// Worker boundary: never render a credential-bearing redirect through RSC/app
// layouts/trackers, and never fall back to Supabase after native selection.
export async function handleNativeAppBridgeRequest(request:Request,env:NativeStageEnv):Promise<Response|null>{
 const url=new URL(request.url);if(url.pathname!=='/app-login-bridge'||!url.searchParams.has('native_state'))return null;
 try{
  const options=resolveNativeStageOptions(request,env);if(!options)return unavailable();
  return handleNativeAppLoginBridge(request,{...options,sharedSecret:env.STUDENT_PORTAL_PROVISION_SECRET??'',accessHeaders:nativeAppAccessHeaders(env)});
 }catch{return unavailable();}
}
