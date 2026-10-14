import { isAdminEmail } from "@/lib/course-access";
import { readD1StudentCourseAccess } from "@/lib/cloudflare/d1-course-access";
import { d1LegacyAccessEvidenceSql, type LegacyAccessProof } from "@/lib/cloudflare/d1-legacy-access-evidence";
import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {assertD1AuthMirrorReady,authMirrorReadySql,authMirrorWindow} from '@/lib/cloudflare/d1-auth-authority';
import {progressPublicationGuard,type D1ProgressPublicationProof} from '@/lib/cloudflare/d1-progress-publication';

// Native QA routing uses only the session-bound writer below. Other exported
// helpers remain prototype primitives. Execute ALL statements as one D1 batch
// transaction; never invoke them individually or mix with a Supabase writer.
const LEGACY_AUTH = `?12=${d1LegacyAccessEvidenceSql()}
 AND EXISTS (SELECT 1 FROM json_each(?13) allowed WHERE allowed.value=?3)`;
const ELIGIBLE = `WITH eligible_base AS (
 SELECT e.id,e.course_id,e.course_slug,l.id AS lesson_id,course.id AS resolved_course_id
 FROM d1_lms_enrollments e
 LEFT JOIN d1_lms_contacts contact ON contact.id=e.contact_id
 LEFT JOIN d1_lms_legacy_enrollment_owners legacy ON legacy.enrollment_id=e.id
 JOIN d1_lms_courses course ON course.slug=e.course_slug AND course.slug=?3 AND course.lms_status='published'
 JOIN d1_lms_modules module ON module.course_id=course.id AND module.status='published'
 JOIN d1_lms_lessons l ON l.module_id=module.id AND l.course_id=course.id AND l.status='published' AND l.id=?4
 WHERE e.status IN ('active','completed') AND (e.expires_at IS NULL OR julianday(e.expires_at)>julianday(?5))
 AND ((legacy.enrollment_id IS NULL AND (e.user_id=?1 OR contact.normalized_email=?2))
   OR (legacy.user_id=?1 AND legacy.course_slug=?3 AND ${LEGACY_AUTH}))
 AND json_type(e.metadata)='object'
 AND NOT EXISTS (SELECT 1 FROM d1_lms_progress p WHERE p.enrollment_id=e.id AND p.lesson_id=l.id AND json_type(p.metadata)<>'object')
 AND EXISTS (SELECT 1 FROM d1_access_users u WHERE u.id=?1 AND u.normalized_email=?2 AND coalesce(u.admin_role,'') NOT IN ('owner','editor'))
 AND EXISTS (SELECT 1 FROM d1_access_sync_state s WHERE s.source_project_id=?10 AND s.status='verified'
   AND julianday(s.source_snapshot_at) BETWEEN julianday(?6) AND julianday(?5)
   AND julianday(s.last_verified_at) BETWEEN julianday(?6) AND julianday(?5)) AND ?14 IS NOT NULL /* AUTH_SESSION_GUARD */
)`;
const OP_MATCH = `op.id=?7 AND op.user_id=?1 AND op.normalized_email=?2 AND op.course_slug=?3
 AND op.lesson_id=?4 AND op.completed=?8 AND ?11 IS NOT NULL
 AND EXISTS (SELECT 1 FROM eligible_base e WHERE e.id=op.enrollment_id)`;
const PENDING = `${ELIGIBLE}, pending AS (
 SELECT op.* FROM d1_lms_progress_operations op WHERE ${OP_MATCH} AND op.status='pending'
)`;
const COMPLETED_COUNT = `(SELECT count(*) FROM d1_lms_progress p WHERE p.enrollment_id=e.id AND (p.status='completed' OR p.completed_at IS NOT NULL))`;
const TOTAL_COUNT = `(SELECT count(*) FROM d1_lms_lessons l JOIN d1_lms_modules m ON m.id=l.module_id
 JOIN d1_lms_courses c ON c.id=m.course_id WHERE c.slug=e.course_slug AND m.status='published' AND l.status='published' AND l.playable=1)`;
const PERCENT = `CASE WHEN ${TOTAL_COUNT}>0 THEN CAST(round(${COMPLETED_COUNT}*100.0/${TOTAL_COUNT}) AS INTEGER) ELSE 0 END`;

