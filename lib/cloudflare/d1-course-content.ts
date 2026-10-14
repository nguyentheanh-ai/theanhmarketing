import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {mapDbCourseToCourse,mergeOfficialCourseMetadata,normalizeCourseText,normalizeCourseTiming,publishedLessonsOnly,isDemoCourse,type DbCourse} from '@/lib/courses/course-projection';

const project='vsxxgdzwtscuxcmjfckt';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type SourceCourse=DbCourse & Record<string,unknown>;
function object(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
// Canonical JSON includes every source column, including fields not currently
// rendered by LearningRoom. No caller-supplied digest is trusted on readback.
function canonical(value:unknown):string{
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw new Error('Invalid course source document');
}
async function digest(text:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');}
function validate(value:unknown):asserts value is SourceCourse{
 if(!object(value)||typeof value.id!=='string'||!uuid.test(value.id)||typeof value.slug!=='string'||!value.slug||value.slug.length>200||typeof value.title!=='string'||!Array.isArray(value.course_modules))throw new Error('Invalid course source document');
 const ids=new Set<string>([value.id]);
 for(const mod of value.course_modules){
  if(!object(mod)||typeof mod.id!=='string'||!uuid.test(mod.id)||ids.has(mod.id)||mod.course_id!==value.id||typeof mod.title!=='string'||!Array.isArray(mod.lessons))throw new Error('Invalid course module identity');
  ids.add(mod.id);
  for(const lesson of mod.lessons){
   if(!object(lesson)||typeof lesson.id!=='string'||!uuid.test(lesson.id)||ids.has(lesson.id)||lesson.module_id!==mod.id||typeof lesson.title!=='string'||!Array.isArray(lesson.lesson_resources))throw new Error('Invalid course lesson identity');
   if(lesson.course_id!==undefined&&lesson.course_id!==value.id)throw new Error('Invalid course lesson identity');
   ids.add(lesson.id);
   for(const resource of lesson.lesson_resources){if(!object(resource)||typeof resource.title!=='string'||typeof resource.url!=='string'||resource.lesson_id!==lesson.id)throw new Error('Invalid course resource identity');}
  }
 }
}
export async function prepareD1CourseContent(source:unknown,sourceSnapshotAt:string){
 validate(source);
 if(!Number.isFinite(Date.parse(sourceSnapshotAt)))throw new Error('Invalid course snapshot');
 const document=canonical(source);
 if(new TextEncoder().encode(document).length>512*1024)throw new Error('Course document requires partitioned import');
 return {sql:'INSERT INTO d1_course_content(course_id,slug,source_project_id,source_document,source_digest,source_snapshot_at) VALUES(?1,?2,?3,?4,?5,?6)',params:[source.id,source.slug,project,document,await digest(document),new Date(sourceSnapshotAt).toISOString()]};
}
export async function verifyD1CourseContent(source:unknown,target:Record<string,unknown>,expectedSnapshotAt?:string){
 validate(source);
 const document=canonical(source);
 if(target.course_id!==source.id||target.slug!==source.slug||target.source_project_id!==project||typeof target.source_document!=='string'||target.source_digest!==await digest(document))throw new Error('Course content verification failed');
 let actual:unknown;try{actual=JSON.parse(target.source_document);}catch{throw new Error('Course content verification failed');}
 if(canonical(actual)!==document)throw new Error('Course content verification failed');
 if(expectedSnapshotAt!==undefined&&(!Number.isFinite(Date.parse(expectedSnapshotAt))||target.source_snapshot_at!==new Date(expectedSnapshotAt).toISOString()))throw new Error('Course snapshot verification failed');
 return {matched:true as const};
}
// Initial one-course staging projection only. Compare every captured field
// again in SQL so an intervening edit cannot promote the old readback.
export async function prepareVerifiedD1CourseMarker(source:unknown,target:Record<string,unknown>,sourceSnapshotAt:string,now=Date.now()){
 await verifyD1CourseContent(source,target,sourceSnapshotAt);
 const cutoff=Date.parse(sourceSnapshotAt);
 if(!Number.isFinite(now)||now<cutoff||now-cutoff>300000)throw new Error('Course source snapshot expired');
 return {sql:`UPDATE d1_course_content_sync SET status='verified',last_verified_at=?3 WHERE source_project_id=?1 AND status='pending' AND source_snapshot_at=?2 AND julianday(?2) BETWEEN julianday('now')-300000/86400000.0 AND julianday('now') AND julianday(?3) BETWEEN julianday(?2) AND julianday('now') AND course_count=1 AND (SELECT count(*) FROM d1_course_content WHERE source_project_id=?1)=1 AND EXISTS(SELECT 1 FROM d1_course_content WHERE course_id=?4 AND slug=?5 AND source_project_id=?1 AND source_document=?6 AND source_digest=?7 AND source_snapshot_at=?2) RETURNING status`,params:[project,target.source_snapshot_at as string,new Date(now).toISOString(),target.course_id as string,target.slug as string,target.source_document as string,target.source_digest as string]};
}
// Internal backend reader. Authorization must precede serialization to a
// student. Missing/unverified content fails closed and never uses demo lessons.
export async function readD1PublishedCourse(db:AuthDatabase,slug:string,options:{now?:number;maxSnapshotAgeMs?:number}={}){
 const now=options.now??Date.now(),age=options.maxSnapshotAgeMs??300000;
 if(!Number.isFinite(now)||!Number.isInteger(age)||age<1000||age>300000||typeof slug!=='string'||!slug||slug.length>200)throw new Error('Invalid course read policy');
 const row=await db.first(`SELECT c.* FROM d1_course_content c JOIN d1_course_content_sync s ON s.source_project_id=c.source_project_id WHERE c.slug=?1 AND c.source_project_id=?2 AND s.status='verified' AND (SELECT count(*) FROM d1_course_content all_courses WHERE all_courses.source_project_id=s.source_project_id)=s.course_count AND c.source_snapshot_at=s.source_snapshot_at AND julianday(s.source_snapshot_at) BETWEEN julianday(?3)-?4/86400000.0 AND julianday(?3) AND julianday(s.last_verified_at) BETWEEN julianday(s.source_snapshot_at) AND julianday(?3)`,[slug,project,new Date(now).toISOString(),age]);
 if(!row)throw new Error('Verified course content required');
 let source:unknown;try{source=JSON.parse(String(row.source_document));}catch{throw new Error('Course content verification failed');}
 await verifyD1CourseContent(source,row);validate(source);
 let course=normalizeCourseText(normalizeCourseTiming(mapDbCourseToCourse(source)));
 if(isDemoCourse(course))return null;
 course=mergeOfficialCourseMetadata(course);
 if(course.lmsStatus!=='published')return null;
 return publishedLessonsOnly(course);
}
