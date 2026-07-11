import { normalizeEmail } from "@/lib/crm-v2/normalize";
import type {
  AdminLmsSnapshot,
  LmsCourse,
  LmsEnrollment,
  LmsEnrollmentStatus,
  LmsLesson,
  LmsLessonType,
  LmsModule,
  LmsPublishStatus,
  LmsResource,
  LmsVisibility,
  StudentLmsAccess,
} from "@/lib/lms/types";
import { cleanEmail, cleanPhone, cleanSlug, cleanText, isValidEmail, isValidSlug } from "@/lib/security/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toYouTubeEmbedUrl } from "@/lib/youtube";
import { logStudentActivity } from "@/services/activityLogService";
import {
  collectCommandCenterPages,
  MAX_COMMAND_CENTER_SOURCE_ROWS,
  type CommandCenterAnalysisWindow,
} from "@/lib/admin/command-center-source";
import { ProvisioningOperationLostLeaseError } from "@/services/studentProvisioningOperationService";

type SupabaseClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type Row = Record<string, unknown>;

export type CommandCenterEnrollment = {
  id: string;
  contactId: string | null;
  userId: string | null;
  email: string;
  phone: string;
  courseSlug: string;
  status: string;
  activatedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  accessKind: "paid" | "free" | "trial" | null;
  orderId: string | null;
};

const enrollmentAccessStatuses = new Set(["active", "completed"]);
const enrollmentStatuses = new Set(["active", "paused", "completed", "revoked"]);
const publishStatuses = new Set(["draft", "published", "archived"]);
const lessonTypes = new Set(["video", "text", "file", "link", "live"]);
const resourceTypes = new Set(["link", "file", "worksheet", "template", "video", "other"]);

function getClientOrThrow() {
  const client = createSupabaseAdminClient();

  if (!client) {
    throw new Error("Thiếu Supabase live env/service role để vận hành LMS thật.");
  }

  return client;
}

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function asArray(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function firstRelation(value: unknown): Row {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value));
}

function slugify(value: string) {
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return cleanSlug(ascii || `khoa-hoc-${Date.now()}`);
}

function sanitizeSlug(rawSlug: unknown, fallbackTitle: string) {
  const slug = cleanSlug(rawSlug) || slugify(fallbackTitle);
  if (!isValidSlug(slug)) {
    throw new Error("Slug không hợp lệ. Chỉ dùng chữ thường, số và dấu gạch ngang.");
  }
  return slug;
}

function sanitizeStatus(value: unknown, fallback: LmsPublishStatus = "draft"): LmsPublishStatus {
  const status = String(value ?? fallback).trim().toLowerCase();
  return publishStatuses.has(status) ? (status as LmsPublishStatus) : fallback;
}

function sanitizeVisibility(value: unknown, fallback: LmsVisibility = "enrolled"): LmsVisibility {
  const visibility = String(value ?? fallback).trim().toLowerCase();
  if (visibility === "public" || visibility === "private" || visibility === "enrolled") return visibility;
  return fallback;
}

function sanitizeEnrollmentStatus(value: unknown, fallback: LmsEnrollmentStatus = "active"): LmsEnrollmentStatus {
  const status = String(value ?? fallback).trim().toLowerCase();
  return enrollmentStatuses.has(status) ? (status as LmsEnrollmentStatus) : fallback;
}

function sanitizeLessonType(value: unknown): LmsLessonType {
  const type = String(value ?? "video").trim().toLowerCase();
  return lessonTypes.has(type) ? (type as LmsLessonType) : "video";
}

function sanitizeResourceType(value: unknown) {
  const type = String(value ?? "link").trim().toLowerCase();
  return resourceTypes.has(type) ? type : "other";
}

function lmsStatusToPublicStatus(status: LmsPublishStatus) {
  if (status === "published") return "open";
  if (status === "archived") return "closed";
  return "coming-soon";
}

function publicStatusToLmsStatus(status: unknown): LmsPublishStatus {
  if (status === "open") return "published";
  if (status === "closed") return "archived";
  return "draft";
}

function publishedLessons(course: LmsCourse) {
  return course.modules.flatMap((module) =>
    module.status === "published" ? module.lessons.filter((lesson) => lesson.status === "published") : [],
  );
}

function attachLessonResources(courseRows: Row[], courseResourceRows: Row[]) {
  const courseResourcesByCourse = new Map<string, Row[]>();
  const courseResourcesByLesson = new Map<string, Row[]>();

  for (const resource of courseResourceRows) {
    const courseId = text(resource.course_id);
    const lessonId = text(resource.lesson_id);
    if (courseId) courseResourcesByCourse.set(courseId, [...(courseResourcesByCourse.get(courseId) ?? []), resource]);
    if (lessonId) courseResourcesByLesson.set(lessonId, [...(courseResourcesByLesson.get(lessonId) ?? []), resource]);
  }

  return courseRows.map((course) => ({ course, courseResourcesByCourse, courseResourcesByLesson }));
}

function mapResource(row: Row, fallback: { courseId?: string | null; moduleId?: string | null; lessonId?: string | null } = {}): LmsResource {
  return {
    id: text(row.id),
    courseId: (text(row.course_id, fallback.courseId ?? "") || fallback.courseId) ?? null,
    moduleId: (text(row.module_id, fallback.moduleId ?? "") || fallback.moduleId) ?? null,
    lessonId: (text(row.lesson_id, fallback.lessonId ?? "") || fallback.lessonId) ?? null,
    title: text(row.title, "Tài nguyên"),
    type: text(row.type, "link"),
    url: text(row.url) || text(row.file_url),
    storagePath: text(row.storage_path) || text(row.file_path) || null,
    description: text(row.description),
    position: numberValue(row.sort_order ?? row.position, 1),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || null,
  };
}

