import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {beginD1GoogleTransaction,claimD1GoogleTransaction,failD1GoogleTransaction,GOOGLE_TRANSACTION_COOKIE,type GoogleTransactionPolicy,type ClaimedGoogleTransaction} from '@/lib/cloudflare/d1-google-transaction';
import {createGoogleIdTokenVerifier} from '@/lib/cloudflare/google-id-token';
import {exchangeGoogleAuthorizationCode} from '@/lib/cloudflare/google-code-exchange';
import {finishD1GoogleSession} from '@/lib/cloudflare/d1-google-session';
import {readBoundedAuthJson,createD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {getPostLoginRedirect} from '@/lib/auth/student-account';
type Options=GoogleTransactionPolicy&{db:AuthDatabase;clientSecret:string;sessionTtlMs:number;
 allowRequest:(request:Request,phase:'start'|'callback')=>Promise<{allowed:boolean;retryAfter:number}>;
 // Backend test injection only; never construct these from HTTP JSON/query.
 fetcher?:typeof fetch;verifyIdToken?:ReturnType<typeof createGoogleIdTokenVerifier>};
const clearFlow=`${GOOGLE_TRANSACTION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
function headers(){return new Headers({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Cookie'});}
function reply(status:number,cookie?:string,retryAfter?:number){const h=headers();h.set('Content-Type','application/json; charset=utf-8');if(cookie)h.append('Set-Cookie',cookie);if(retryAfter)h.set('Retry-After',String(retryAfter));return new Response(JSON.stringify({ok:false,message:'Không thể hoàn tất đăng nhập. Vui lòng thử lại.'}),{status,headers:h});}
function browserToken(request:Request){const values=(request.headers.get('Cookie')??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(GOOGLE_TRANSACTION_COOKIE+'='));if(values.length!==1)return '';const token=values[0].slice(GOOGLE_TRANSACTION_COOKIE.length+1);return /^[A-Za-z0-9_-]{43}$/.test(token)?token:'';}
// Staging candidate only. Before deployment disable/redact invocation URL query
// logging at the platform: OAuth callback contains a one-use authorization code.
export async function handleD1GoogleHttp(request:Request,options:Options){
 const url=new URL(request.url),origin=new URL(options.origin);
 if(origin.protocol!=='https:'||origin.origin!==options.origin)throw new Error('Invalid Google HTTP origin');
 if(url.origin!==options.origin)return reply(403);
 const start=url.pathname==='/api/cloudflare-auth/google/start',callback=url.pathname==='/api/cloudflare-auth/google/callback';
 if(!start&&!callback)return reply(404);
 if((start&&request.method!=='POST')||(callback&&request.method!=='GET'))return reply(405);
 if(start&&(request.headers.get('Origin')!==options.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return reply(403);
 try{const limit=await options.allowRequest(request,start?'start':'callback');if(!limit.allowed)return reply(429,undefined,Math.max(1,Math.ceil(limit.retryAfter)));}catch{return reply(503);}
 // Fail configuration before redirecting a user to a provider that cannot complete.
 if(!options.clientSecret||options.clientSecret.length>4096||!Number.isInteger(options.sessionTtlMs)||options.sessionTtlMs<1000||options.sessionTtlMs>30*86400000)return reply(503);
 if(start){
  let input:Record<string,unknown>;try{input=await readBoundedAuthJson(request);}catch{return reply(400);}
  if(Object.keys(input).some(k=>!['returnTo','rememberLogin'].includes(k))||(input.returnTo!==undefined&&typeof input.returnTo!=='string')||(input.rememberLogin!==undefined&&typeof input.rememberLogin!=='boolean'))return reply(400);
  try{const flow=await beginD1GoogleTransaction(options.db,{returnTo:input.returnTo as string|undefined,rememberLogin:input.rememberLogin as boolean|undefined},options);
   const h=headers();h.set('Location',flow.authorizationUrl);h.append('Set-Cookie',`${GOOGLE_TRANSACTION_COOKIE}=${flow.browserToken}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${Math.floor((options.ttlMs??600000)/1000)}`);return new Response(null,{status:303,headers:h});
  }catch{return reply(503);}
 }
 if(url.search.length>16384||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length>1||url.searchParams.getAll('error').length>1)return reply(400);
 const state=url.searchParams.get('state')??'',cookie=browserToken(request);if(!/^[A-Za-z0-9_-]{43}$/.test(state)||!cookie)return reply(400);
 let tx:ClaimedGoogleTransaction|null=null;
 try{
  tx=await claimD1GoogleTransaction(options.db,{state,browserToken:cookie},options);if(!tx)return reply(400);
  const error=url.searchParams.get('error'),code=url.searchParams.get('code');
  if(error!==null||!code){await failD1GoogleTransaction(options.db,tx,options.now);return reply(401,clearFlow);}
  const token=await exchangeGoogleAuthorizationCode(tx,code,options.clientSecret,options.fetcher);
  const verify=options.verifyIdToken??createGoogleIdTokenVerifier({clientId:options.clientId,projectId:options.projectId});
  const proof=await verify(token,tx.nonce,options.now);if(!proof){await failD1GoogleTransaction(options.db,tx,options.now);return reply(401,clearFlow);}
  const session=await finishD1GoogleSession(options.db,tx,proof,{sessionTtlMs:options.sessionTtlMs,now:options.now});
  if(!session){await failD1GoogleTransaction(options.db,tx,options.now);return reply(401,clearFlow);}
  const h=headers();h.set('Location',getPostLoginRedirect({user_metadata:{must_change_password:session.user.mustChangePassword}},session.returnTo));h.append('Set-Cookie',clearFlow);h.append('Set-Cookie',createD1SessionCookie(session.token,options.sessionTtlMs,session.rememberLogin));
  return new Response(null,{status:303,headers:h});
 }catch{
  if(tx)try{await failD1GoogleTransaction(options.db,tx,options.now);}catch{/* No raw provider/DB error logging. */}
  return reply(503,tx?clearFlow:undefined);
 }
}
