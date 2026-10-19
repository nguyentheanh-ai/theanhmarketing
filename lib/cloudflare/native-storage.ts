// supabase.storage compatible API on R2. Objects keep the opaque key scheme
// of the A mirror (supabase-a/<sha256(bucket\0name)>); d1_storage_objects is
// the live index (replaces the frozen current-index.json once native).
import {opaqueStorageKey} from './storage-r2-url';
import {serveR2Object,signPrivateR2Url,type PrivateR2Bucket} from './private-r2';
import type {ShimDatabase} from './d1-postgrest';

export type NativeR2Bucket=PrivateR2Bucket&{
 put(key:string,value:ReadableStream|ArrayBuffer|Blob|string,options?:{httpMetadata?:{contentType?:string;cacheControl?:string;contentDisposition?:string}}):Promise<unknown>;
 delete(key:string|string[]):Promise<void>;
};
type StorageError={message:string;statusCode:string;error:string;name:'StorageApiError'};
const err=(message:string,statusCode='400'):{data:null;error:StorageError}=>({data:null,error:{message,statusCode,error:message,name:'StorageApiError'}});
const enc=new TextEncoder();
async function hmac(secret:string,text:string){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(text))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
const validName=(n:string)=>n.length>0&&n.length<=1024&&!n.startsWith('/')&&!n.split('/').some(p=>p===''||p==='.'||p==='..')&&!/[\\\u0000-\u001f\u007f]/.test(n);

export const NATIVE_STORAGE_SQL=`CREATE TABLE IF NOT EXISTS d1_storage_buckets(id TEXT PRIMARY KEY,public INTEGER NOT NULL DEFAULT 0,file_size_limit INTEGER,allowed_mime_types TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS d1_storage_objects(bucket_id TEXT NOT NULL REFERENCES d1_storage_buckets(id),name TEXT NOT NULL,r2_key TEXT NOT NULL UNIQUE,size INTEGER NOT NULL,content_type TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(bucket_id,name));`;