function mapLesson(row: Row, courseId: string, moduleId: string, courseResourcesByLesson: Map<string, Row[]>): LmsLesson {
  const lessonId = text(row.id);
  const lessonResources = asArray(row.lesson_resources).map((resource) =>
    mapResource(resource, { courseId, moduleId, lessonId }),
  );
  const attachedResources = (courseResourcesByLesson.get(lessonId) ?? []).map((resource) =>
    mapResource(resource, { courseId, moduleId, lessonId }),
  );

  return {
    id: lessonId,
    courseId: text(row.course_id, courseId) || courseId,
    moduleId,
    title: text(row.title, "Bài học"),
    slug: text(row.slug) || lessonId,
    description: text(row.description),
    content: text(row.content) || text(row.body),
    lessonType: sanitizeLessonType(row.lesson_type),
    duration: text(row.duration),
    youtubeUrl: text(row.youtube_url),
    embedUrl: text(row.embed_url) || toYouTubeEmbedUrl(text(row.youtube_url)),
    accessType:
      row.access_type === "free_preview" || row.access_type === "locked" || row.access_type === "enrolled_only"
        ? (row.access_type as "free_preview" | "enrolled_only" | "locked")
        : "enrolled_only",
    position: numberValue(row.sort_order ?? row.position, 1),
    status: sanitizeStatus(row.status, "published"),
    publishedAt: text(row.published_at) || null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || null,
    resources: [...lessonResources, ...attachedResources].sort((a, b) => a.position - b.position),
  };
}

function mapModule(row: Row, courseId: string, courseResourcesByLesson: Map<string, Row[]>): LmsModule {
  const moduleId = text(row.id);
  const lessons = asArray(row.lessons)
    .map((lesson) => mapLesson(lesson, courseId, moduleId, courseResourcesByLesson))
    .sort((a, b) => a.position - b.position);

  return {
    id: moduleId,
    courseId,
    title: text(row.title, "Module"),
    description: text(row.description),
    position: numberValue(row.sort_order ?? row.position, 1),
    status: sanitizeStatus(row.status, "published"),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || null,
    lessons,
  };
}

function buildStats(course: Omit<LmsCourse, "stats">): LmsCourse["stats"] {
  const enrollmentCount = (status: LmsEnrollmentStatus) =>
    course.enrollments.filter((enrollment) => enrollment.status === status).length;

  return {
    modules: course.modules.length,
    lessons: course.modules.reduce((total, module) => total + module.lessons.length, 0),
    publishedLessons: publishedLessons(course as LmsCourse).length,
    activeStudents: enrollmentCount("active"),
    pausedStudents: enrollmentCount("paused"),
    completedStudents: enrollmentCount("completed"),
    revokedStudents: enrollmentCount("revoked"),
  };
}

function mapCourse(
  row: Row,
  courseResourceRows: Row[],
  courseResourcesByLesson: Map<string, Row[]>,
  enrollments: LmsEnrollment[],
): LmsCourse {
  const courseId = text(row.id);
  const courseSlug = text(row.slug);
  const modules = asArray(row.course_modules)
    .map((module) => mapModule(module, courseId, courseResourcesByLesson))
    .sort((a, b) => a.position - b.position);
  const courseEnrollments = enrollments.filter((enrollment) => enrollment.courseSlug === courseSlug || enrollment.courseId === courseId);
  const course: Omit<LmsCourse, "stats"> = {
    id: courseId,
    position: numberValue(row.sort_order ?? row.position, 1),
    title: text(row.title, "Khóa học"),
    slug: courseSlug,
    description: text(row.description),
    shortDescription: text(row.short_description),
    thumbnailImage: text(row.thumbnail_image),
    bannerImage: text(row.banner_image),
    previewVideoUrl: text(row.preview_video_url),
    status: sanitizeStatus(row.lms_status, publicStatusToLmsStatus(row.status)),
    visibility: sanitizeVisibility(row.visibility),
    publicStatus: text(row.status, "open"),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || null,
    modules,
    resources: courseResourceRows
      .filter((resource) => text(resource.course_id) === courseId && !text(resource.lesson_id))
      .map((resource) => mapResource(resource, { courseId }))
      .sort((a, b) => a.position - b.position),
    enrollments: courseEnrollments,
  };

  return {
    ...course,
    stats: buildStats(course),
  };
}

function buildEnrollmentCourseIndex(courseRows: Row[]) {
  const byId = new Map<string, { slug: string; title: string; publishedLessonCount: number }>();
  const bySlug = new Map<string, { id: string; title: string; publishedLessonCount: number }>();

  for (const course of courseRows) {
    const courseId = text(course.id);
    const courseSlug = text(course.slug);
    const modules = asArray(course.course_modules);
    const publishedLessonCount = modules.reduce((total, module) => {
      if (sanitizeStatus(module.status, "published") !== "published") return total;
      return (
        total +
        asArray(module.lessons).filter((lesson) => sanitizeStatus(lesson.status, "published") === "published").length
      );
    }, 0);
    const title = text(course.title, courseSlug || courseId);
    if (courseId) byId.set(courseId, { slug: courseSlug, title, publishedLessonCount });
    if (courseSlug) bySlug.set(courseSlug, { id: courseId, title, publishedLessonCount });
  }

  return { byId, bySlug };
}

