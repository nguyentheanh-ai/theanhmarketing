import {readD1StudentCourseAccess} from '@/lib/cloudflare/d1-course-access';

type Row=Record<string,unknown>;
type Reader=(sql:string,parameters:readonly string[])=>Promise<unknown>;
function object(value:unknown):Row{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid student progress snapshot');
 return value as Row;
}
function array(value:unknown):Row[]{
 if(!Array.isArray(value)||value.length>10000)throw Error('Invalid student progress snapshot');
 return value.map(object);
}
function decode(value:unknown){
 if(typeof value!=='string'||value.length>2*1024*1024)throw Error('Invalid student progress snapshot');
 return JSON.parse(value) as unknown;
}
function count(value:unknown){
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('Invalid student progress count');
 return value;
}

// Compose only on the known access query: its matching CTE and Auth/mirror
// guards remain in the SAME statement. Optional scope is a backend bind index.
export function withD1StudentProgressSql(sql:string,scopePosition?:number){
 const marker='SELECT u.admin_role,';
 if(sql.split(marker).length!==2||!sql.startsWith('\nWITH matching AS (')||
   scopePosition!==undefined&&(!Number.isInteger(scopePosition)||scopePosition<5||scopePosition>1000))throw Error('Invalid student progress query');
 const scope=scopePosition===undefined?'':`WHERE c.slug=?${scopePosition}`;
 return sql.replace(marker,`${marker}
 (SELECT json_object('courses',json((SELECT json_group_array(json_object(
   'id',c.id,'slug',c.slug,
   'playableCount',(SELECT count(*) FROM d1_lms_modules m JOIN d1_lms_lessons l ON l.module_id=m.id
     WHERE m.course_id=c.id AND m.status='published' AND l.status='published' AND l.playable=1),
   'publishedCount',(SELECT count(*) FROM d1_lms_modules m JOIN d1_lms_lessons l ON l.module_id=m.id
     WHERE m.course_id=c.id AND m.status='published' AND l.status='published')))
   FROM d1_lms_courses c ${scope})),
   'enrollments',json((SELECT json_group_array(json_object('id',e.id,'courseId',e.course_id,
     'resolvedSlug',m.slug,'metadata',json(e.metadata)))
     FROM matching m JOIN d1_lms_enrollments e ON e.id=m.id)))) AS progress_context_json,`);
}

export function decodeD1StudentProfile(raw:unknown){
 const snapshot=object(raw),profile=object(decode(snapshot.student_profile_json));
 return {fullName:typeof profile.fullName==='string'?profile.fullName:'',phone:typeof profile.phone==='string'?profile.phone:''};
}

// Repository Source mapEnrollment semantics, using only IDs already authorized
// by deriveD1StudentCourseAccess. No subject, role or grant is inferred here.
export function deriveD1StudentProgress(raw:unknown,access:{ownedSlugs:string[];enrollmentIdsBySlug:Record<string,string[]>}){
 const snapshot=object(raw),context=object(decode(snapshot.progress_context_json));
 const courses=array(context.courses),enrollments=array(context.enrollments),progress=array(decode(snapshot.progress_json));
 const byId=new Map(courses.map(c=>[c.id,c])),bySlug=new Map(courses.map(c=>[c.slug,c]));
 if(byId.size!==courses.length||bySlug.size!==courses.length)throw Error('Invalid student progress catalog');
 const counts:Record<string,number>=Object.create(null),percentages:Record<string,number>=Object.create(null);
 for(const c of courses){
  if(typeof c.id!=='string'||typeof c.slug!=='string')throw Error('Invalid student progress catalog');
  counts[c.slug]=count(c.playableCount);count(c.publishedCount);
 }
 const byEnrollment=new Map<string,number>();
 const allowed=new Set(Object.values(access.enrollmentIdsBySlug).flat());
 for(const e of enrollments){
  if(typeof e.id!=='string')throw Error('Invalid student progress enrollment');
  if(!allowed.has(e.id))continue;
  if(byEnrollment.has(e.id))throw Error('Invalid student progress enrollment');
  // Source replaces bySlug counts with RPC playable counts, but its byId
  // fallback retains published lesson count including empty lesson bodies.
  const slugCourse=bySlug.get(e.resolvedSlug),idCourse=byId.get(e.courseId);
  const total=slugCourse?count(slugCourse.playableCount):idCourse?count(idCourse.publishedCount):0;
  const completed=progress.filter(p=>p.enrollmentId===e.id&&(p.status==='completed'||typeof p.completedAt==='string'&&p.completedAt.length>0)).length;
  let stored:number;
  try{const metadata=e.metadata&&typeof e.metadata==='object'&&!Array.isArray(e.metadata)?e.metadata as Row:{};stored=Number(metadata.progress_percent??0);}catch{stored=0;}
  if(!Number.isFinite(stored))stored=0;
  byEnrollment.set(e.id,Math.max(0,Math.min(100,total>0?Math.round(completed/total*100):stored)));
 }
 for(const slug of access.ownedSlugs){
  const ids=access.enrollmentIdsBySlug[slug]??[];
  const values=ids.map(id=>{
   const value=byEnrollment.get(id);if(value===undefined)throw Error('Missing authorized student progress');return value;
  });
  // Source RPC has no ORDER BY and dashboard takes its first enrollment.
  // Refuse conflicting values until a source-compatible ordering is verified.
  if(new Set(values).size>1)throw Error('Ambiguous source progress order');
  percentages[slug]=values[0]??0;
 }
 return {lessonCountsBySlug:counts,progressBySlug:percentages};
}

export async function readD1StudentCourseProgress(read:Reader,subject:{id:string;email:string},options:{now?:number;maxSnapshotAgeMs?:number}={}){
 let raw:unknown;
 const access=await readD1StudentCourseAccess(async(sql,args)=>{
  raw=await read(withD1StudentProgressSql(sql),args);return raw;
 },subject,options);
 return {...access,...deriveD1StudentProgress(raw,access)};
}
