import type {NativeStageEnv} from '@/lib/cloudflare/native-stage-router';

const stagingOrigin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
// Apply at the Worker response boundary, including HTML, RSC and redirects.
// Preserve the stream and existing Vary/Set-Cookie headers without buffering.
export function protectNativeLearningResponse(request:Request,env:NativeStageEnv,response:Response){
 const url=new URL(request.url);
 const learning=url.pathname==='/learn'||url.pathname.startsWith('/learn/')||url.pathname==='/dang-nhap'||url.pathname==='/thu-vien/facebook-ads'||url.pathname==='/thu-vien/facebook-ads/pdf'||url.pathname==='/dashboard/agents'||url.pathname.startsWith('/dashboard/agents/');
 if((env.CF_NATIVE_AUTH_MODE as string)!=='qa'||env.CF_NATIVE_AUTH_ORIGIN!==stagingOrigin||url.origin!==stagingOrigin||!learning)return response;
 const headers=new Headers(response.headers);
 headers.set('Cache-Control','private, no-store');
 headers.set('CDN-Cache-Control','no-store');
 headers.set('Cloudflare-CDN-Cache-Control','no-store');
 const vary=headers.get('Vary');
 if(!vary?.split(',').some(value=>value.trim().toLowerCase()==='cookie'))headers.set('Vary',vary?`${vary}, Cookie`:'Cookie');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