function mapEnrollment(row: Row, courseIndex: ReturnType<typeof buildEnrollmentCourseIndex>, progressRows: Row[]): LmsEnrollment {
  const metadata = asRecord(row.metadata);
  const contact = firstRelation(row.contacts);
  const order = firstRelation(row.orders);
  const courseId = text(row.course_id) || null;
  const courseFromId = courseId ? courseIndex.byId.get(courseId) : undefined;
  const courseSlug = text(row.course_slug) || text(metadata.course_slug) || courseFromId?.slug || "";
  const courseFromSlug = courseSlug ? courseIndex.bySlug.get(courseSlug) : undefined;
  const enrollmentId = text(row.id);
  const rows = progressRows.filter((progress) => text(progress.enrollment_id) === enrollmentId);
  const completedLessons = rows.filter((progress) => text(progress.status) === "completed" || text(progress.completed_at)).length;
  const totalLessons = courseFromSlug?.publishedLessonCount ?? courseFromId?.publishedLessonCount ?? 0;
  const storedProgress = numberValue(metadata.progress_percent, 0);
  const computedProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : storedProgress;

  return {
    id: enrollmentId,
    contactId: text(row.contact_id) || null,
    userId: text(row.user_id) || null,
    courseId,
    courseSlug,
    courseTitle: courseFromSlug?.title || courseFromId?.title || text(metadata.course_title) || text(order.product_name) || courseSlug,
    studentName: text(contact.full_name) || text(metadata.student_name) || text(contact.email) || "Học viên",
    email: normalizeEmail(text(contact.email) || text(metadata.student_email)) ?? "",
    phone: text(contact.phone) || text(metadata.student_phone),
    status: sanitizeEnrollmentStatus(row.status),
    progressPercent: Math.max(0, Math.min(100, computedProgress)),
    completedLessons,
    totalLessons,
    lastAccessedAt: text(row.last_seen_at) || null,
    enrolledAt: text(row.activated_at) || text(row.created_at) || null,
    expiresAt: text(row.expires_at) || null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at) || null,
  };
}

async function fetchCourseRows(client: SupabaseClient) {
  const { data, error } = await client
    .from("courses")
    .select("*,course_modules(*,lessons(*,lesson_resources(*)))")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Không đọc được danh sách khóa học: ${error.message}`);
  }

  return asArray(data);
}

async function fetchCourseResourceRows(client: SupabaseClient) {
  const { data, error } = await client.from("course_resources").select("*").order("sort_order", { ascending: true });

  if (error) {
    return [];
  }

  return asArray(data);
}

async function fetchEnrollmentRows(client: SupabaseClient) {
  const { data, error } = await client.rpc("crm_v2_lms_enrollments_raw");

  if (error) {
    return { enrollmentRows: [], progressRows: [] };
  }

  const payload = asRecord(data);

  return {
    enrollmentRows: asArray(payload.enrollments),
    progressRows: asArray(payload.progress),
  };
}

export async function getCommandCenterEnrollmentsStrict(
  window: CommandCenterAnalysisWindow,
): Promise<CommandCenterEnrollment[]> {
  const client = getClientOrThrow();
  const rows = await collectCommandCenterPages({
    getId: (row: Row) => text(row.id),
    fetchPage: async ({ offset, limit }) => {
      const { data, error } = await client.rpc("crm_v2_command_center_enrollments_page", {
        p_analysis_from: window.analysisFrom,
        p_analysis_to: window.analysisToExclusive,
        p_offset: offset,
        p_limit: limit,
      });
      if (error) throw new Error(`Could not read command center enrollments: ${error.message}`);
      const payload = asRecord(data);
      const pageRows = asArray(payload.rows);
      const totalCount = numberValue(payload.total_count, -1);
      if (totalCount < pageRows.length || typeof payload.has_more !== "boolean") {
        throw new Error("Command center enrollment page is invalid");
      }
      if (totalCount > MAX_COMMAND_CENTER_SOURCE_ROWS) {
        throw new Error("Command center enrollment source is incomplete at the safety cap");
      }
      return { rows: pageRows, hasMore: payload.has_more };
    },
  });

  return rows.map((row) => {
    const contact = firstRelation(row.contacts);
    const metadata = asRecord(row.metadata);
    const accessKindValue = text(metadata.access_kind).trim().toLowerCase();
    const accessKind = accessKindValue === "paid" || accessKindValue === "free" || accessKindValue === "trial"
      ? accessKindValue
      : null;
    return {
      id: text(row.id),
      contactId: text(row.contact_id) || null,
      userId: text(row.user_id) || null,
      email: normalizeEmail(text(contact.email) || text(metadata.student_email)) ?? "",
      phone: text(contact.phone) || text(metadata.student_phone),
      courseSlug: text(row.course_slug) || text(metadata.course_slug),
      status: text(row.status),
      activatedAt: text(row.activated_at) || null,
      createdAt: text(row.created_at),
      expiresAt: text(row.expires_at) || null,
      accessKind,
      orderId: text(row.order_id) || null,
    };
  });
}

async function loadAdminLmsData(client: SupabaseClient) {
  const [courseRows, courseResourceRows, enrollmentResult] = await Promise.all([
    fetchCourseRows(client),
    fetchCourseResourceRows(client),
    fetchEnrollmentRows(client),
  ]);
  const courseIndex = buildEnrollmentCourseIndex(courseRows);
  const enrollments = enrollmentResult.enrollmentRows
    .map((row) => mapEnrollment(row, courseIndex, enrollmentResult.progressRows))
    .filter((enrollment) => Boolean(enrollment.courseSlug));
  const attached = attachLessonResources(courseRows, courseResourceRows);
  const courses = attached.map(({ course, courseResourcesByLesson }) =>
    mapCourse(course, courseResourceRows, courseResourcesByLesson, enrollments),
  );

  return { courses, enrollments, progressRows: enrollmentResult.progressRows };
}

export async function listAdminLmsCourses() {
  const client = getClientOrThrow();
  const { courses } = await loadAdminLmsData(client);
  return courses;
}

export async function getAdminLmsSnapshot(input: { selectedCourseSlug?: string | null } = {}): Promise<AdminLmsSnapshot> {
  try {
    const courses = await listAdminLmsCourses();
    const selectedCourseSlug = input.selectedCourseSlug || courses[0]?.slug || "";
    const selectedCourse = courses.find((course) => course.slug === selectedCourseSlug) ?? courses[0] ?? null;

    return {
      ok: true,
      generatedAt: nowIso(),
      courses,
      selectedCourseSlug: selectedCourse?.slug ?? selectedCourseSlug,
      selectedCourse,
      enrollments: courses.flatMap((course) => course.enrollments),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không đọc được dữ liệu LMS.",
      generatedAt: nowIso(),
      courses: [],
      selectedCourseSlug: input.selectedCourseSlug ?? "",
      selectedCourse: null,
      enrollments: [],
    };
  }
}

async function findCourseRow(client: SupabaseClient, idOrSlug: string) {
  const column = isUuid(idOrSlug) ? "id" : "slug";
  const { data, error } = await client.from("courses").select("*").eq(column, idOrSlug).maybeSingle();

  if (error) throw new Error(`Không đọc được khóa học: ${error.message}`);
  const row = asRecord(data);
  if (!text(row.id)) throw new Error("Không tìm thấy khóa học.");
  return row;
}

async function ensureCourseSlugIsAvailable(client: SupabaseClient, slug: string, ignoreCourseId?: string) {
  const { data, error } = await client.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Không kiểm tra được slug khóa học: ${error.message}`);
  const existingId = text(asRecord(data).id);
  if (existingId && existingId !== ignoreCourseId) throw new Error("Slug khóa học đã tồn tại.");
}

