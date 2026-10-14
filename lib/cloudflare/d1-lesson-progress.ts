import { isAdminEmail } from "@/lib/course-access";

// Staging candidate, no route calls this module. The caller verifies Auth and
// resolves lesson ID/title server-side. Execute ALL statements as one D1 batch
// transaction; never invoke them individually or mix with a Supabase writer.
const ELIGIBLE = `WITH eligible_base AS (
 SELECT e.id,e.course_id,e.course_slug,l.id AS lesson_id,course.id AS resolved_course_id
 FROM d1_lms_enrollments e
 LEFT JOIN d1_lms_contacts contact ON contact.id=e.contact_id
 JOIN d1_lms_courses course ON course.slug=e.course_slug AND course.slug=?3 AND course.lms_status='published'
 JOIN d1_lms_modules module ON module.course_id=course.id AND module.status='published'
 JOIN d1_lms_lessons l ON l.module_id=module.id AND l.course_id=course.id AND l.status='published' AND l.id=?4
 WHERE e.status IN ('active','completed') AND (e.expires_at IS NULL OR julianday(e.expires_at)>julianday(?5))
 AND (e.user_id=?1 OR contact.normalized_email=?2)
 AND json_type(e.metadata)='object'
 AND NOT EXISTS (SELECT 1 FROM d1_lms_progress p WHERE p.enrollment_id=e.id AND p.lesson_id=l.id AND json_type(p.metadata)<>'object')
 AND EXISTS (SELECT 1 FROM d1_access_users u WHERE u.id=?1 AND u.normalized_email=?2 AND coalesce(u.admin_role,'') NOT IN ('owner','editor'))
 AND EXISTS (SELECT 1 FROM d1_access_sync_state s WHERE s.source_project_id=?10 AND s.status='verified'
   AND julianday(s.source_snapshot_at) BETWEEN julianday(?6) AND julianday(?5)
   AND julianday(s.last_verified_at) BETWEEN julianday(?6) AND julianday(?5))
)`;
const OP_MATCH = `op.id=?7 AND op.user_id=?1 AND op.normalized_email=?2 AND op.course_slug=?3
 AND op.lesson_id=?4 AND op.completed=?8 AND op.lesson_title=?9 AND ?11 IS NOT NULL
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

type Statement = { sql: string; params: (string | number)[] };
type AtomicBatch = (statements: readonly Statement[]) => Promise<{ results?: Record<string, unknown>[] }[]>;
type ProgressInput = {
  userId: string; email: string; courseSlug: string; lessonId: string;
  lessonTitle: string; operationId: string; completed?: boolean;
};
function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }

export function buildD1LessonCompletionBatch(input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {}): Statement[] {
  const email = input.email.trim().toLowerCase();
  const now = options.now ?? Date.now(), maxAge = options.maxSnapshotAgeMs ?? 300000;
  if (!uuid(input.userId) || !uuid(input.lessonId) || !uuid(input.operationId) || !email || isAdminEmail(email)
    || !input.courseSlug || input.courseSlug.length>200 || input.lessonTitle.length>500
    || !Number.isFinite(now) || !Number.isFinite(maxAge) || maxAge<=0) throw new Error("Invalid verified progress request");
  const params = [input.userId,email,input.courseSlug,input.lessonId,new Date(now).toISOString(),
    new Date(now-maxAge).toISOString(),input.operationId,input.completed===false?0:1,input.lessonTitle,
    "vsxxgdzwtscuxcmjfckt",crypto.randomUUID()];
  return SQL.map(sql=>({sql,params:[...params]}));
}

export async function markD1LessonCompleted(executeAtomicBatch: AtomicBatch, input: ProgressInput, options: { now?: number; maxSnapshotAgeMs?: number } = {}) {
  const results = await executeAtomicBatch(buildD1LessonCompletionBatch(input,options));
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
