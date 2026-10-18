import { getCourseAccessSlugs, isAdminEmail, type CourseAccessLead, type CourseAccessOrder } from "@/lib/course-access";
import { d1LegacyAccessEvidenceSql } from "@/lib/cloudflare/d1-legacy-access-evidence";

// Native QA API reader. Production /learn pages still use Supabase.
// The Worker caller must verify the session server-side before supplying subject,
// and execute this single statement using DB.withSession("first-primary").
export const D1_STUDENT_ACCESS_SQL = `
WITH matching AS (
  SELECT e.id,e.course_id, coalesce(nullif(e.course_slug,''),
    nullif(json_extract(e.metadata,'$.course_slug'),''), course.slug) AS slug,
    legacy.enrollment_id IS NOT NULL AS legacy_derived
  FROM d1_lms_enrollments e
  LEFT JOIN d1_lms_contacts c ON c.id=e.contact_id
  LEFT JOIN d1_lms_courses course ON course.id=e.course_id
  LEFT JOIN d1_lms_legacy_enrollment_owners legacy ON legacy.enrollment_id=e.id
  WHERE (legacy.user_id=?1 OR (legacy.enrollment_id IS NULL AND (e.user_id=?1 OR (length(?2)>0 AND
    lower(trim(coalesce(nullif(c.source_email,''),json_extract(e.metadata,'$.student_email'))))=?2))
    ))
    AND e.status IN ('active','completed')
    AND (e.expires_at IS NULL OR julianday(e.expires_at)>julianday(?3))
    /* tam-source-enrollment-scope */
), published_matching AS (
  SELECT m.id,c.slug,m.legacy_derived FROM matching m
  JOIN d1_lms_courses c ON (c.slug=m.slug OR (m.legacy_derived=0 AND c.id=m.course_id)) AND c.lms_status='published'
    /* tam-source-published-course-scope */
)
SELECT u.admin_role,
  ${d1LegacyAccessEvidenceSql()} AS legacy_evidence_json,
  (SELECT json_object('status',status,'snapshotAt',source_snapshot_at,'verifiedAt',last_verified_at)
    FROM d1_access_sync_state WHERE source_project_id=?4) AS sync_json,
  (SELECT json_group_array(json_object('email',normalized_email,'status',status,
    'courseSlug',course_slug,'courseTitle',course_title,'paymentPlan',payment_plan,
    'orderItems',json(order_items_json))) FROM
    (SELECT * FROM d1_access_orders WHERE normalized_email=?2 AND status='paid' ORDER BY id)) AS orders_json,
  (SELECT json_group_array(json_object('email',normalized_email,'source',source,'createdAt',created_at)) FROM
    (SELECT * FROM d1_access_overrides WHERE normalized_email=?2 AND deleted_at IS NULL
      AND source LIKE 'admin-access-%' ORDER BY id)) AS leads_json,
  (SELECT json_group_array(json_object('id',id,'slug',slug,'legacyDerived',legacy_derived)) FROM
    (SELECT * FROM published_matching ORDER BY id)) AS enrollments_json,
  (SELECT json_group_array(json_object('enrollmentId',p.enrollment_id,'lessonId',p.lesson_id,'status',p.status,'completedAt',p.completed_at))
    FROM d1_lms_progress p WHERE EXISTS(SELECT 1 FROM published_matching m WHERE m.id=p.enrollment_id)) AS progress_json
FROM d1_access_users u WHERE u.id=?1 AND u.normalized_email=?2
`;

// Backend composition only. Source /learn first filters its enrollment RPC by
// resolved slug, then its course catalog by that same slug. Dashboard omits
// both filters and preserves Source mapCourse's course-ID OR slug assignment.
export function scopeD1StudentAccessSql(sql:string,position:number){
  const enrollment='/* tam-source-enrollment-scope */',catalog='/* tam-source-published-course-scope */';
  if(!Number.isInteger(position)||position<5||position>1000||sql.split(enrollment).length!==2||sql.split(catalog).length!==2)throw new Error('Invalid student course scope');
  return sql.replace(enrollment,`AND coalesce(nullif(e.course_slug,''),nullif(json_extract(e.metadata,'$.course_slug'),''),course.slug)=?${position}`)
    .replace(catalog,`AND c.slug=?${position}`);
}

type SnapshotReader = (sql: string, parameters: readonly string[]) => Promise<unknown>;
type VerifiedSubject = { id: string; email: string };
const PROJECT_A = "vsxxgdzwtscuxcmjfckt";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid access snapshot");
  return value as Record<string, unknown>;
}
function decode(value: unknown): unknown {
  if (typeof value !== "string" || value.length > 2 * 1024 * 1024) throw new Error("Invalid access snapshot");
  try { return JSON.parse(value); } catch { throw new Error("Invalid access snapshot"); }
}
function rows(value: unknown): Record<string, unknown>[] {
  const parsed = decode(value);
  if (!Array.isArray(parsed) || parsed.length > 10000) throw new Error("Invalid access snapshot");
  return parsed.map(object);
}
function optionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("Invalid access snapshot");
  return value;
}

