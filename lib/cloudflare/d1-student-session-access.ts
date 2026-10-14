import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {readD1StudentCourseAccess} from '@/lib/cloudflare/d1-course-access';
import {d1CourseContentRowSql,decodeD1PublishedCourseRow} from '@/lib/cloudflare/d1-course-content';
import {getOrderedCourseLessons} from '@/lib/course-learning';

const projectId='vsxxgdzwtscuxcmjfckt';
// Student read boundary for app A only. Caller provides an opaque cookie token,
// never a client-supplied subject/email/admin flag. No progress writes here.
type Policy={sessionTtlMs:number;now?:number;allowedUserIds?:readonly string[]};
async function readSnapshot(db:AuthDatabase,token:string,policy:Policy,courseSlug?:string){
 const now=policy.now??Date.now();
 const session=await getD1AuthSession(db,token,{...policy,projectId,now});
 if(!session)return {status:'guest' as const};
 if(session.user.mustChangePassword)return {status:'password-change-required' as const,user:session.user};
 if(session.user.adminRole)throw new Error('Admin access projection is not implemented');
 const mirror=await assertD1AuthMirrorReady(db,{projectId,now});
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const tokenHash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 // Session and rights are checked in the SAME read statement. A revocation,
 // changed credential/version/status or stale Auth mirror between the initial
 // session lookup and this query cannot return course rights from that lookup.
 const guard=` AND EXISTS(SELECT 1 FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id
 WHERE s.token_hash=?5 AND s.project_id=?4 AND s.user_id=u.id AND s.revoked_at IS NULL
 AND s.session_version=a.session_version AND julianday(s.expires_at)>julianday(?3)
 AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?3)
 AND a.deleted_at IS NULL AND a.is_anonymous=0 AND a.must_change_password=0
 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?3)))
 AND ${authMirrorReadySql(4,6,3)} AND (?7='null' OR EXISTS(SELECT 1 FROM json_each(?7) allowed WHERE allowed.value=u.id))`;
 let denied=false;
 let content:unknown;
 try{
  const access=await readD1StudentCourseAccess(async(sql,args)=>{
   const projection=courseSlug===undefined?sql:sql.replace('SELECT u.admin_role,',`SELECT u.admin_role, (${d1CourseContentRowSql(8,4,3,9)}) AS course_content_json,`);
   const value=await db.first(projection+guard,[...args,tokenHash,mirror.floor,policy.allowedUserIds===undefined?'null':JSON.stringify(policy.allowedUserIds),...(courseSlug===undefined?[]:[courseSlug,300000])]);
   content=value?.course_content_json;
   if(!value)denied=true;
   return value;
  },session.user,{now});
  return {status:'student' as const,user:session.user,access,...(courseSlug===undefined?{}:{content})};
 }catch(error){
  if(denied){await assertD1AuthMirrorReady(db,{projectId,now});return {status:'guest' as const};}
  throw error;
 }
}
export async function readD1StudentSessionAccess(db:AuthDatabase,token:string,policy:Policy){return readSnapshot(db,token,policy);}

// Auth, entitlement inputs, progress and content are captured by one SQLite
// statement. Content never leaves the backend before the rights decision.
export async function readD1StudentLesson(db:AuthDatabase,token:string,input:{courseSlug:string;lessonId:string},policy:Policy){
 if(typeof input.courseSlug!=='string'||!input.courseSlug||input.courseSlug.length>200||typeof input.lessonId!=='string'||!input.lessonId||input.lessonId.length>200)throw new Error('Invalid lesson read intent');
 const result=await readSnapshot(db,token,policy,input.courseSlug);
 if(result.status!=='student')return result;
 const course=await decodeD1PublishedCourseRow(result.content);
 if(!course)return {status:'not-found' as const};
 const lessons=getOrderedCourseLessons(course);
 const directIndex=lessons.findIndex(l=>l.id===input.lessonId),legacy=/^lesson-(\d+)$/.exec(input.lessonId);
 const index=directIndex!==-1?directIndex:legacy?Number(legacy[1])-1:-1,currentLesson=lessons[index];
 const owns=result.access.ownedSlugs.includes(course.slug);
 if((course.visibility!=='public'||currentLesson?.access==='paid')&&!owns)return {status:'forbidden' as const};
 if(!currentLesson){return lessons[0]?{status:'redirect' as const,path:`/learn/${course.slug}/${lessons[0].id}`}:{status:'not-found' as const};}
 // Only the active authorized lesson carries content/media/resources. A free
 // preview must not receive paid YouTube IDs or neighboring lesson payloads.
 return {status:'lesson' as const,userId:result.user.id,course:{slug:course.slug,title:course.title},currentLesson,
  currentLessonCompleted:result.access.completedLessonIds.includes(currentLesson.id),
  lessons:lessons.map(({id,title,access,youtubeUrl})=>({id,title,access,youtubeUrl:owns||access==='free'?youtubeUrl:''})),
  previousLesson:lessons[index-1]?{id:lessons[index-1].id}:undefined,nextLesson:lessons[index+1]?{id:lessons[index+1].id}:undefined};
}
