// Public path validation only; safe to import from client components.
const APP_ORIGIN='https://theanh-student-cf-staging.12c1thdtheanh.workers.dev';
export function getSafeNativeAppBridgePath(value:string|null|undefined){
 if(typeof value!=='string'||value.length>2048||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20]/.test(value))return null;
 try{const url=new URL(value,'https://native-return.invalid');if(url.origin!=='https://native-return.invalid'||url.pathname!=='/app-login-bridge'||url.hash||Array.from(url.searchParams.keys()).sort().join(',')!=='native_state,origin'||url.searchParams.get('origin')!==APP_ORIGIN)return null;
 const state=url.searchParams.get('native_state');if(!state||!/^[-_A-Za-z0-9]{42}[AEIMQUYcgkosw048]$/.test(state))return null;
 return '/app-login-bridge?'+new URLSearchParams({origin:APP_ORIGIN,native_state:state});}catch{return null;}
}
// Account-password page may wrap the same bridge as a guest return. Keep this
// one explicit wrapper; do not relax general redirects or accept reset tokens.
export function getSafeNativeAuthReturnPath(value:string|null|undefined){
 const direct=getSafeNativeAppBridgePath(value);if(direct)return direct;
 if(typeof value!=='string'||value.length>4096||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20]/.test(value))return null;
 try{const url=new URL(value,'https://native-return.invalid');if(url.origin!=='https://native-return.invalid'||url.pathname!=='/doi-mat-khau'||url.hash||Array.from(url.searchParams.keys()).sort().join(',')!=='mode,next'||url.searchParams.get('mode')!=='account')return null;
 const next=getSafeNativeAppBridgePath(url.searchParams.get('next'));return next?'/doi-mat-khau?'+new URLSearchParams({mode:'account',next}):null;}catch{return null;}
}