const SQL = [
  `${ELIGIBLE} INSERT INTO d1_lms_progress_operations
   (id,user_id,normalized_email,course_slug,enrollment_id,lesson_id,completed,lesson_title,status,created_at)
   SELECT ?7,?1,?2,?3,e.id,e.lesson_id,?8,?9,'pending',?5 FROM eligible_base e
   JOIN d1_lms_enrollments original ON original.id=e.id WHERE ?11 IS NOT NULL
   ORDER BY julianday(original.updated_at) DESC,e.id LIMIT 1 ON CONFLICT(id) DO NOTHING`,
  `${PENDING} INSERT INTO d1_lms_progress
   (id,enrollment_id,lesson_id,status,progress_percent,completed_at,updated_at,metadata)
   SELECT ?11,op.enrollment_id,op.lesson_id,CASE WHEN ?8=1 THEN 'completed' ELSE 'in_progress' END,
     CASE WHEN ?8=1 THEN 100 ELSE 0 END,CASE WHEN ?8=1 THEN ?5 ELSE NULL END,?5,
     json_object('source','student-learning-room','course_slug',?3,'lesson_title',?9)
   FROM pending op WHERE 1
   ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET status=excluded.status,
     progress_percent=excluded.progress_percent,completed_at=excluded.completed_at,updated_at=excluded.updated_at,
     metadata=json_patch(d1_lms_progress.metadata,excluded.metadata)`,
  `${PENDING} UPDATE d1_lms_enrollments AS e SET last_seen_at=?5,updated_at=?5,
   status=CASE WHEN ${PERCENT}>=100 THEN 'completed' ELSE e.status END,
   metadata=json_patch(e.metadata,json_object('progress_percent',${PERCENT},'last_lesson_id',?4,'last_lesson_title',?9))
   WHERE e.id IN (SELECT enrollment_id FROM pending)`,
  `${ELIGIBLE} UPDATE d1_lms_progress_operations AS op SET status='applied',response_json=(
   SELECT json_object('ok',json('true'),'enrollmentId',e.id,
     'progressPercent',json_extract(e.metadata,'$.progress_percent'),
     'completedLessonIds',json((SELECT json_group_array(lesson_id) FROM
       (SELECT lesson_id FROM d1_lms_progress WHERE enrollment_id=e.id AND (status='completed' OR completed_at IS NOT NULL) ORDER BY lesson_id))))
   FROM d1_lms_enrollments e WHERE e.id=op.enrollment_id)
   WHERE ${OP_MATCH} AND op.status='pending'`,
  `${ELIGIBLE} SELECT op.response_json FROM d1_lms_progress_operations op WHERE ${OP_MATCH} AND op.status='applied'`,
];

const PROVISION_GUARD = `EXISTS (SELECT 1 FROM d1_access_users u WHERE u.id=?1 AND u.normalized_email=?2
 AND coalesce(u.admin_role,'') NOT IN ('owner','editor'))
 AND EXISTS (SELECT 1 FROM d1_access_sync_state s WHERE s.source_project_id=?10 AND s.status='verified'
   AND julianday(s.source_snapshot_at) BETWEEN julianday(?6) AND julianday(?5)
   AND julianday(s.last_verified_at) BETWEEN julianday(?6) AND julianday(?5))
 AND ${LEGACY_AUTH} AND ?11 IS NOT NULL /* AUTH_SESSION_GUARD */
 AND NOT EXISTS (SELECT 1 FROM d1_lms_progress_operations previous WHERE previous.id=?7 AND
   (previous.user_id<>?1 OR previous.normalized_email<>?2 OR previous.course_slug<>?3
    OR previous.lesson_id<>?4 OR previous.completed<>?8))`;
const PROVISION_SQL = [
 `INSERT INTO d1_lms_enrollments
  (id,contact_id,user_id,course_id,course_slug,status,expires_at,updated_at,metadata)
  SELECT ?14,NULL,NULL,course.id,course.slug,'active',NULL,?5,json_object('source','cloudflare-legacy-access')
  FROM d1_lms_courses course WHERE course.slug=?3 AND course.lms_status='published' AND ${PROVISION_GUARD}
  AND EXISTS (SELECT 1 FROM d1_lms_lessons l JOIN d1_lms_modules m ON m.id=l.module_id
    WHERE l.id=?4 AND m.course_id=course.id AND l.course_id=course.id AND l.status='published' AND m.status='published')
  AND NOT EXISTS (SELECT 1 FROM d1_lms_legacy_enrollment_owners legacy WHERE legacy.user_id=?1 AND legacy.course_slug=?3)
  AND NOT EXISTS (SELECT 1 FROM d1_lms_enrollments e LEFT JOIN d1_lms_contacts c ON c.id=e.contact_id
    LEFT JOIN d1_lms_legacy_enrollment_owners legacy ON legacy.enrollment_id=e.id
    WHERE legacy.enrollment_id IS NULL AND e.course_slug=?3 AND e.status IN ('active','completed')
    AND (e.expires_at IS NULL OR julianday(e.expires_at)>julianday(?5)) AND (e.user_id=?1 OR c.normalized_email=?2))`,
 `INSERT INTO d1_lms_legacy_enrollment_owners(enrollment_id,user_id,course_slug)
  SELECT e.id,?1,e.course_slug FROM d1_lms_enrollments e
  WHERE e.id=?14 AND e.user_id IS NULL AND e.contact_id IS NULL AND e.course_slug=?3 AND ${PROVISION_GUARD}
  ON CONFLICT(user_id,course_slug) DO NOTHING`,
];

