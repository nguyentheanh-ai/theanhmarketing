// Called only after the explicit native handlers had a chance to respond.
// A native QA session must never fall through to legacy Source mutations,
// including server actions or GET callbacks/jobs. This is not a native port.
type NativeQaBoundaryEnv = {
 CF_NATIVE_AUTH_MODE?:unknown;
 CF_NATIVE_QA_EMAIL_AUTH_MODE?:unknown;
 CF_NATIVE_QA_PAYMENT_MODE?:unknown;
};
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
export function protectNativeQaSourceBoundary(request:Request,env:NativeQaBoundaryEnv):Response|null{
 const url=new URL(request.url);
 if(url.origin!==origin)return null;
 const modes=[env.CF_NATIVE_AUTH_MODE,env.CF_NATIVE_QA_EMAIL_AUTH_MODE,env.CF_NATIVE_QA_PAYMENT_MODE];
 if(!modes.some(value=>value!==undefined&&value!=='disabled'))return null;
 let path:string;try{path=new URL(origin+decodeURIComponent(url.pathname).replaceAll('\\','/').replace(/\/+/g,'/')).pathname.toLowerCase();}catch{path='/api/invalid-path';}
 const legacyMutation=!['GET','HEAD'].includes(request.method);
 const legacyApi=path==='/api'||path.startsWith('/api/');
 const legacyCallback=path==='/auth/callback'||path.startsWith('/auth/callback/');
 if(!legacyMutation&&!legacyApi&&!legacyCallback)return null;
 return Response.json({ok:false,code:'NATIVE_QA_SOURCE_PATH_DISABLED',message:'Chức năng này chưa được chuyển và kiểm thử trên môi trường native.'},{status:503,headers:{'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
}
