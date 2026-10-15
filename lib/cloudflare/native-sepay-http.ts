import {settleNativeSepayOrder,NativePaymentDenied,type NativeOrderDatabase} from '@/lib/cloudflare/native-order-settlement';
import type {SepayWebhookPayload} from '@/lib/payments/sepay';
const ORIGIN='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
type Options={db:NativeOrderDatabase;policy:{expectedAccount:string;allowedOrderCodes:readonly string[]};apiKey:string;allowAttempt:()=>Promise<boolean>};
const privacy={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(status:number,message?:string)=>Response.json(status===200?{success:true}:{success:false,message:message??'Không xử lý được webhook.'},{status,headers:privacy});
class PayloadTooLarge extends Error{}
async function authenticate(headers:Headers,secret:string){const raw=headers.get('authorization')??'';if(raw.length>1024)return false;const [scheme,...rest]=raw.trim().split(/\s+/);if(scheme.toLowerCase()!=='apikey'||!rest.length)return false;const received=rest.join(' ');const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));const a=await digest(received),b=await digest(secret);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}
async function readPayload(request:Request){
 const declared=request.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>16384))throw new PayloadTooLarge();
 const reader=request.body?.getReader();if(!reader)throw new SyntaxError();const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16384){await reader.cancel();throw new PayloadTooLarge()}text+=decoder.decode(part.value,{stream:true})}text+=decoder.decode();}finally{reader.releaseLock()}
 const type=request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase();let value:unknown;
 if(type==='application/json')value=JSON.parse(text);
 else{const form=new URLSearchParams(text);if(new Set(form.keys()).size!==Array.from(form.keys()).length)throw new SyntaxError();value=Object.fromEntries(form);}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new SyntaxError();return value as SepayWebhookPayload;
}
// Candidate controller only. The existing public webhook remains unchanged.
// Caller must supply a shared rate limiter and exact operator QA cohort; no
// dev auth bypass, external delivery, scheduler or Source fallback is provided.
export async function handleNativeSepayWebhook(request:Request,options:Options){
 const url=new URL(request.url);if(url.origin!==ORIGIN||url.pathname!=='/api/sepay/webhook')return reply(404);
 if(request.method!=='POST')return new Response(null,{status:405,headers:{...privacy,Allow:'POST'}});
 if(typeof options.apiKey!=='string'||options.apiKey.length<16||options.apiKey.length>512||typeof options.allowAttempt!=='function')return reply(503);
 try{
  if(!await authenticate(request.headers,options.apiKey))return reply(401,'Sai API key SePay.');
  if(!await options.allowAttempt())return new Response(JSON.stringify({success:false,message:'Vui lòng thử lại sau.'}),{status:429,headers:{...privacy,'Content-Type':'application/json','Retry-After':'60'}});
  const type=request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase();if(!['application/json','application/x-www-form-urlencoded'].includes(type??''))return reply(415);
  let payload:SepayWebhookPayload;try{payload=await readPayload(request)}catch(error){return error instanceof PayloadTooLarge?reply(413):reply(400,'Payload webhook không hợp lệ.')}
  await settleNativeSepayOrder(options.db,payload,options.policy);return reply(200);
 }catch(error){return error instanceof NativePaymentDenied?reply(422):reply(503);}
}