type Statement = { sql: string; params: (string | number)[] };
type AtomicBatch = (statements: readonly Statement[]) => Promise<{ results?: Record<string, unknown>[] }[]>;
type ProgressInput = {
  userId: string; email: string; courseSlug: string; lessonId: string;
  lessonTitle: string; operationId: string; completed?: boolean;
};
function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }

function buildBatch(input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {}, proof?: LegacyAccessProof): Statement[] {
  const email = input.email.trim().toLowerCase();
  const now = options.now ?? Date.now(), maxAge = options.maxSnapshotAgeMs ?? 300000;
  if (!uuid(input.userId) || !uuid(input.lessonId) || !uuid(input.operationId) || !email || isAdminEmail(email)
    || !input.courseSlug || input.courseSlug.length>200 || input.lessonTitle.length>500
    || !Number.isFinite(now) || !Number.isFinite(maxAge) || maxAge<=0) throw new Error("Invalid verified progress request");
  const params = [input.userId,email,input.courseSlug,input.lessonId,new Date(now).toISOString(),
    new Date(now-maxAge).toISOString(),input.operationId,input.completed===false?0:1,input.lessonTitle,
    "vsxxgdzwtscuxcmjfckt",crypto.randomUUID(),proof?.evidenceJson ?? "",JSON.stringify(proof?.allowedSlugs ?? []),crypto.randomUUID()];
  return SQL.map(sql=>({sql,params:[...params]}));
}

export function buildD1LessonCompletionBatch(input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {}): Statement[] {
  return buildBatch(input,options);
}

export async function prepareD1LegacyAwareLessonCompletionBatch(
  readSnapshot: (sql: string, parameters: readonly string[]) => Promise<unknown>,
  input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {},
): Promise<Statement[]> {
  // Proof is derived here from the database and production permission helper,
  // never from input, form fields, cookies or client metadata.
  const access = await readD1StudentCourseAccess(readSnapshot,{id:input.userId,email:input.email},options);
  if (access.legacyAccessProof.evidenceJson.length>1024*1024) throw new Error("Access evidence exceeds staging limit");
  const writes=buildBatch(input,options,access.legacyAccessProof);
  return [...PROVISION_SQL.map(sql=>({sql,params:[...writes[0].params]})),...writes];
}

export async function markD1LessonCompleted(executeAtomicBatch: AtomicBatch, input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {}) {
  const results = await executeAtomicBatch(buildD1LessonCompletionBatch(input,options));
  return parseProgressResponse(results);
}

export async function markD1LegacyAwareLessonCompleted(
  readSnapshot: (sql: string, parameters: readonly string[]) => Promise<unknown>,
  executeAtomicBatch: AtomicBatch, input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {},
) {
  const statements=await prepareD1LegacyAwareLessonCompletionBatch(readSnapshot,input,options);
  return parseProgressResponse(await executeAtomicBatch(statements));
}

