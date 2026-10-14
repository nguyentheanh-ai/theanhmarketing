import {resolveNativeStageOptions,type NativeStageEnv} from '@/lib/cloudflare/native-stage-router';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {requireD1ResourceAccess} from '@/lib/cloudflare/native-resource-access';
import {getAgentStorageEntry} from '@/lib/agent-library-files';
import {FACEBOOK_EBOOK_PDF_DEFAULT_BUCKET,FACEBOOK_EBOOK_PDF_OBJECT_PATH,FACEBOOK_EBOOK_PDF_FILE_NAME,FACEBOOK_EBOOK_DEFAULT_BUCKET,getFacebookEbookPage} from '@/lib/ebook/facebook-ebook';
import {opaqueStorageKey,signedStagingStorageUrl} from '@/lib/cloudflare/storage-r2-url';
import {isCurrentStorageKey} from '@/lib/cloudflare/current-storage-index';
const headers={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Cloudflare-CDN-Cache-Control':'no-store','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
function failure(status:number,message:string,head=false){return head?new Response(null,{status,headers:{...headers,'Content-Type':'application/json'}}):Response.json({ok:false,message},{status,headers});}
// Existing URLs, QA A only. Never mint a link from caller-supplied bucket/key.
// Disabled mode returns control to the existing Supabase routes unchanged.
export async function handleNativeResourceRequest(request:Request,env:NativeStageEnv):Promise<Response|null>{
 const url=new URL(request.url),pdf=url.pathname==='/api/ebook/facebook-ads/pdf',page=url.pathname==='/api/ebook/facebook-ads/page';
 const agent=/^\/api\/agent-library\/([^/]+)\/download$/.exec(url.pathname);
 if(!pdf&&!page&&!agent)return null;
 if((env.CF_NATIVE_AUTH_MODE as string)!=='qa')return null;
 const fail=(status:number,message:string)=>failure(status,message,request.method==='HEAD');
 try{
  const settings=resolveNativeStageOptions(request,env);if(!settings)return fail(503,'Chưa cấu hình kho tài liệu.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,Allow:'GET, HEAD, OPTIONS'}});
  if(!['GET','HEAD'].includes(request.method))return fail(405,'Phương thức không hợp lệ.');
  let entry:{bucket:string;objectPath:string;filename?:string}|null;
  if(pdf){
   if(!['1','true'].includes(url.searchParams.get('accepted')??''))return fail(412,'Vui lòng đọc và đồng ý điều khoản trước khi tải file PDF.');
   entry={bucket:process.env.FACEBOOK_EBOOK_PDF_STORAGE_BUCKET||FACEBOOK_EBOOK_PDF_DEFAULT_BUCKET,objectPath:process.env.FACEBOOK_EBOOK_PDF_OBJECT_PATH||FACEBOOK_EBOOK_PDF_OBJECT_PATH,filename:FACEBOOK_EBOOK_PDF_FILE_NAME};
  }else if(page){
   const part=Number(url.searchParams.get('part')),number=Number(url.searchParams.get('page'));
   if(!Number.isInteger(part)||part<1||!Number.isInteger(number)||number<1)return fail(400,'Trang ebook không hợp lệ.');
   const item=getFacebookEbookPage(part,number);if(!item)return fail(404,'Không tìm thấy trang ebook.');
   entry={bucket:process.env.FACEBOOK_EBOOK_STORAGE_BUCKET||FACEBOOK_EBOOK_DEFAULT_BUCKET,objectPath:item.storagePath};
  }else{
   let slug:string;try{slug=decodeURIComponent(agent![1])}catch{return fail(400,'Đường dẫn tài liệu không hợp lệ.')}
   entry=getAgentStorageEntry(slug);if(!entry)return fail(404,'Không tìm thấy tài liệu.');
  }
  const access=await requireD1ResourceAccess(settings.db,readD1SessionCookie(request),agent?'agents':'ebook',settings);
  if(!access.ok)return fail(access.status,access.status===401?'Bạn cần đăng nhập để tải tài liệu.':'Tài khoản chưa có quyền tải tài liệu.');
  // Authorization precedes all R2 reads/signing, including current-key checks.
  if(!env.PRIVATE_ASSETS||!env.R2_PRIVATE_URL_SECRET)return fail(503,'Chưa cấu hình kho tài liệu.');
  const key=await opaqueStorageKey(entry.bucket,entry.objectPath);
  if(!await isCurrentStorageKey(env.PRIVATE_ASSETS,key)||!await env.PRIVATE_ASSETS.head(key))return fail(404,'Không tìm thấy tài liệu trong kho riêng.');
  const location=await signedStagingStorageUrl(url.origin,entry.bucket,entry.objectPath,env.R2_PRIVATE_URL_SECRET,entry.filename);
  if(!page&&url.searchParams.get('format')==='json')return request.method==='HEAD'?new Response(null,{headers:{...headers,'Content-Type':'application/json'}}):Response.json(agent?{url:location}:{ok:true,url:location},{headers});
  return new Response(null,{status:302,headers:{...headers,Location:location}});
 }catch{return fail(503,'Chưa tải được tài liệu. Vui lòng thử lại sau.');}
}
