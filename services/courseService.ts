import { courses as baseFallbackCourses, type Course, type CourseLesson, type CourseModule, type CourseStatus, type LessonAccess } from "@/data/courses";
import { marketingCourses } from "@/data/marketing-courses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

type DbCourse = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: string | number | null;
  original_price: string | number | null;
  status: string | null;
  duration: string | null;
  lesson_count: number | null;
  level: string | null;
  updated_at: string | null;
  banner_image: string | null;
  thumbnail_image: string | null;
  preview_video_url: string | null;
  cta_text: string | null;
  sort_order: number | null;
  course_modules?: DbModule[];
};

function toDisplayText(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
  }

  return value ?? "";
}

function toDisplayPrice(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return "";
    }

    if (/^\d+(\.\d+)?$/.test(trimmedValue)) {
      return new Intl.NumberFormat("vi-VN").format(Number(trimmedValue)) + "đ";
    }

    return toDisplayText(trimmedValue);
  }

  return "";
}

function toDisplayDuration(value: string | null | undefined) {
  const text = value?.trim() ?? "";

  if (!text) {
    return "";
  }

  const brokenHour = new RegExp(`gi${String.fromCodePoint(0x00e1, 0x00bb, 0x009d)}`, "gi");
  const brokenMinute = new RegExp(`ph${String.fromCodePoint(0x00c3, 0x00ba)}t`, "gi");

  return text
    .replace(/gi\?/gi, "giờ")
    .replace(brokenHour, "giờ")
    .replace(brokenMinute, "phút");
}

function toDisplayLevel(value: string | null | undefined) {
  const text = value?.trim() ?? "";

  if (!text) {
    return "";
  }

  if (
    text.includes("C? b?n") ||
    text.toLowerCase().includes("co ban")
  ) {
    return "Cơ bản đến thực chiến";
  }

  if (text.toLowerCase().includes("nguoi moi")) {
    return "Người mới";
  }

  return text;
}

const windows1252Bytes: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function looksMojibake(value: string) {
  const c3 = String.fromCodePoint(0x00c3);
  const c2 = String.fromCodePoint(0x00c2);
  const c4 = String.fromCodePoint(0x00c4);
  const c6 = String.fromCodePoint(0x00c6);
  const c5 = String.fromCodePoint(0x00c5);
  const e2 = String.fromCodePoint(0x00e2);
  const a1 = String.fromCodePoint(0x00e1);
  const ba = String.fromCodePoint(0x00ba);
  const bb = String.fromCodePoint(0x00bb);

  return new RegExp(`[${c3}${c2}${c4}${c6}${c5}${e2}]|${a1}[${ba}${bb}]`).test(value);
}

function decodeMojibake(value: string) {
  let text = value;

  for (let pass = 0; pass < 2 && looksMojibake(text); pass += 1) {
    const bytes: number[] = [];
    let canDecode = true;

    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      const byte = code <= 0xff ? code : windows1252Bytes[char];

      if (typeof byte !== "number" || byte > 0xff) {
        canDecode = false;
        break;
      }

      bytes.push(byte);
    }

    if (!canDecode) {
      break;
    }

    const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));

    if (!decoded || decoded.includes("�")) {
      break;
    }

    text = decoded;
  }

  return text;
}

function normalizeText(value: string) {
  return looksMojibake(value) ? decodeMojibake(value) : value;
}

function normalizeTextArray(values: string[]) {
  return values.map(normalizeText);
}

function normalizeCourseText(course: Course): Course {
  return {
    ...course,
    title: normalizeText(course.title),
    eyebrow: normalizeText(course.eyebrow),
    description: normalizeText(course.description),
    shortDescription: normalizeText(course.shortDescription),
    price: normalizeText(course.price),
    originalPrice: normalizeText(course.originalPrice),
    statusLabel: normalizeText(course.statusLabel),
    ctaText: normalizeText(course.ctaText),
    duration: normalizeText(course.duration),
    level: normalizeText(course.level),
    format: normalizeText(course.format),
    thumbnailLabel: normalizeText(course.thumbnailLabel),
    previewNote: normalizeText(course.previewNote),
    topics: normalizeTextArray(course.topics),
    audience: normalizeTextArray(course.audience),
    outcomes: normalizeTextArray(course.outcomes),
    benefits: normalizeTextArray(course.benefits),
    includes: normalizeTextArray(course.includes),
    requirements: normalizeTextArray(course.requirements),
    modules: course.modules.map((module) => ({
      ...module,
      title: normalizeText(module.title),
      description: normalizeText(module.description),
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        title: normalizeText(lesson.title),
        duration: normalizeText(lesson.duration),
        resources: lesson.resources?.map((resource) => ({
          title: normalizeText(resource.title),
          url: resource.url,
        })),
      })),
    })),
    instructor: {
      ...course.instructor,
      name: normalizeText(course.instructor.name),
      title: normalizeText(course.instructor.title),
      bio: normalizeText(course.instructor.bio),
    },
    reviews: course.reviews.map((review) => ({
      name: normalizeText(review.name),
      role: normalizeText(review.role),
      quote: normalizeText(review.quote),
    })),
  };
}

