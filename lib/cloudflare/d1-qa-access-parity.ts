import {deriveD1StudentCourseAccess} from '@/lib/cloudflare/d1-course-access';
import {getCourseAccessSlugs} from '@/lib/course-access';
type Row=Record<string,unknown>;
function object(v:unknown):Row{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid QA parity input');return v as Row;}
function rows(v:unknown):Row[]{if(!Array.isArray(v)||v.length>1000)throw Error('Invalid QA parity rows');return v.map(object);}
function json(v:unknown){if(typeof v!=='string')throw Error('Invalid QA parity JSON');return JSON.parse(v);}
function canonical(v:unknown):string{if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';const r=object(v);return '{'+Object.keys(r).sort().map(k=>JSON.stringify(k)+':'+canonical(r[k])).join(',')+'}';}
function same(a:unknown[],b:unknown[],component:string){if(canonical(a.map(canonical).sort())!==canonical(b.map(canonical).sort()))throw Object.assign(Error('QA source/D1 entitlement parity mismatch'),{component,expectedCount:a.length,actualCount:b.length,...(a.length===1&&b.length===1?{differingFields:Object.keys(object(a[0])).filter(k=>canonical(object(a[0])[k])!==canonical(object(b[0])[k]))}:{})});}
function time(v:unknown){if(v===null)return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw Error('Invalid QA parity time');return new Date(v).toISOString();}
// Pending staging data may be calculated for verification, but must remain
// unavailable through runtime until the separate verified mirror gate passes.
export function verifyD1QaAccessParity(source:unknown,actual:unknown,subject:{id:string;email:string}){
 const s=object(source),snapshot=object(actual),rpc=object(s.rpc),course=object(s.course),slug=String(course.slug);
 if(course.lms_status!=='published')throw Error('Published QA source course required');
 const enrollments=rows(rpc.enrollments).map(e=>({id:e.id,slug:e.course_slug||(object(e.metadata).course_slug)||slug,legacyDerived:0}));
 const progress=rows(rpc.progress).map(p=>({enrollmentId:p.enrollment_id,lessonId:p.lesson_id,status:p.status,completedAt:time(p.completed_at)}));
 const targetEnrollments=rows(json(snapshot.enrollments_json)),targetProgress=rows(json(snapshot.progress_json)).map(p=>({...p,completedAt:time(p.completedAt)}));
 same(enrollments,targetEnrollments,'enrollments');same(progress,targetProgress,'progress');
 const orders=rows(s.orders).map(o=>({email:o.email as string,status:o.status as string,courseSlug:o.course_slug as string,courseTitle:o.course_title as string,paymentPlan:o.payment_plan as string,orderItems:o.order_items as {slug?:string;title?:string}[]}));
 const leads=rows(s.overrides).map(l=>({email:l.email as string,source:l.source as string,createdAt:l.created_at as string}));
 const expectedLegacy=getCourseAccessSlugs({email:subject.email,orders,leads});
 const calculated=deriveD1StudentCourseAccess(snapshot,subject);
 same(expectedLegacy,calculated.legacyOwnedSlugs,'legacySlugs');same(Array.from(new Set(enrollments.map(e=>e.slug))),calculated.lmsOwnedSlugs,'lmsSlugs');
 same(Array.from(new Set(progress.filter(p=>p.status==='completed'||p.completedAt).map(p=>p.lessonId))),calculated.completedLessonIds,'completedLessons');
 same(Array.from(new Set([...expectedLegacy,...enrollments.map(e=>e.slug)])),calculated.ownedSlugs,'ownedSlugs');
 return {matched:true as const,enrollments:enrollments.length,progress:progress.length,ownedCourses:calculated.ownedSlugs.length,completedLessons:calculated.completedLessonIds.length,limits:'QA calculation parity only; does not authorize runtime or verify full customer migration'};
}