async function ensureLessonSlugIsAvailable(client: SupabaseClient, courseId: string, slug: string, ignoreLessonId?: string) {
  const { data, error } = await client
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Không kiểm tra được slug bài học: ${error.message}`);
  const existingId = text(asRecord(data).id);
  if (existingId && existingId !== ignoreLessonId) throw new Error("Slug bài học đã tồn tại trong khóa này.");
}

async function getNextPosition(client: SupabaseClient, table: string, eqColumn: string, eqValue: string) {
  const { data } = await client.from(table).select("sort_order").eq(eqColumn, eqValue).order("sort_order", { ascending: false }).limit(1);
  return numberValue(asArray(data)[0]?.sort_order, 0) + 1;
}

async function findModuleRow(client: SupabaseClient, moduleId: string) {
  const { data, error } = await client.from("course_modules").select("*").eq("id", moduleId).maybeSingle();
  if (error) throw new Error(`Không đọc được module: ${error.message}`);
  const row = asRecord(data);
  if (!text(row.id)) throw new Error("Không tìm thấy module.");
  return row;
}

async function findLessonRow(client: SupabaseClient, lessonId: string) {
  const { data, error } = await client.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (error) throw new Error(`Không đọc được bài học: ${error.message}`);
  const row = asRecord(data);
  if (!text(row.id)) throw new Error("Không tìm thấy bài học.");
  return row;
}

export async function createLmsCourse(input: {
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  thumbnailImage?: string;
  bannerImage?: string;
  previewVideoUrl?: string;
  status?: LmsPublishStatus;
  visibility?: LmsVisibility;
}) {
  const client = getClientOrThrow();
  const title = cleanText(input.title, 220);
  if (!title) throw new Error("Thiếu tiêu đề khóa học.");
  const slug = sanitizeSlug(input.slug, title);
  await ensureCourseSlugIsAvailable(client, slug);
  const status = sanitizeStatus(input.status, "draft");
  const { data, error } = await client
    .from("courses")
    .insert({
      title,
      slug,
      short_description: cleanText(input.shortDescription ?? input.description, 500),
      description: cleanText(input.description, 5000),
      thumbnail_image: cleanText(input.thumbnailImage, 500),
      banner_image: cleanText(input.bannerImage, 500),
      preview_video_url: cleanText(input.previewVideoUrl, 500),
      status: lmsStatusToPublicStatus(status),
      lms_status: status,
      visibility: sanitizeVisibility(input.visibility),
      updated_at: nowIso(),
      cta_text: "Vào khóa học",
    })
    .select("id,slug")
    .single();

  if (error) throw new Error(`Không tạo được khóa học: ${error.message}`);
  return asRecord(data);
}

export async function updateLmsCourse(input: {
  courseId: string;
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  thumbnailImage?: string;
  bannerImage?: string;
  previewVideoUrl?: string;
  status?: LmsPublishStatus;
  visibility?: LmsVisibility;
}) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId);
  const updates: Row = { updated_at: nowIso() };
  if (input.title !== undefined) updates.title = cleanText(input.title, 220);
  if (input.description !== undefined) updates.description = cleanText(input.description, 5000);
  if (input.shortDescription !== undefined) updates.short_description = cleanText(input.shortDescription, 500);
  if (input.thumbnailImage !== undefined) updates.thumbnail_image = cleanText(input.thumbnailImage, 500);
  if (input.bannerImage !== undefined) updates.banner_image = cleanText(input.bannerImage, 500);
  if (input.previewVideoUrl !== undefined) updates.preview_video_url = cleanText(input.previewVideoUrl, 500);
  if (input.visibility !== undefined) updates.visibility = sanitizeVisibility(input.visibility);
  if (input.status !== undefined) {
    const status = sanitizeStatus(input.status);
    updates.lms_status = status;
    updates.status = lmsStatusToPublicStatus(status);
  }
  if (input.slug !== undefined) {
    const slug = sanitizeSlug(input.slug, text(updates.title) || text(course.title));
    await ensureCourseSlugIsAvailable(client, slug, text(course.id));
    updates.slug = slug;
  }

  const { error } = await client.from("courses").update(updates).eq("id", text(course.id));
  if (error) throw new Error(`Không lưu được khóa học: ${error.message}`);
  return { ok: true };
}

export async function reorderLmsCourses(input: { courseIds: string[] }) {
  const client = getClientOrThrow();
  const ids = [...new Set(input.courseIds)];
  if (!ids.length || ids.length !== input.courseIds.length) throw new Error("Danh sách khóa học sắp xếp không hợp lệ.");

  const { data, error } = await client.from("courses").select("id,sort_order").in("id", ids);
  if (error) throw new Error(`Không kiểm tra được khóa học: ${error.message}`);
  const rows = asArray(data);
  if (rows.length !== ids.length) throw new Error("Danh sách khóa học sắp xếp có khóa không tồn tại.");

  const currentPositions = new Map(rows.map((row) => [text(row.id), numberValue(row.sort_order, 0)]));
  const changed = ids.flatMap((id, index) => (currentPositions.get(id) === index + 1 ? [] : [{ id, position: index + 1 }]));
  const results = await Promise.all(changed.map(({ id, position }) => client.from("courses").update({ sort_order: position, updated_at: nowIso() }).eq("id", id)));
  const failed = results.find((result) => result.error)?.error;
  if (failed) throw new Error(`Không lưu được thứ tự khóa học: ${failed.message}`);
  return { ok: true, changed: changed.length };
}

export async function deleteLmsCourse(input: { courseId: string; archiveIfUnsafe?: boolean }) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId);
  const courseId = text(course.id);
  const courseSlug = text(course.slug);
  const { enrollments } = await loadAdminLmsData(client);
  const enrollmentCount = enrollments.filter((enrollment) => enrollment.courseId === courseId || enrollment.courseSlug === courseSlug).length;

  if (enrollmentCount > 0 || input.archiveIfUnsafe) {
    await updateLmsCourse({ courseId, status: "archived" });
    return { ok: true, archived: true };
  }

  const { error } = await client.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(`Không xóa được khóa học: ${error.message}`);
  return { ok: true, archived: false };
}

export async function createLmsModule(input: {
  courseId: string;
  title: string;
  description?: string;
  status?: LmsPublishStatus;
  position?: number;
}) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId);
  const title = cleanText(input.title, 220);
  if (!title) throw new Error("Thiếu tên module.");
  const position = input.position ?? (await getNextPosition(client, "course_modules", "course_id", text(course.id)));
  const { data, error } = await client
    .from("course_modules")
    .insert({
      course_id: text(course.id),
      title,
      description: cleanText(input.description, 2000),
      status: sanitizeStatus(input.status, "published"),
      sort_order: position,
      updated_at: nowIso(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Không tạo được module: ${error.message}`);
  return asRecord(data);
}