export async function readD1StudentCourseAccess(
  readSnapshot: SnapshotReader,
  subject: VerifiedSubject,
  options: { now?: number; maxSnapshotAgeMs?: number } = {},
) {
  const email = subject.email.trim().toLowerCase();
  if (!subject.id || !email) throw new Error("Verified student session required");
  const now = options.now ?? Date.now();
  const maxAge = options.maxSnapshotAgeMs ?? 300000;
  if (!Number.isFinite(now) || !Number.isFinite(maxAge) || maxAge <= 0) throw new Error("Invalid access freshness policy");
  const raw = await readSnapshot(D1_STUDENT_ACCESS_SQL, [subject.id, email, new Date(now).toISOString(), PROJECT_A]);
  if (!raw) throw new Error("Student identity is not in verified projection");
  const snapshot = object(raw);
  const sync = object(decode(snapshot.sync_json));
  for (const field of ["snapshotAt", "verifiedAt"]) {
    const stamp = Date.parse(optionalText(sync[field]) ?? "");
    if (sync.status !== "verified" || !Number.isFinite(stamp) || stamp > now || now - stamp > maxAge) {
      throw new Error("Access projection is not current and verified");
    }
  }
  return deriveD1StudentCourseAccess(snapshot,subject);
}

// Pure calculation for controlled migration verification. This does not grant
// source authority. Runtime callers use readD1StudentCourseAccess and its gate.
export function deriveD1StudentCourseAccess(raw:unknown,subject:VerifiedSubject){
  const snapshot=object(raw),email=subject.email.trim().toLowerCase();
  if(!subject.id||!email)throw new Error("Verified student session required");
  // Admin behavior needs a separate reviewed migration; do not silently treat
  // an administrator as a student or grant privileges from caller metadata.
  if (snapshot.admin_role === "owner" || snapshot.admin_role === "editor" || isAdminEmail(email)) {
    throw new Error("Admin access projection is not implemented");
  }
  const orders: CourseAccessOrder[] = rows(snapshot.orders_json).map((row) => {
    const items = row.orderItems;
    if (items !== null && !Array.isArray(items)) throw new Error("Invalid access snapshot");
    return { email: optionalText(row.email), status: optionalText(row.status),
      courseSlug: optionalText(row.courseSlug), courseTitle: optionalText(row.courseTitle),
      paymentPlan: optionalText(row.paymentPlan), orderItems: items === null ? null : items.map((item) => {
        const entry = object(item);
        return { slug: optionalText(entry.slug), title: optionalText(entry.title) };
      }) };
  });
  const leads: CourseAccessLead[] = rows(snapshot.leads_json).map((row) => ({
    email: optionalText(row.email), source: optionalText(row.source), createdAt: optionalText(row.createdAt),
  }));
  const legacyOwnedSlugs = getCourseAccessSlugs({ email, orders, leads });
  const legacyEvidenceJson = optionalText(snapshot.legacy_evidence_json);
  if (!legacyEvidenceJson) throw new Error("Invalid access snapshot");
  const activeLegacy = new Set(legacyOwnedSlugs);
  const enrollmentIdsBySlug: Record<string, string[]> = Object.create(null);
  const allowedEnrollmentIds = new Set<string>();
  for (const row of rows(snapshot.enrollments_json)) {
    const id = optionalText(row.id), slug = optionalText(row.slug);
    if (!id || !slug) throw new Error("Invalid access snapshot");
    if (row.legacyDerived === 1 && !activeLegacy.has(slug)) continue;
    (enrollmentIdsBySlug[slug] ??= []).push(id);
    allowedEnrollmentIds.add(id);
  }
  const lmsOwnedSlugs = Object.keys(enrollmentIdsBySlug);
  const completedLessonIds = Array.from(new Set(rows(snapshot.progress_json)
    .filter((row) => allowedEnrollmentIds.has(optionalText(row.enrollmentId) ?? "") && (row.status === "completed" || optionalText(row.completedAt)))
    .map((row) => optionalText(row.lessonId)).filter((id): id is string => Boolean(id))));
  return { legacyOwnedSlugs, lmsOwnedSlugs, enrollmentIdsBySlug, completedLessonIds,
    // Internal backend input; do not serialize this proof into HTTP responses.
    legacyAccessProof: { evidenceJson: legacyEvidenceJson, allowedSlugs: legacyOwnedSlugs },
    ownedSlugs: Array.from(new Set([...legacyOwnedSlugs, ...lmsOwnedSlugs])) };
}
