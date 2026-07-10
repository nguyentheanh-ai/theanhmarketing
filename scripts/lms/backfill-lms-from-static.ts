import type { SupabaseClient } from "@supabase/supabase-js";
import { courses } from "../../data/courses";
import { normalizeEmail } from "../../lib/crm-v2/normalize";
import { fetchPaged, getSupabaseAdminClient, parseScriptOptions, printJson } from "../crm-v2/shared";

type Row = Record<string, unknown>;

const paidStatuses = new Set(["paid", "success", "completed"]);

async function main() {
  const options = parseScriptOptions();
  const client = getSupabaseAdminClient({ requireLive: options.requireLive || options.apply });

  if (!client) {
    printJson({
      ok: true,
      dryRun: true,
      mode: "offline",
      message: "No Supabase env found. Re-run with --require-live --apply against production after the LMS migration.",
    });
    return;
  }

  const publicOrders = await fetchOptionalPaged(
    client,
    "public",
    "orders",
    "id,student_name,email,phone,course_slug,course_title,status,payment_status,paid_at,created_at,updated_at",
  );
  const eligibleOrders = publicOrders.filter((order) => isPaid(order) && text(order.course_slug));
  const preview = {
    courses: courses.map((course) => ({ slug: course.slug, modules: course.modules.length })),
    paidOrdersForEnrollment: eligibleOrders.length,
  };

  if (!options.apply) {
    printJson({
      ok: true,
      dryRun: true,
      preview,
      message: "Dry-run only. Re-run with --apply to upsert public.courses, course_modules, lessons, resources and crm_v2 enrollments.",
    });
    return;
  }

  const counters = {
    coursesUpserted: 0,
    modulesUpserted: 0,
    lessonsUpserted: 0,
    resourcesUpserted: 0,
    contactsUpserted: 0,
    enrollmentsUpserted: 0,
  };

  for (const course of courses) {
    const courseId = await upsertCourse(client, course);
    counters.coursesUpserted += 1;

    for (const courseModule of course.modules) {
      const moduleId = await upsertModule(client, courseId, courseModule);
      counters.modulesUpserted += 1;

      for (const lesson of courseModule.lessons) {
        const lessonId = await upsertLesson(client, courseId, moduleId, lesson);
        counters.lessonsUpserted += 1;

        for (const resource of lesson.resources ?? []) {
          await upsertResource(client, {
            courseId,
            moduleId,
            lessonId,
            title: resource.title,
            url: resource.url,
          });
          counters.resourcesUpserted += 1;
        }
      }
    }
  }

  for (const order of eligibleOrders) {
    for (const courseSlug of splitCourseSlugs(text(order.course_slug))) {
      const course = await getCourseBySlug(client, courseSlug);
      if (!course?.id) continue;
      await upsertEnrollmentFromOrder(client, {
        order,
        courseId: String(course.id),
        courseSlug,
        courseTitle: text(order.course_title) || String(course.title ?? courseSlug),
      });
      counters.enrollmentsUpserted += 1;
    }
  }

  printJson({
    ok: true,
    dryRun: false,
    ...counters,
  });
}

