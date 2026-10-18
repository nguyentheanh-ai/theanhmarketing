import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {readD1AdminOrderReport} from '@/lib/cloudflare/d1-admin-order-report';
import {normalizeCrmListQuery} from '@/lib/crm-v2/query';
type Options={db:AuthDatabase;origin:string;now?:number;configuredOwnerEmails:readonly string[];allowedRoles?:readonly ('owner'|'editor')[]};
function reply(status:number,body:unknown){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});}
const bad={ok:false,message:'Chưa thể đọc báo cáo quản trị.'};
// Isolated native read adapter. Not mounted by production or staging routers.
// The caller must select an approved environment before mounting this handler.
export async function handleD1AdminOrderHttp(request:Request,options:Options){
 const url=new URL(request.url),origin=new URL(options.origin);
 if(origin.protocol!=='https:'||origin.origin!==options.origin)throw Error('Invalid admin origin');
 if(url.origin!==options.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'||request.headers.has('Origin')&&request.headers.get('Origin')!==options.origin)return reply(403,bad);
 if(url.pathname!=='/api/cloudflare-admin/order-report')return reply(404,bad);
 if(request.method!=='GET')return reply(405,bad);
 const keys=Array.from(url.searchParams.keys());
 if(keys.length>3||keys.length!==new Set(keys).size||keys.some(k=>!['range','dateFrom','dateTo'].includes(k))||Array.from(url.searchParams.values()).some(v=>v.length>32))return reply(400,bad);
 const range=url.searchParams.get('range');
 if(range!==null&&!['today','yesterday','7d','30d','90d','custom'].includes(range))return reply(400,bad);
 if(range!=='custom'&&(url.searchParams.has('dateFrom')||url.searchParams.has('dateTo')))return reply(400,bad);
 try{
  const query=normalizeCrmListQuery(Object.fromEntries(url.searchParams));
  const result=await readD1AdminOrderReport(options.db,readD1SessionCookie(request),query,options);
  if(result.status==='denied')return reply(403,bad);
  return reply(200,{ok:true,...result});
 }catch{
  // No raw exception/SQL, session or customer data reaches logs or clients.
  return reply(503,bad);
 }
}