function parseProgressResponse(results: { results?: Record<string, unknown>[] }[]) {
  const raw = results.at(-1)?.results?.[0]?.response_json;
  if (typeof raw!=="string") throw new Error("Student progress request is not authorized or operation conflicts");
  let value: unknown;
  try { value=JSON.parse(raw); } catch { throw new Error("Invalid progress response"); }
  if (!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Invalid progress response");
  const result=value as Record<string,unknown>;
  if (result.ok!==true || typeof result.enrollmentId!=="string" || typeof result.progressPercent!=="number"
    || !Array.isArray(result.completedLessonIds) || !result.completedLessonIds.every(id=>typeof id==="string")) throw new Error("Invalid progress response");
  return {ok:true as const,enrollmentId:result.enrollmentId,progressPercent:result.progressPercent,completedLessonIds:result.completedLessonIds as string[]};
}

// App A native-session write boundary. No userId/email/proof/title from HTTP.
// resolveLesson is a backend content reader, never a callback supplied by clients.
// Mounted only behind the separate QA progress switch on A staging; no
// production writer or client-supplied publication receipt is permitted.
export async function markD1SessionLessonCompleted(db:AuthDatabase,token:string,
 input:{courseSlug:string;lessonId:string;operationId:string;completed?:boolean},
 policy:{sessionTtlMs:number;now?:number;qaUserIds?:readonly string[];requirePublicationProof?:boolean;resolveLesson:(courseSlug:string,lessonId:string)=>Promise<{id:string;title:string;publicationProof?:D1ProgressPublicationProof}|null>}){
 // Hosting migration keeps Supabase as the only customer writer. This candidate
 // only permits an explicit backend QA cohort; native cutover authority remains
 // unimplemented and must not be simulated by a general enable switch.
 const cohort=policy.qaUserIds;
 if(!cohort?.length||cohort.length>100||cohort.some(id=>!uuid(id))||new Set(cohort).size!==cohort.length)throw new Error('Progress write authority unavailable');
 if(!input||typeof input.courseSlug!=='string'||!input.courseSlug||input.courseSlug.length>200
  ||typeof input.lessonId!=='string'||!uuid(input.lessonId)||typeof input.operationId!=='string'||!uuid(input.operationId)
  ||(input.completed!==undefined&&typeof input.completed!=='boolean'))throw new Error('Invalid student progress intent');
 const now=policy.now??Date.now(),projectId='vsxxgdzwtscuxcmjfckt';
 const session=await getD1AuthSession(db,token,{projectId,now,sessionTtlMs:policy.sessionTtlMs});
 if(!session||session.user.mustChangePassword||session.user.adminRole)throw new Error('Verified student session required');
 if(!cohort.includes(session.user.id))throw new Error('Student progress request is not authorized');
 const lesson=await policy.resolveLesson(input.courseSlug,input.lessonId);
 if(!lesson||lesson.id!==input.lessonId||typeof lesson.title!=='string')throw new Error('Published lesson required');
 const publication=policy.requirePublicationProof?progressPublicationGuard(lesson.publicationProof,policy.now===undefined):null;
 await assertD1AuthMirrorReady(db,{projectId,now});
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const statements=await prepareD1LegacyAwareLessonCompletionBatch(db.first,{
  userId:session.user.id,email:session.user.email,courseSlug:input.courseSlug,
  lessonId:lesson.id,lessonTitle:lesson.title,operationId:input.operationId,completed:input.completed,
 },{now});
 const writeNow=policy.now??Date.now(),window=authMirrorWindow({projectId,now:writeNow});
 // For real requests expiry/freshness also use the database execution clock:
 // a queued batch must not authorize with a timestamp captured before expiry.
 // Explicit `now` is a trusted backend fixture clock, never HTTP input.
 const liveClock=policy.now===undefined?` AND julianday(session.expires_at)>julianday('now')
 AND julianday(account.email_confirmed_at)<=julianday('now')
 AND (account.banned_until IS NULL OR julianday(account.banned_until)<=julianday('now'))`:'';
 const liveMirror=policy.now===undefined?` AND EXISTS(SELECT 1 FROM d1_auth_sync_state mirror
 WHERE mirror.source_project_id=?10 AND mirror.status='verified'
 AND julianday(mirror.source_snapshot_at) BETWEEN julianday('now','-5 minutes') AND julianday('now')
 AND julianday(mirror.last_verified_at) BETWEEN julianday('now','-5 minutes') AND julianday('now'))`:'';
 const guard=` AND EXISTS(SELECT 1 FROM d1_auth_sessions session JOIN d1_auth_accounts account ON account.user_id=session.user_id
 WHERE session.token_hash=?15 AND session.project_id=?10 AND session.user_id=?1 AND session.revoked_at IS NULL
 AND session.session_version=account.session_version AND julianday(session.expires_at)>julianday(?5)
 AND account.email_confirmed_at IS NOT NULL AND julianday(account.email_confirmed_at)<=julianday(?5)
 AND account.deleted_at IS NULL AND account.is_anonymous=0 AND account.must_change_password=0
 AND (account.banned_until IS NULL OR julianday(account.banned_until)<=julianday(?5))${liveClock})
 AND ${authMirrorReadySql(10,16,5)}${liveMirror}
 AND EXISTS(SELECT 1 FROM json_each(?17) qa WHERE qa.value=?1)`;
 // Provision, progress, operation ledger, enrollment and replay response all
 // carry the guard. The single D1 batch cannot interleave another Auth writer.
 const guarded=statements.map(statement=>{
  if(!statement.sql.includes('/* AUTH_SESSION_GUARD */'))throw new Error('Progress Auth guard unavailable');
  const params=[...statement.params];params[4]=window.stamp;params[5]=window.floor;
  return {sql:statement.sql.replaceAll('/* AUTH_SESSION_GUARD */',guard+(publication?.sql??'')),params:[...params,hash,window.floor,JSON.stringify(cohort),...(publication?.params??[])]};
 });
 return parseProgressResponse(await db.batch(guarded));
}