export async function updateLmsModule(input: {
  moduleId: string;
  title?: string;
  description?: string;
  status?: LmsPublishStatus;
  position?: number;
}) {
  const client = getClientOrThrow();
  await findModuleRow(client, input.moduleId);
  const updates: Row = { updated_at: nowIso() };
  if (input.title !== undefined) updates.title = cleanText(input.title, 220);
  if (input.description !== undefined) updates.description = cleanText(input.description, 2000);
  if (input.status !== undefined) updates.status = sanitizeStatus(input.status, "published");
  if (input.position !== undefined) updates.sort_order = Math.max(1, Math.round(input.position));
  const { error } = await client.from("course_modules").update(updates).eq("id", input.moduleId);
  if (error) throw new Error(`Không lưu được module: ${error.message}`);
  return { ok: true };
}

export async function deleteLmsModule(input: { moduleId: string; cascadeLessons?: boolean }) {
  const client = getClientOrThrow();
  const moduleRow = await findModuleRow(client, input.moduleId);
  const { count } = await client.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", input.moduleId);
  if ((count ?? 0) > 0 && !input.cascadeLessons) {
    throw new Error("Module đang có bài học. Hãy xóa/chuyển bài học trước khi xóa module.");
  }
  const { error } = await client.from("course_modules").delete().eq("id", text(moduleRow.id));
  if (error) throw new Error(`Không xóa được module: ${error.message}`);
  return { ok: true };
}

export async function reorderLmsModules(input: { courseId: string; moduleIds: string[] }) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId);
  const ids = Array.from(new Set(input.moduleIds.filter(isUuid)));
  if (!ids.length) throw new Error("Thiếu danh sách module cần sắp xếp.");
  const { data, error } = await client.from("course_modules").select("id").eq("course_id", text(course.id)).in("id", ids);
  if (error) throw new Error(`Không kiểm tra được module: ${error.message}`);
  if (asArray(data).length !== ids.length) throw new Error("Danh sách module sắp xếp không thuộc cùng khóa học.");
  await Promise.all(ids.map((id, index) => client.from("course_modules").update({ sort_order: index + 1, updated_at: nowIso() }).eq("id", id)));
  return { ok: true };
}

