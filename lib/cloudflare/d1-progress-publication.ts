import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {d1CourseContentRowSql,decodeD1PublishedCourseRow} from '@/lib/cloudflare/d1-course-content';
import {getOrderedCourseLessons} from '@/lib/course-learning';

type PublicationProof=Readonly<{document:string;digest:string;snapshot:string;courseId:string}>;
const issued=new WeakSet<PublicationProof>();
const project='vsxxgdzwtscuxcmjfckt';
// Backend-only receipt. Never accept a serialized proof from a request.
export async function resolveD1ProgressLesson(db:AuthDatabase,slug:string,lessonId:string,now=Date.now()){
 if(!slug||slug.length>200||!lessonId||lessonId.length>200||!Number.isFinite(now))throw Error('Invalid progress publication intent');
 const result=await db.first(`SELECT (${d1CourseContentRowSql(1,2,3,4)}) AS content_json`,[slug,project,new Date(now).toISOString(),300000]);
 const value=result?.content_json;
 const course=await decodeD1PublishedCourseRow(value);
 if(!course)return null;
 const lesson=getOrderedCourseLessons(course).find(item=>item.id===lessonId);
 if(!lesson)return null;
 const row=JSON.parse(value as string) as Record<string,string>;
 const publicationProof=Object.freeze({document:row.source_document,digest:row.source_digest,snapshot:row.source_snapshot_at,courseId:row.course_id});
 issued.add(publicationProof);
 return {id:lesson.id,title:lesson.title,publicationProof};
}
// Positions follow the native writer's 17 existing parameters. Each statement
// compares the actual verified body again, so a change after resolution denies
// the whole operation; marker freshness also uses the real database clock.
export function progressPublicationGuard(proof:PublicationProof|undefined,liveClock:boolean){
 if(!proof||!issued.has(proof))throw Error('Verified progress publication required');
 const live=liveClock?` AND julianday(c.source_snapshot_at) BETWEEN julianday('now','-5 minutes') AND julianday('now')
 AND julianday(s.last_verified_at) BETWEEN julianday(c.source_snapshot_at) AND julianday('now')`:'';
 return {sql:` AND EXISTS(SELECT 1 FROM d1_course_content c JOIN d1_course_content_sync s ON s.source_project_id=c.source_project_id
 WHERE c.slug=?3 AND c.source_project_id=?10 AND c.course_id=?21 AND c.source_document=?18 AND c.source_digest=?19 AND c.source_snapshot_at=?20
 AND s.status='verified' AND s.source_snapshot_at=c.source_snapshot_at
 AND (SELECT count(*) FROM d1_course_content all_courses WHERE all_courses.source_project_id=s.source_project_id)=s.course_count
 AND julianday(c.source_snapshot_at) BETWEEN julianday(?6) AND julianday(?5)
 AND julianday(s.last_verified_at) BETWEEN julianday(c.source_snapshot_at) AND julianday(?5)${live}
 AND EXISTS(SELECT 1 FROM d1_lms_courses normalized WHERE normalized.id=c.course_id AND normalized.slug=c.slug AND normalized.lms_status='published'))`,params:[proof.document,proof.digest,proof.snapshot,proof.courseId]};
}
export type D1ProgressPublicationProof=PublicationProof;