function normalizeCourseTiming(course: Course): Course {
  return {
    ...course,
    duration: toDisplayDuration(course.duration),
    level: toDisplayLevel(course.level),
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        duration: toDisplayDuration(lesson.duration),
      })),
    })),
  };
}

type DbModule = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number | null;
  lessons?: DbLesson[];
};

type DbLesson = {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  youtube_url: string | null;
  embed_url: string | null;
  access_type: string | null;
  sort_order: number | null;
  lesson_resources?: DbLessonResource[];
};

type DbLessonResource = {
  title: string;
  url: string;
};

const baseSlugs = new Set(baseFallbackCourses.map((course) => course.slug));
const fallbackCourses = [
  ...baseFallbackCourses,
  ...marketingCourses.filter((course) => !baseSlugs.has(course.slug)),
];
const officialFallbackBySlug = new Map(fallbackCourses.map((course) => [course.slug, course]));
const demoCourseSlugs = new Set([
  "marketing-online-nen-tang",
  "ai-growth-system-program",
  "ai-ads-engine",
  "ai-content-engine",
  "crm-and-data-layer",
  "funnel-psychology-foundation",
  "ai-solopreneur-os",
  "ai-automation-workflow",
  "full-funnel-campaign-strategy",
  "marketing-operation-management",
  "ai-content-and-automation-workflow",
  "ai-fullstack-marketing-system",
  "brandformance-foundation",
  "content-traffic-engine",
  "founder-marketing-blueprint",
  "marketing-data-analytics",
  "performance-marketing-and-growth-ads",
]);
const demoCourseTitles = [
  "AI Growth System Foundation",
  "AI Growth System Program",
  "AI Content Engine",
  "CRM & Data Layer",
  "Funnel Psychology Foundation",
  "AI Solopreneur OS",
];

function toCourseStatus(status: string | null): CourseStatus {
  if (status === "coming-soon" || status === "closed" || status === "open") {
    return status;
  }

  return "open";
}

export function toLessonAccess(accessType: string | null): LessonAccess {
  if (accessType === "free_preview") {
    return "free";
  }

  if (accessType === "enrolled_only") {
    return "paid";
  }

  return "paid";
}

export function toDbLessonAccess(access: LessonAccess) {
  if (access === "free") {
    return "free_preview";
  }

  if (access === "paid") {
    return "enrolled_only";
  }

  return "enrolled_only";
}

export function mapDbCourseToCourse(course: DbCourse): Course {
  const modules: CourseModule[] = (course.course_modules ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description ?? "",
      order: module.sort_order ?? 1,
      lessons: (module.lessons ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map<CourseLesson>((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          duration: toDisplayDuration(lesson.duration),
          order: lesson.sort_order ?? 1,
          youtubeUrl: lesson.youtube_url ?? "",
          embedUrl: lesson.embed_url ?? toYouTubeEmbedUrl(lesson.youtube_url ?? ""),
          access: toLessonAccess(lesson.access_type),
          resources: (lesson.lesson_resources ?? []).map((resource) => ({
            title: resource.title,
            url: resource.url,
          })),
          allowComments: true,
        })),
    }));

  return {
    slug: course.slug,
    title: course.title,
    eyebrow: course.slug === "facebook-ads-2026" ? "AI Ads Engine" : "AI Growth System",
    description: course.description ?? "",
    shortDescription: course.short_description ?? course.description ?? "",
    price: toDisplayPrice(course.price),
    originalPrice: toDisplayPrice(course.original_price),
    status: toCourseStatus(course.status),
    statusLabel: toCourseStatus(course.status) === "coming-soon" ? "Sắp ra mắt" : "Đang mở đăng ký",
    ctaText: course.cta_text ?? "Vào chương trình",
    duration: toDisplayDuration(course.duration),
    level: toDisplayLevel(course.level),
    updatedAt: course.updated_at ?? "",
    format: "Video bài học + toolkit + dashboard học viên",
    bannerImageUrl: course.banner_image ?? "",
    thumbnailImageUrl: course.thumbnail_image ?? "",
    videoPreviewUrl: course.preview_video_url ?? "",
    videoPreviewEmbedUrl: toYouTubeEmbedUrl(course.preview_video_url ?? ""),
    thumbnailLabel: `Preview chương trình ${course.title}`,
    previewNote: "Khu vực thumbnail/video preview lấy từ CMS nếu admin đã bổ sung media.",
    topics: [],
    audience: [],
    outcomes: [course.short_description ?? course.description ?? ""].filter(Boolean),
    benefits: [],
    includes: [],
    requirements: [],
    modules,
    instructor: {
      name: "The Anh",
      title: "AI Growth Operator, Founder The Anh Marketing",
      bio: "Xây hệ thống tăng trưởng bằng AI, Performance Ads, Funnel, Automation và CRM/Data cho SME và Solopreneur.",
    },
    reviews: [],
    relatedSlugs: [],
  };
}

function getFallbackCourses() {
  return fallbackCourses.map((course) => normalizeCourseText(normalizeCourseTiming(course)));
}

