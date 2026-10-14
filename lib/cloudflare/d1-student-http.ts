import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {readD1SessionCookie,readBoundedAuthJson} from '@/lib/cloudflare/d1-auth-http';
import {readD1StudentSessionAccess,readD1StudentLesson} from '@/lib/cloudflare/d1-student-session-access';
import {markD1SessionLessonCompleted} from '@/lib/cloudflare/d1-lesson-progress';
type Options={db:AuthDatabase;origin:string;sessionTtlMs:number;now?:number;allowedUserIds?:readonly string[];qaWriteUserIds?:readonly string[];
 resolveLesson?:(courseSlug:string,lessonId:string)=>Promise<{id:string;title:string}|null>};
function reply(status:number,body:unknown){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});}
const bad={ok:false,message:'Không thể xử lý yêu cầu học tập.'};
// Native staging transport for A only; existing /learn SSR is not switched.
// Never configure the QA cohort from HTTP or enable customer writes in phase A.
export async function handleD1StudentHttp(request:Request,options:Options){
 const origin=new URL(options.origin),url=new URL(request.url);
 if(origin.protocol!=='https:'||origin.origin!==options.origin)throw new Error('Invalid student origin');
 if(url.origin!==options.origin)return reply(403,bad);
 const access=url.pathname==='/api/cloudflare-student/access',lesson=url.pathname==='/api/cloudflare-student/lesson',progress=url.pathname==='/api/cloudflare-student/progress';
 if(!access&&!lesson&&!progress)return reply(404,bad);
 if(((access||lesson)&&request.method!=='GET')||(progress&&request.method!=='POST'))return reply(405,bad);
 if(progress&&(request.headers.get('Origin')!==options.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return reply(403,bad);
 const token=readD1SessionCookie(request);
 try{
  if(lesson){
   const keys=Array.from(url.searchParams.keys());
   if(keys.length!==2||new Set(keys).size!==2||keys.some(key=>!['courseSlug','lessonId'].includes(key)))return reply(400,bad);
   const courseSlug=url.searchParams.get('courseSlug'),lessonId=url.searchParams.get('lessonId');
   if(!courseSlug||!lessonId||courseSlug.length>200||lessonId.length>200)return reply(400,bad);
   const result=await readD1StudentLesson(options.db,token,{courseSlug,lessonId},options);
   if(result.status==='guest')return reply(401,{ok:false,code:'LOGIN_REQUIRED'});
   if(result.status==='password-change-required')return reply(409,{ok:false,code:'PASSWORD_CHANGE_REQUIRED'});
   if(result.status==='forbidden')return reply(403,{ok:false,code:'COURSE_ACCESS_REQUIRED'});
   if(result.status==='not-found')return reply(404,{ok:false,code:'LESSON_NOT_FOUND'});
   if(result.status==='redirect')return reply(200,{ok:true,redirectPath:result.path});
   return reply(200,{ok:true,...result});
  }
  if(access){
   const result=await readD1StudentSessionAccess(options.db,token,options);
   if(result.status==='guest')return reply(401,{ok:false,code:'LOGIN_REQUIRED'});
   if(result.status==='password-change-required')return reply(409,{ok:false,code:'PASSWORD_CHANGE_REQUIRED'});
   // Internal evidence used to guard legacy grants must not leave the backend.
   return reply(200,{ok:true,userId:result.user.id,ownedSlugs:result.access.ownedSlugs,
    completedLessonIds:result.access.completedLessonIds,enrollmentIdsBySlug:result.access.enrollmentIdsBySlug});
  }
  const writeUsers=options.qaWriteUserIds?.filter(id=>options.allowedUserIds===undefined||options.allowedUserIds.includes(id));
  if(!writeUsers?.length||!options.resolveLesson)return reply(503,{ok:false,code:'WRITE_DISABLED'});
  let body:Record<string,unknown>;try{body=await readBoundedAuthJson(request);}catch{return reply(400,bad);}
  if(Object.keys(body).some(key=>!['courseSlug','lessonId','operationId','completed'].includes(key))
   ||typeof body.courseSlug!=='string'||typeof body.lessonId!=='string'||typeof body.operationId!=='string'
   ||(body.completed!==undefined&&typeof body.completed!=='boolean'))return reply(400,bad);
  const result=await markD1SessionLessonCompleted(options.db,token,{
   courseSlug:body.courseSlug,lessonId:body.lessonId,operationId:body.operationId,completed:body.completed as boolean|undefined,
  },{sessionTtlMs:options.sessionTtlMs,now:options.now,qaUserIds:writeUsers,resolveLesson:options.resolveLesson});
  return reply(200,result);
 }catch(error){
  const message=error instanceof Error?error.message:'';
  if(message==='Verified student session required')return reply(401,{ok:false,code:'LOGIN_REQUIRED'});
  if(message==='Invalid student progress intent')return reply(400,bad);
  if(message==='Published lesson required')return reply(404,bad);
  if(message.startsWith('Student progress request is not authorized'))return reply(403,bad);
  // No raw exception, SQL, cookie, source evidence or credential logging.
  return reply(503,bad);
 }
}