export async function createLmsLesson(input: {
  courseId: string;
  moduleId: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  lessonType?: LmsLessonType;
  duration?: string;
  youtubeUrl?: string;
  embedUrl?: string;
  accessType?: "free_preview" | "enrolled_only" | "locked";
  status?: LmsPublishStatus;
  position?: number;
}) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId);
  const moduleRow = await findModuleRow(client, input.moduleId);
  if (text(moduleRow.course_id) !== text(course.id)) throw new Error("Module không thuộc khóa học đã chọn.");
  const title = cleanText(input.title, 220);
  if (!title) throw new Error("Thiếu tiêu đề bài học.");
  const slug = sanitizeSlug(input.slug, title);
  await ensureLessonSlugIsAvailable(client, text(course.id), slug);
  const status = sanitizeStatus(input.status, "draft");
  const position = input.position ?? (await getNextPosition(client, "lessons", "module_id", input.moduleId));
  const youtubeUrl = cleanText(input.youtubeUrl, 500);
  const { data, error } = await client
    .from("lessons")
    .insert({
      course_id: text(course.id),
      module_id: input.moduleId,
      title,
      slug,
      description: cleanText(input.description, 3000),
      content: cleanText(input.content, 40000),
      lesson_type: sanitizeLessonType(input.lessonType),
      duration: cleanText(input.duration, 160),
      youtube_url: youtubeUrl,
      embed_url: cleanText(input.embedUrl, 500) || toYouTubeEmbedUrl(youtubeUrl),
      access_type: input.accessType ?? "enrolled_only",
      status,
      published_at: status === "published" ? nowIso() : null,
      sort_order: position,
      updated_at: nowIso(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Không tạo được bài học: ${error.message}`);
  return asRecord(data);
}

export async function updateLmsLesson(input: {
  lessonId: string;
  moduleId?: string;
  title?: string;
  slug?: string;
  description?: string;
  content?: string;
  lessonType?: LmsLessonType;
  duration?: string;
  youtubeUrl?: string;
  embedUrl?: string;
  accessType?: "free_preview" | "enrolled_only" | "locked";
  status?: LmsPublishStatus;
  position?: number;
}) {
  const client = getClientOrThrow();
  const lesson = await findLessonRow(client, input.lessonId);
  let courseId = text(lesson.course_id);
  const updates: Row = { updated_at: nowIso() };
  if (input.moduleId !== undefined) {
    const moduleRow = await findModuleRow(client, input.moduleId);
    updates.module_id = input.moduleId;
    updates.course_id = text(moduleRow.course_id);
    courseId = text(moduleRow.course_id);
  }
  if (!courseId) {
    const moduleRow = await findModuleRow(client, text(updates.module_id) || text(lesson.module_id));
    courseId = text(moduleRow.course_id);
    updates.course_id = courseId;
  }
  if (input.title !== undefined) updates.title = cleanText(input.title, 220);
  if (input.description !== undefined) updates.description = cleanText(input.description, 3000);
  if (input.content !== undefined) updates.content = cleanText(input.content, 40000);
  if (input.lessonType !== undefined) updates.lesson_type = sanitizeLessonType(input.lessonType);
  if (input.duration !== undefined) updates.duration = cleanText(input.duration, 160);
  if (input.youtubeUrl !== undefined) {
    updates.youtube_url = cleanText(input.youtubeUrl, 500);
    if (input.embedUrl === undefined) updates.embed_url = toYouTubeEmbedUrl(String(updates.youtube_url));
  }
  if (input.embedUrl !== undefined) updates.embed_url = cleanText(input.embedUrl, 500);
  if (input.accessType !== undefined) updates.access_type = input.accessType;
  if (input.position !== undefined) updates.sort_order = Math.max(1, Math.round(input.position));
  if (input.status !== undefined) {
    const status = sanitizeStatus(input.status, "published");
    updates.status = status;
    if (status === "published" && !text(lesson.published_at)) updates.published_at = nowIso();
  }
  if (input.slug !== undefined) {
    const slug = sanitizeSlug(input.slug, text(updates.title) || text(lesson.title));
    await ensureLessonSlugIsAvailable(client, courseId, slug, text(lesson.id));
    updates.slug = slug;
  }
  const { error } = await client.from("lessons").update(updates).eq("id", input.lessonId);
  if (error) throw new Error(`Không lưu được bài học: ${error.message}`);
  return { ok: true };
}

export async function deleteLmsLesson(input: { lessonId: string; archiveIfProgress?: boolean }) {
  const client = getClientOrThrow();
  const lesson = await findLessonRow(client, input.lessonId);
  const { progressRows } = await loadAdminLmsData(client);
  const progressCount = progressRows.filter((progress) => text(progress.lesson_id) === input.lessonId).length;
  if (progressCount > 0 || input.archiveIfProgress) {
    await updateLmsLesson({ lessonId: input.lessonId, status: "archived" });
    return { ok: true, archived: true };
  }
  const { error } = await client.from("lessons").delete().eq("id", text(lesson.id));
  if (error) throw new Error(`Không xóa được bài học: ${error.message}`);
  return { ok: true, archived: false };
}

export async function reorderLmsLessons(input: { moduleId: string; lessonIds: string[] }) {
  const client = getClientOrThrow();
  await findModuleRow(client, input.moduleId);
  const ids = Array.from(new Set(input.lessonIds.filter(isUuid)));
  if (!ids.length) throw new Error("Thiếu danh sách bài học cần sắp xếp.");
  const { data, error } = await client.from("lessons").select("id").eq("module_id", input.moduleId).in("id", ids);
  if (error) throw new Error(`Không kiểm tra được bài học: ${error.message}`);
  if (asArray(data).length !== ids.length) throw new Error("Danh sách bài học sắp xếp không thuộc cùng module.");
  await Promise.all(ids.map((id, index) => client.from("lessons").update({ sort_order: index + 1, updated_at: nowIso() }).eq("id", id)));
  return { ok: true };
}

export async function createLmsResource(input: {
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title: string;
  type?: string;
  url: string;
  storagePath?: string | null;
  description?: string;
  position?: number;
}) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId);
  const title = cleanText(input.title, 220);
  const url = cleanText(input.url, 1000);
  if (!title || !url) throw new Error("Thiếu tiêu đề hoặc URL tài nguyên.");
  const position = input.position ?? (await getNextPosition(client, "course_resources", "course_id", text(course.id)));
  const { data, error } = await client
    .from("course_resources")
    .insert({
      course_id: text(course.id),
      module_id: input.moduleId || null,
      lesson_id: input.lessonId || null,
      title,
      type: sanitizeResourceType(input.type),
      url,
      storage_path: cleanText(input.storagePath, 1000) || null,
      description: cleanText(input.description, 2000),
      sort_order: position,
      updated_at: nowIso(),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Không tạo được tài nguyên: ${error.message}`);
  return asRecord(data);
}

export async function updateLmsResource(input: {
  resourceId: string;
  title?: string;
  type?: string;
  url?: string;
  storagePath?: string | null;
  description?: string;
  position?: number;
  moduleId?: string | null;
  lessonId?: string | null;
}) {
  const client = getClientOrThrow();
  const updates: Row = { updated_at: nowIso() };
  if (input.title !== undefined) updates.title = cleanText(input.title, 220);
  if (input.type !== undefined) updates.type = sanitizeResourceType(input.type);
  if (input.url !== undefined) updates.url = cleanText(input.url, 1000);
  if (input.storagePath !== undefined) updates.storage_path = cleanText(input.storagePath, 1000) || null;
  if (input.description !== undefined) updates.description = cleanText(input.description, 2000);
  if (input.position !== undefined) updates.sort_order = Math.max(1, Math.round(input.position));
  if (input.moduleId !== undefined) updates.module_id = input.moduleId || null;
  if (input.lessonId !== undefined) updates.lesson_id = input.lessonId || null;
  const { error } = await client.from("course_resources").update(updates).eq("id", input.resourceId);
  if (error) throw new Error(`Không lưu được tài nguyên: ${error.message}`);
  return { ok: true };
}

export async function deleteLmsResource(input: { resourceId: string }) {
  const client = getClientOrThrow();
  const { error } = await client.from("course_resources").delete().eq("id", input.resourceId);
  if (error) throw new Error(`Không xóa được tài nguyên: ${error.message}`);
  return { ok: true };
}

export async function addLmsEnrollment(input: {
  courseId?: string;
  courseSlug?: string;
  studentName?: string;
  email?: string;
  phone?: string;
  userId?: string | null;
  status?: LmsEnrollmentStatus;
  expiresAt?: string | null;
}) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseId || input.courseSlug || "");
  const courseId = text(course.id);
  const courseSlug = text(course.slug);
  const { data, error } = await client.rpc("crm_v2_lms_upsert_enrollment", {
    p_course_id: courseId,
    p_course_slug: courseSlug,
    p_course_title: text(course.title),
    p_student_name: cleanText(input.studentName, 160),
    p_email: cleanEmail(input.email),
    p_phone: cleanPhone(input.phone),
    p_user_id: isUuid(input.userId) ? input.userId : null,
    p_status: sanitizeEnrollmentStatus(input.status, "active"),
    p_expires_at: input.expiresAt || null,
  });
  if (error) throw new Error(`Không thêm được học viên vào khóa: ${error.message}`);
  return asRecord(data);
}