function hasCourseContent(course: Course) {
  return course.modules.some((module) => module.lessons.length > 0);
}

function isDemoCourse(course: Course) {
  return (
    demoCourseSlugs.has(course.slug) ||
    demoCourseTitles.some((title) => course.title.includes(title)) ||
    !hasCourseContent(course)
  );
}

function mergeOfficialCourseMetadata(course: Course) {
  const official = officialFallbackBySlug.get(course.slug);

  if (!official) {
    return course;
  }

  return {
    ...course,
    title: official.title,
    eyebrow: official.eyebrow,
    description: official.description,
    shortDescription: official.shortDescription,
    price: official.price,
    originalPrice: official.originalPrice,
    status: official.status,
    statusLabel: official.statusLabel,
    ctaText: official.ctaText,
    duration: official.duration,
    level: official.level,
    format: official.format,
    bannerImageUrl: official.bannerImageUrl,
    thumbnailImageUrl: official.thumbnailImageUrl,
    thumbnailLabel: official.thumbnailLabel,
    previewNote: official.previewNote,
    topics: official.topics,
    audience: official.audience,
    outcomes: official.outcomes,
    benefits: official.benefits,
    includes: official.includes,
    requirements: official.requirements,
    instructor: official.instructor,
    reviews: official.reviews,
    relatedSlugs: official.relatedSlugs,
    modules: course.modules.length > 0 ? course.modules : official.modules,
  };
}

async function fetchCourses() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[courseService] Supabase env missing; using fallback courses.");
    }
    return getFallbackCourses();
  }

  const { data, error } = await supabase
    .from("courses")
    .select(
      "*, course_modules(*, lessons(*))",
    )
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    console.warn("[courseService] Supabase courses query fell back.", {
      error: error?.message,
      rows: data?.length ?? 0,
    });
    return getFallbackCourses();
  }

  let dbCourses = (data as DbCourse[])
    .map((course) => normalizeCourseText(normalizeCourseTiming(mapDbCourseToCourse(course))))
    .filter((course) => !isDemoCourse(course))
    .map(mergeOfficialCourseMetadata);
  const lessonIds = dbCourses.flatMap((course) =>
    course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  );

  if (lessonIds.length > 0) {
    const { data: resources } = await supabase
      .from("lesson_resources")
      .select("lesson_id,title,url")
      .in("lesson_id", lessonIds);

    if (resources && resources.length > 0) {
      const resourcesByLesson = new Map<string, { title: string; url: string }[]>();

      for (const resource of resources as { lesson_id: string; title: string; url: string }[]) {
        const current = resourcesByLesson.get(resource.lesson_id) ?? [];
        current.push({ title: resource.title, url: resource.url });
        resourcesByLesson.set(resource.lesson_id, current);
      }

      dbCourses = dbCourses.map((course) => ({
        ...course,
        modules: course.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            resources: resourcesByLesson.get(lesson.id) ?? lesson.resources,
          })),
        })),
      }));
    }
  }
  const dbSlugs = new Set(dbCourses.map((course) => course.slug));
  const missingFallbackCourses = fallbackCourses
    .filter((course) => !dbSlugs.has(course.slug))
    .map(normalizeCourseTiming);

  return [...dbCourses, ...missingFallbackCourses];
}

export async function getCourses() {
  return fetchCourses();
}

export async function getCourseBySlug(slug: string) {
  const courses = await getCourses();
  const course = courses.find((course) => course.slug === slug);
  const fallbackCourse = fallbackCourses.find((item) => item.slug === slug);
  const normalizedFallbackCourse = fallbackCourse
    ? normalizeCourseText(normalizeCourseTiming(fallbackCourse))
    : null;

  if (!course) {
    return normalizedFallbackCourse;
  }

  if (course.modules.length === 0 && normalizedFallbackCourse?.modules.length) {
    return {
      ...course,
      modules: normalizedFallbackCourse.modules,
      topics: course.topics.length > 0 ? course.topics : normalizedFallbackCourse.topics,
      audience: course.audience.length > 0 ? course.audience : normalizedFallbackCourse.audience,
      outcomes: course.outcomes.length > 0 ? course.outcomes : normalizedFallbackCourse.outcomes,
      benefits: course.benefits.length > 0 ? course.benefits : normalizedFallbackCourse.benefits,
      includes: course.includes.length > 0 ? course.includes : normalizedFallbackCourse.includes,
      requirements:
        course.requirements.length > 0 ? course.requirements : normalizedFallbackCourse.requirements,
      instructor: course.instructor.name ? course.instructor : normalizedFallbackCourse.instructor,
      reviews: course.reviews.length > 0 ? course.reviews : normalizedFallbackCourse.reviews,
      relatedSlugs:
        course.relatedSlugs.length > 0 ? course.relatedSlugs : normalizedFallbackCourse.relatedSlugs,
    };
  }

  return course;
}

export async function getCourseStaticParams() {
  const courses = await getCourses();
  return courses.map((course) => ({ slug: course.slug }));
}
