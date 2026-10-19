import type {AuthorityHandoff} from './d1-data-authority';
import {createD1AuthDatabase} from './d1-auth-database';
import {consumeD1AuthAttempt} from './d1-auth-rate-limit';
import {handleNativeCheckoutHttp} from './native-checkout-http';
import {createNativeCheckoutSideEffects} from './native-checkout-side-effects';
import {createResendSender} from './native-paid-email';
import {dispatchNativePaymentReminders,expireNativePendingOrders} from './native-payment-reminders';
import {createOrderDatabase,type NativePaymentStageEnv} from './native-payment-stage';

export type NativeCheckoutStageEnv=NativePaymentStageEnv&{CF_NATIVE_QA_CHECKOUT_MODE?:string;NATIVE_SEPAY_BANK_CODE?:string;NATIVE_SEPAY_ACCOUNT_NAME?:string};
const ORIGIN='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev',PATH='/api/cloudflare-checkout/orders';
const unavailable=()=>Response.json({ok:false,code:'NATIVE_CHECKOUT_DISABLED'},{status:503,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function authority(env:NativeCheckoutStageEnv){try{return env.NATIVE_AUTH_AUTHORITY?JSON.parse(env.NATIVE_AUTH_AUTHORITY) as AuthorityHandoff:null}catch{return null}}
const enabled=(env:NativeCheckoutStageEnv)=>(env.CF_NATIVE_QA_CHECKOUT_MODE??'disabled')==='qa';

// Staging A only, default disabled. Writes succeed only after the D1 data
// authority row is native (writer switch); before that every attempt is 503.
export async function handleNativeCheckoutStage(request:Request,env:NativeCheckoutStageEnv,waitUntil?:(task:Promise<unknown>)=>void):Promise<Response|null>{
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 if(!enabled(env)||url.origin!==ORIGIN||!waitUntil)return unavailable();
 const nativeAuthority=authority(env);
 if(!nativeAuthority||!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_LIMITER_KEY??'')||!/^\d{6,20}$/.test(env.NATIVE_SEPAY_ACCOUNT??'')||!/^[A-Za-z0-9]{2,20}$/.test(env.NATIVE_SEPAY_BANK_CODE??''))return unavailable();
 const limiter=createD1AuthDatabase(env.NATIVE_AUTH_DB);
 return handleNativeCheckoutHttp(request,{db:createOrderDatabase(env.NATIVE_AUTH_DB),nativeAuthority,
  sepay:{bankCode:env.NATIVE_SEPAY_BANK_CODE!,bankAccountNumber:env.NATIVE_SEPAY_ACCOUNT!,bankAccountName:env.NATIVE_SEPAY_ACCOUNT_NAME},
  // Source limit: 12 orders per 10 minutes per client IP.
  allowAttempt:async req=>{const ip=req.headers.get('CF-Connecting-IP');if(!ip)return false;return (await consumeD1AuthAttempt(limiter,{projectId:'vsxxgdzwtscuxcmjfckt',ip,email:'checkout@native.invalid'},{secret:env.NATIVE_AUTH_LIMITER_KEY,ip:{limit:12,windowMs:600000},email:{limit:100000,windowMs:600000}})).allowed;},
  afterCreate:createNativeCheckoutSideEffects(),waitUntil});
}

// Scheduled companion (every 5 min): expire overdue orders, then drain the
// morning reminder queue. Never runs unless the checkout stage is enabled.
export async function runNativeCheckoutCron(env:NativeCheckoutStageEnv,now=Date.now()){
 if(!enabled(env))return {status:'disabled' as const};
 const nativeAuthority=authority(env);if(!nativeAuthority||!env.NATIVE_RESEND_API_KEY)return {status:'unconfigured' as const};
 const db=createOrderDatabase(env.NATIVE_AUTH_DB);
 const expired=await expireNativePendingOrders(db,nativeAuthority,now).catch(()=>null);
 const reminders=await dispatchNativePaymentReminders(db,{authority:nativeAuthority,send:createResendSender(env.NATIVE_RESEND_API_KEY)}).catch(()=>null);
 return {status:'ran' as const,expired:expired?.length??null,reminders};
}