export async function provisionLmsEnrollmentAtomically(input: {
  operationId: string;
  leaseToken: string;
  mode: "free" | "trial";
  studentName: string;
  email: string;
  phone: string;
  userId: string | null;
  courseSlug: string;
  expiresAt: string | null;
}) {
  const client = getClientOrThrow();
  const course = await findCourseRow(client, input.courseSlug);
  const { data, error } = await client.rpc("provision_admin_student_enrollment", {
    p_operation_id: input.operationId,
    p_lease_token: input.leaseToken,
    p_course_id: text(course.id), p_course_slug: text(course.slug), p_course_title: text(course.title),
    p_student_name: cleanText(input.studentName, 160), p_email: cleanEmail(input.email), p_phone: cleanPhone(input.phone),
    p_user_id: isUuid(input.userId) ? input.userId : null, p_mode: input.mode, p_expires_at: input.expiresAt,
  });
  if (error) throw new Error(`Không cấp được quyền học nguyên tử: ${error.message}`);
  const row = asRecord(data);
  const outcome = text(row.outcome);
  if (outcome === "lost_lease") throw new ProvisioningOperationLostLeaseError();
  const accessKind = text(row.access_kind);
  if (!isUuid(text(row.id)) || !["granted", "already_unlimited", "already_paid"].includes(outcome)
      || !["paid", "free", "trial"].includes(accessKind)
      || text(row.provisioning_operation_id) !== input.operationId) {
    throw new Error("Kết quả cấp quyền học không hợp lệ.");
  }
  if (input.mode === "trial" && outcome === "already_unlimited" && accessKind === "trial") {
    throw new Error("Kết quả bảo toàn quyền không giới hạn không hợp lệ.");
  }
  return { id: text(row.id), outcome: outcome as "granted" | "already_unlimited" | "already_paid", accessKind, expiresAt: text(row.expires_at) || null };
}
export async function updateLmsEnrollment(input: {
  enrollmentId: string;
  status?: LmsEnrollmentStatus;
  expiresAt?: string | null;
  userId?: string | null;
}) {
  const client = getClientOrThrow();
  const { courses } = await loadAdminLmsData(client);
  const existingEnrollment = courses
    .flatMap((course) => course.enrollments)
    .find((enrollment) => enrollment.id === input.enrollmentId);
  if (!existingEnrollment) throw new Error("Không tìm thấy enrollment học viên.");

  const { error } = await client.rpc("crm_v2_lms_update_enrollment", {
    p_enrollment_id: input.enrollmentId,
    p_status: input.status !== undefined ? sanitizeEnrollmentStatus(input.status) : existingEnrollment.status,
    p_expires_at: input.expiresAt !== undefined ? input.expiresAt || null : existingEnrollment.expiresAt,
    p_user_id: input.userId !== undefined ? (isUuid(input.userId) ? input.userId : null) : existingEnrollment.userId,
  });
  if (error) throw new Error(`Không cập nhật được trạng thái học viên: ${error.message}`);
  return { ok: true };
}
export async function removeLmsEnrollment(input: { enrollmentId: string }) {
  return updateLmsEnrollment({ enrollmentId: input.enrollmentId, status: "revoked" });
}