type Options={db:ShimDatabase;r2:NativeR2Bucket;origin:string;secret:string;now?:()=>number};
export function createNativeStorage(o:Options){
 const now=()=>(o.now??Date.now)();
 const bucketRow=async(id:string)=>(await o.db.all('SELECT * FROM d1_storage_buckets WHERE id=?1',[id]))[0];
 const bucketShape=(b:Record<string,unknown>)=>({id:b.id,name:b.id,public:b.public===1,file_size_limit:b.file_size_limit??null,allowed_mime_types:b.allowed_mime_types?JSON.parse(String(b.allowed_mime_types)):null,created_at:b.created_at,updated_at:b.created_at,owner:''});
 const from=(bucket:string)=>({
  async upload(name:string,body:Blob|ArrayBuffer|ReadableStream|string,options:{contentType?:string;upsert?:boolean;cacheControl?:string}={}){
   if(!validName(name))return err('Invalid key','400');
   const b=await bucketRow(bucket);if(!b)return err('Bucket not found','404');
   const blob=body instanceof Blob?body:new Blob([body as ArrayBuffer|string]);
   if(b.file_size_limit&&blob.size>Number(b.file_size_limit))return err('The object exceeded the maximum allowed size','413');
   const type=options.contentType??(blob.type||'application/octet-stream');
   const allowed=b.allowed_mime_types?JSON.parse(String(b.allowed_mime_types)) as string[]:null;
   if(allowed&&!allowed.includes(type))return err(`mime type ${type} is not supported`,'415');
   const key=await opaqueStorageKey(bucket,name),stamp=new Date(now()).toISOString();
   // Claim the name first so a non-upsert upload never overwrites bytes.
   const claim=await o.db.all(`INSERT INTO d1_storage_objects(bucket_id,name,r2_key,size,content_type,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?6)
    ON CONFLICT(bucket_id,name) DO ${options.upsert?'UPDATE SET size=excluded.size,content_type=excluded.content_type,updated_at=excluded.updated_at':'NOTHING'} RETURNING name`,[bucket,name,key,blob.size,type,stamp]);
   if(!claim.length)return err('The resource already exists','409');
   await o.r2.put(key,await blob.arrayBuffer(),{httpMetadata:{contentType:type,...(options.cacheControl?{cacheControl:`max-age=${options.cacheControl}`}:{})}});
   return {data:{path:name,id:key,fullPath:`${bucket}/${name}`},error:null};
  },
  async download(name:string){
   const row=(await o.db.all('SELECT r2_key FROM d1_storage_objects WHERE bucket_id=?1 AND name=?2',[bucket,name]))[0];
   const obj=row?await o.r2.get(String(row.r2_key)):null;if(!obj)return err('Object not found','404');
   const headers=new Headers();obj.writeHttpMetadata(headers);
   return {data:await new Response(obj.body,{headers}).blob(),error:null};
  },
  async createSignedUrl(name:string,expiresIn:number,options:{download?:string|boolean}={}){
   const row=(await o.db.all('SELECT r2_key FROM d1_storage_objects WHERE bucket_id=?1 AND name=?2',[bucket,name]))[0];if(!row)return err('Object not found','404');
   const download=typeof options.download==='string'?options.download:options.download?name.split('/').pop():undefined;
   const url=await signPrivateR2Url(new URL('/__cf/private-r2',o.origin).toString(),String(row.r2_key),o.secret,Math.min(Math.max(1,Math.floor(expiresIn)),900),now(),download);
   return {data:{signedUrl:url},error:null};
  },
  async createSignedUploadUrl(name:string,options:{upsert?:boolean}={}){
   if(!validName(name)||!await bucketRow(bucket))return err('Bucket not found','404');
   const expires=Math.floor(now()/1000)+7200,payload=`PUT\n${bucket}\n${name}\n${expires}\n${options.upsert?1:0}`;
   const url=new URL('/__cf/storage/upload',o.origin);url.searchParams.set('bucket',bucket);url.searchParams.set('name',name);url.searchParams.set('expires',String(expires));url.searchParams.set('upsert',options.upsert?'1':'0');url.searchParams.set('sig',await hmac(o.secret,payload));
   return {data:{signedUrl:url.toString(),token:url.searchParams.get('sig')!,path:name},error:null};
  },
  getPublicUrl(name:string){return {data:{publicUrl:new URL(`/__cf/storage/public/${encodeURIComponent(bucket)}/${name.split('/').map(encodeURIComponent).join('/')}`,o.origin).toString()}};},
  async remove(names:string[]){
   const rows=await o.db.all(`DELETE FROM d1_storage_objects WHERE bucket_id=?1 AND name IN (SELECT value FROM json_each(?2)) RETURNING name,r2_key`,[bucket,JSON.stringify(names)]);
   if(rows.length)await o.r2.delete(rows.map(r=>String(r.r2_key)));
   return {data:rows.map(r=>({name:r.name})),error:null};
  },
 });
 return {
  from,
  async listBuckets(){return {data:(await o.db.all('SELECT * FROM d1_storage_buckets ORDER BY id',[])).map(bucketShape),error:null};},
  async getBucket(id:string){const b=await bucketRow(id);return b?{data:bucketShape(b),error:null}:err('Bucket not found','404');},
  async createBucket(id:string,options:{public?:boolean;fileSizeLimit?:number;allowedMimeTypes?:string[]}={}){
   if(!/^[a-z0-9][a-z0-9_.-]{1,62}$/.test(id))return err('Invalid bucket name');
   const r=await o.db.all(`INSERT INTO d1_storage_buckets(id,public,file_size_limit,allowed_mime_types,created_at) VALUES(?1,?2,?3,?4,?5) ON CONFLICT(id) DO NOTHING RETURNING id`,[id,options.public?1:0,options.fileSizeLimit??null,options.allowedMimeTypes?JSON.stringify(options.allowedMimeTypes):null,new Date(now()).toISOString()]);
   return r.length?{data:{name:id},error:null}:err('The resource already exists','409');
  },
  // Worker routes: signed upload (PUT) and public bucket delivery (GET).
  async handle(request:Request):Promise<Response|null>{
   const url=new URL(request.url);
   if(url.pathname==='/__cf/storage/upload'){
    if(request.method!=='PUT'&&request.method!=='POST')return new Response(null,{status:405});
    const bucket=url.searchParams.get('bucket')??'',name=url.searchParams.get('name')??'',expires=Number(url.searchParams.get('expires')),upsert=url.searchParams.get('upsert')==='1';
    const sig=await hmac(o.secret,`PUT\n${bucket}\n${name}\n${expires}\n${upsert?1:0}`);
    if(!Number.isSafeInteger(expires)||expires<now()/1000||sig!==url.searchParams.get('sig'))return Response.json({error:'Invalid signature'},{status:403});
    const body=await request.blob();
    const r=await from(bucket).upload(name,body,{contentType:request.headers.get('content-type')??undefined,upsert});
    return r.error?Response.json({error:r.error.message},{status:Number(r.error.statusCode)||400}):Response.json({Key:`${bucket}/${name}`});
   }
   const m=url.pathname.match(/^\/__cf\/storage\/public\/([^/]+)\/(.+)$/);
   if(m){
    const bucket=decodeURIComponent(m[1]),name=m[2].split('/').map(decodeURIComponent).join('/'),b=await bucketRow(bucket);
    if(!b||b.public!==1)return new Response(null,{status:404});
    const row=(await o.db.all('SELECT r2_key FROM d1_storage_objects WHERE bucket_id=?1 AND name=?2',[bucket,name]))[0];
    if(!row)return new Response(null,{status:404});
    return serveR2Object(request,o.r2,String(row.r2_key),'public, max-age=3600');
   }
   return null;
  },
  // Replacement for isCurrentStorageKey: a signed key is served only while indexed.
  async isIndexedKey(key:string){return (await o.db.all('SELECT 1 FROM d1_storage_objects WHERE r2_key=?1',[key])).length>0;},
 };
}