async function upsertCourse(client: SupabaseClient, course: (typeof courses)[number]) {
  const { data, error } = await client
    .from("courses")
    .upsert(
      {
        title: course.title,
        slug: course.slug,
        short_description: course.shortDescription,
        description: course.description,
        status: course.status === "open" ? "open" : course.status === "closed" ? "closed" : "coming-soon",
        lms_status: course.status === "open" ? "published" : course.status === "closed" ? "archived" : "draft",
        visibility: "enrolled",
        duration: course.duration,
        lesson_count: course.modules.reduce((total, module) => total + module.lessons.length, 0),
        level: course.level,
        updated_at: new Date().toISOString(),
        banner_image: course.bannerImageUrl,
        thumbnail_image: course.thumbnailImageUrl,
        preview_video_url: course.videoPreviewUrl,
        cta_text: course.ctaText,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(error?.message ?? `Cannot upsert course ${course.slug}.`);
  return String(data.id);
}

async function upsertModule(client: SupabaseClient, courseId: string, module: (typeof courses)[number]["modules"][number]) {
  const existing = await client
    .from("course_modules")
    .select("id")
    .eq("course_id", courseId)
    .eq("sort_order", module.order)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const payload = {
    course_id: courseId,
    title: module.title,
    description: module.description,
    sort_order: module.order,
    status: "published",
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    const { data, error } = await client.from("course_modules").update(payload).eq("id", existing.data.id).select("id").single();
    if (error || !data?.id) throw new Error(error?.message ?? "Cannot update course module.");
    return String(data.id);
  }

  const { data, error } = await client.from("course_modules").insert(payload).select("id").single();
  if (error || !data?.id) throw new Error(error?.message ?? "Cannot insert course module.");
  return String(data.id);
}

async function upsertLesson(
  client: SupabaseClient,
  courseId: string,
  moduleId: string,
  lesson: (typeof courses)[number]["modules"][number]["lessons"][number],
) {
  const slug = slugify(lesson.id || lesson.title);
  const existing = await client.from("lessons").select("id").eq("course_id", courseId).eq("slug", slug).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const isReadyForStudents = Boolean(lesson.embedUrl || lesson.youtubeUrl || lesson.content?.trim());

  const payload = {
    course_id: courseId,
    module_id: moduleId,
    title: lesson.title,
    slug,
    description: "",
    content: "",
    lesson_type: lesson.embedUrl || lesson.youtubeUrl ? "video" : "text",
    duration: lesson.duration,
    youtube_url: lesson.youtubeUrl,
    embed_url: lesson.embedUrl,
    access_type: lesson.access === "free" ? "free_preview" : "enrolled_only",
    sort_order: lesson.order,
    status: isReadyForStudents ? "published" : "draft",
    published_at: isReadyForStudents ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    const { data, error } = await client.from("lessons").update(payload).eq("id", existing.data.id).select("id").single();
    if (error || !data?.id) throw new Error(error?.message ?? "Cannot update lesson.");
    return String(data.id);
  }

  const { data, error } = await client.from("lessons").insert(payload).select("id").single();
  if (error || !data?.id) throw new Error(error?.message ?? "Cannot insert lesson.");
  return String(data.id);
}

async function upsertResource(
  client: SupabaseClient,
  input: { courseId: string; moduleId: string; lessonId: string; title: string; url: string },
) {
  const existing = await client
    .from("course_resources")
    .select("id")
    .eq("course_id", input.courseId)
    .eq("lesson_id", input.lessonId)
    .eq("title", input.title)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const payload = {
    course_id: input.courseId,
    module_id: input.moduleId,
    lesson_id: input.lessonId,
    title: input.title,
    type: "link",
    url: input.url,
    sort_order: 1,
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    const { error } = await client.from("course_resources").update(payload).eq("id", existing.data.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await client.from("course_resources").insert(payload);
  if (error) throw new Error(error.message);
}

async function getCourseBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client.from("courses").select("id,title,slug").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id?: string; title?: string; slug?: string } | null;
}

async function upsertEnrollmentFromOrder(
  client: SupabaseClient,
  input: { order: Row; courseId: string; courseSlug: string; courseTitle: string },
) {
  const { error } = await client.rpc("crm_v2_lms_upsert_enrollment", {
    p_course_id: input.courseId,
    p_course_slug: input.courseSlug,
    p_course_title: input.courseTitle,
    p_student_name: text(input.order.student_name),
    p_email: normalizeEmail(text(input.order.email)),
    p_phone: text(input.order.phone),
    p_user_id: null,
    p_status: "active",
    p_expires_at: null,
  });
  if (error) throw new Error(error.message);
}
async function fetchOptionalPaged(client: SupabaseClient, schema: string, table: string, columns: string) {
  try {
    return await fetchPaged(client, schema, table, columns);
  } catch {
    return [];
  }
}

function isPaid(row: Row) {
  const status = `${text(row.status)} ${text(row.payment_status)}`.toLowerCase();
  return Array.from(paidStatuses).some((item) => status.includes(item)) || status.includes("thanh");
}

function splitCourseSlugs(value: string) {
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