function findMatchingEnrollments(
  courses: LmsCourse[],
  input: { email?: string | null; userId?: string | null; courseSlug?: string | null },
) {
  const normalizedEmail = normalizeEmail(input.email);
  const rows = new Map<string, LmsEnrollment>();
  for (const course of courses) {
    if (input.courseSlug && course.slug !== input.courseSlug) continue;
    for (const enrollment of course.enrollments) {
      if (!isEnrollmentCurrentlyActive(enrollment)) continue;
      const matchesUser = Boolean(input.userId && enrollment.userId === input.userId);
      const matchesEmail = Boolean(normalizedEmail && normalizeEmail(enrollment.email) === normalizedEmail);
      if (matchesUser || matchesEmail) rows.set(enrollment.id, enrollment);
    }
  }
  return Array.from(rows.values());
}

export function isEnrollmentCurrentlyActive(enrollment: Pick<LmsEnrollment, "status" | "expiresAt">, now = Date.now()) {
  if (!enrollmentAccessStatuses.has(enrollment.status)) return false;
  if (!enrollment.expiresAt) return true;
  const expiry = Date.parse(enrollment.expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}
function activePublishedCourses(courses: LmsCourse[]) {
  return courses.filter((course) => course.status === "published");
}

export async function getStudentLmsAccess(input: {
  email?: string | null;
  userId?: string | null;
  isAdmin?: boolean;
}): Promise<StudentLmsAccess> {
  const client = createSupabaseAdminClient();
  if (!client) {
    return { ownedSlugs: [], progressBySlug: {}, completedLessonIds: [], enrollmentIdsBySlug: {} };
  }

  const { courses, progressRows } = await loadAdminLmsData(client);
  const published = activePublishedCourses(courses);

  if (input.isAdmin) {
    return {
      ownedSlugs: published.map((course) => course.slug),
      progressBySlug: Object.fromEntries(published.map((course) => [course.slug, 0])),
      completedLessonIds: [],
      enrollmentIdsBySlug: {},
    };
  }

  const enrollmentRows = findMatchingEnrollments(published, input);
  const enrollmentIds = new Set(enrollmentRows.map((row) => row.id));
  const completedLessonIds = progressRows
    .filter((row) => enrollmentIds.has(text(row.enrollment_id)) && (text(row.status) === "completed" || text(row.completed_at)))
    .map((row) => text(row.lesson_id))
    .filter(Boolean);
  const allowedCourses = published.filter((course) =>
    course.enrollments.some((enrollment) => enrollmentIds.has(enrollment.id) && enrollmentAccessStatuses.has(enrollment.status)),
  );

  return {
    ownedSlugs: allowedCourses.map((course) => course.slug),
    progressBySlug: Object.fromEntries(
      allowedCourses.map((course) => {
        const enrollment = course.enrollments.find((item) => enrollmentIds.has(item.id));
        return [course.slug, enrollment?.progressPercent ?? 0];
      }),
    ),
    completedLessonIds,
    enrollmentIdsBySlug: Object.fromEntries(
      allowedCourses.map((course) => {
        const enrollment = course.enrollments.find((item) => enrollmentIds.has(item.id));
        return [course.slug, enrollment?.id ?? ""];
      }),
    ),
  };
}
export async function markLessonCompleted(input: {
  userId: string;
  email: string;
  courseSlug: string;
  lessonId: string;
  completed?: boolean;
}) {
  const client = getClientOrThrow();
  if (!normalizeEmail(input.email) || !isUuid(input.userId)) throw new Error("Phiên học viên không hợp lệ.");
  const { courses } = await loadAdminLmsData(client);
  const course = activePublishedCourses(courses).find((item) => item.slug === input.courseSlug);
  if (!course) throw new Error("Khóa học chưa xuất bản hoặc không tồn tại.");
  const lesson = publishedLessons(course).find((item) => item.id === input.lessonId || item.slug === input.lessonId);
  if (!lesson) throw new Error("Bài học chưa xuất bản hoặc không thuộc khóa này.");
  if (!isUuid(lesson.id)) throw new Error("Bài học chưa có ID hợp lệ để cập nhật tiến độ.");

  const totalLessons = publishedLessons(course).length;
  const completed = input.completed !== false;
  const { data, error } = await client.rpc("crm_v2_lms_mark_lesson_completed", {
    p_user_id: input.userId,
    p_email: normalizeEmail(input.email),
    p_course_id: course.id,
    p_course_slug: course.slug,
    p_lesson_id: lesson.id,
    p_lesson_title: lesson.title,
    p_completed: completed,
    p_total_lessons: totalLessons,
  });
  if (error) throw new Error(`Không cập nhật được tiến độ: ${error.message}`);
  const result = asRecord(data);
  const progressPercent = numberValue(result.progress_percent, 0);
  const completedLessonIds = Array.isArray(result.completed_lesson_ids) ? result.completed_lesson_ids.map((item) => text(item)).filter(Boolean) : [];

  await logStudentActivity({
    userId: input.userId,
    studentEmail: input.email,
    eventType: completed ? "lesson_completed" : "student_entered_learning",
    eventTitle: completed ? "Học viên hoàn thành bài học" : "Học viên cập nhật tiến độ",
    eventDescription: `${course.title} - ${lesson.title}`,
    status: "success",
    actorType: "student",
    actorId: input.userId,
    actorEmail: input.email,
    metadata: { courseSlug: course.slug, lessonId: lesson.id, progressPercent },
    dedupeWindowMinutes: 5,
  });

  return { ok: true, progressPercent, completedLessonIds };
}
export function validateEnrollmentIdentity(input: { email?: string; phone?: string }) {
  const email = cleanEmail(input.email);
  const phone = cleanPhone(input.phone);
  if (email && !isValidEmail(email)) throw new Error("Email học viên không hợp lệ.");
  if (!email && !phone) throw new Error("Cần có email hoặc số điện thoại học viên.");
  return { email, phone };
}
