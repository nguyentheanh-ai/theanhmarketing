import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  addLmsEnrollment,
  createLmsCourse,
  createLmsLesson,
  createLmsModule,
  createLmsResource,
  deleteLmsCourse,
  deleteLmsLesson,
  deleteLmsModule,
  deleteLmsResource,
  removeLmsEnrollment,
  reorderLmsCourses,
  reorderLmsLessons,
  reorderLmsModules,
  updateLmsCourse,
  updateLmsEnrollment,
  updateLmsLesson,
  updateLmsModule,
  updateLmsResource,
  validateEnrollmentIdentity,
} from "@/services/lmsService";
import { requireCrmV2OwnerRequest } from "../../_shared";

const publishStatusSchema = z.enum(["draft", "published", "archived"]);
const visibilitySchema = z.enum(["public", "private", "enrolled"]);
const enrollmentStatusSchema = z.enum(["active", "paused", "completed", "revoked"]);
const lessonTypeSchema = z.enum(["video", "text", "file", "link", "live"]);
const lessonAccessSchema = z.enum(["free_preview", "enrolled_only", "locked"]);

const optionalText = z.string().trim().optional().nullable();
const requiredText = z.string().trim().min(1);
const idListSchema = z.array(z.string().uuid()).min(1).max(200);

function ok(payload: Record<string, unknown> = {}) {
  revalidatePath("/admin/crm-v2/courses");
  revalidatePath("/admin/crm-v2/students");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, ...payload });
}

function parseBody(value: unknown) {
  return z.object({ action: z.string().trim().min(1) }).passthrough().parse(value);
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:lms:actions");
  if (blocked) return blocked;

  try {
    const body = parseBody(await request.json().catch(() => null));

    if (body.action === "create_course") {
      const input = z
        .object({
          title: requiredText,
          slug: optionalText,
          description: optionalText,
          shortDescription: optionalText,
          thumbnailImage: optionalText,
          bannerImage: optionalText,
          previewVideoUrl: optionalText,
          status: publishStatusSchema.default("draft"),
          visibility: visibilitySchema.default("enrolled"),
        })
        .parse(body);
      const course = await createLmsCourse({
        ...input,
        slug: input.slug ?? undefined,
        description: input.description ?? undefined,
        shortDescription: input.shortDescription ?? undefined,
        thumbnailImage: input.thumbnailImage ?? undefined,
        bannerImage: input.bannerImage ?? undefined,
        previewVideoUrl: input.previewVideoUrl ?? undefined,
      });
      return ok({ course, message: "Đã tạo khóa học." });
    }

    if (body.action === "update_course") {
      const input = z
        .object({
          courseId: z.string().min(1),
          title: optionalText,
          slug: optionalText,
          description: optionalText,
          shortDescription: optionalText,
          thumbnailImage: optionalText,
          bannerImage: optionalText,
          previewVideoUrl: optionalText,
          status: publishStatusSchema.optional(),
          visibility: visibilitySchema.optional(),
        })
        .parse(body);
      await updateLmsCourse({
        ...input,
        title: input.title ?? undefined,
        slug: input.slug ?? undefined,
        description: input.description ?? undefined,
        shortDescription: input.shortDescription ?? undefined,
        thumbnailImage: input.thumbnailImage ?? undefined,
        bannerImage: input.bannerImage ?? undefined,
        previewVideoUrl: input.previewVideoUrl ?? undefined,
      });
      return ok({ message: "Đã lưu khóa học." });
    }

    if (body.action === "reorder_courses") {
      const input = z.object({ courseIds: idListSchema }).parse(body);
      await reorderLmsCourses(input);
      return ok({ message: "Đã sắp xếp khóa học." });
    }

    if (body.action === "delete_course" || body.action === "archive_course") {
      const input = z.object({ courseId: z.string().min(1) }).parse(body);
      const result = await deleteLmsCourse({ courseId: input.courseId, archiveIfUnsafe: true });
      return ok({ result, message: result.archived ? "Đã lưu trữ khóa học." : "Đã xóa khóa học." });
    }

    if (body.action === "create_module") {
      const input = z
        .object({
          courseId: z.string().min(1),
          title: requiredText,
          description: optionalText,
          status: publishStatusSchema.default("published"),
          position: z.coerce.number().int().positive().optional(),
        })
        .parse(body);
      const courseModule = await createLmsModule({ ...input, description: input.description ?? undefined });
      return ok({ module: courseModule, message: "Đã tạo module." });
    }

    if (body.action === "update_module") {
      const input = z
        .object({
          moduleId: z.string().uuid(),
          title: optionalText,
          description: optionalText,
          status: publishStatusSchema.optional(),
          position: z.coerce.number().int().positive().optional(),
        })
        .parse(body);
      await updateLmsModule({
        ...input,
        title: input.title ?? undefined,
        description: input.description ?? undefined,
      });
      return ok({ message: "Đã lưu module." });
    }

    if (body.action === "delete_module") {
      const input = z.object({ moduleId: z.string().uuid(), cascadeLessons: z.boolean().optional() }).parse(body);
      await deleteLmsModule(input);
      return ok({ message: "Đã xóa module." });
    }

    if (body.action === "reorder_modules") {
      const input = z.object({ courseId: z.string().min(1), moduleIds: idListSchema }).parse(body);
      await reorderLmsModules(input);
      return ok({ message: "Đã sắp xếp module." });
    }

    if (body.action === "create_lesson") {
      const input = z
        .object({
          courseId: z.string().min(1),
          moduleId: z.string().uuid(),
          title: requiredText,
          slug: optionalText,
          description: optionalText,
          content: optionalText,
          lessonType: lessonTypeSchema.default("video"),
          duration: optionalText,
          youtubeUrl: optionalText,
          embedUrl: optionalText,
          accessType: lessonAccessSchema.default("enrolled_only"),
          status: publishStatusSchema.default("draft"),
          position: z.coerce.number().int().positive().optional(),
        })
        .parse(body);
      const lesson = await createLmsLesson({
        ...input,
        slug: input.slug ?? undefined,
        description: input.description ?? undefined,
        content: input.content ?? undefined,
        duration: input.duration ?? undefined,
        youtubeUrl: input.youtubeUrl ?? undefined,
        embedUrl: input.embedUrl ?? undefined,
      });
      return ok({ lesson, message: "Đã tạo bài học." });
    }

    if (body.action === "update_lesson") {
      const input = z
        .object({
          lessonId: z.string().uuid(),
          moduleId: z.string().uuid().optional(),
          title: optionalText,
          slug: optionalText,
          description: optionalText,
          content: optionalText,
          lessonType: lessonTypeSchema.optional(),
          duration: optionalText,
          youtubeUrl: optionalText,
          embedUrl: optionalText,
          accessType: lessonAccessSchema.optional(),
          status: publishStatusSchema.optional(),
          position: z.coerce.number().int().positive().optional(),
        })
        .parse(body);
      await updateLmsLesson({
        ...input,
        title: input.title ?? undefined,
        slug: input.slug ?? undefined,
        description: input.description ?? undefined,
        content: input.content ?? undefined,
        duration: input.duration ?? undefined,
        youtubeUrl: input.youtubeUrl ?? undefined,
        embedUrl: input.embedUrl ?? undefined,
      });
      return ok({ message: "Đã lưu bài học." });
    }

    if (body.action === "delete_lesson") {
      const input = z.object({ lessonId: z.string().uuid() }).parse(body);
      const result = await deleteLmsLesson({ lessonId: input.lessonId, archiveIfProgress: true });
      return ok({ result, message: result.archived ? "Đã lưu trữ bài học." : "Đã xóa bài học." });
    }

    if (body.action === "reorder_lessons") {
      const input = z.object({ moduleId: z.string().uuid(), lessonIds: idListSchema }).parse(body);
      await reorderLmsLessons(input);
      return ok({ message: "Đã sắp xếp bài học." });
    }

    if (body.action === "create_resource") {
      const input = z
        .object({
          courseId: z.string().min(1),
          moduleId: z.string().uuid().optional().nullable(),
          lessonId: z.string().uuid().optional().nullable(),
          title: requiredText,
          type: optionalText,
          url: requiredText,
          storagePath: optionalText,
          description: optionalText,
          position: z.coerce.number().int().positive().optional(),
        })
        .parse(body);
      const resource = await createLmsResource({
        ...input,
        type: input.type ?? undefined,
        storagePath: input.storagePath ?? undefined,
        description: input.description ?? undefined,
      });
      return ok({ resource, message: "Đã thêm tài nguyên." });
    }

    if (body.action === "update_resource") {
      const input = z
        .object({
          resourceId: z.string().uuid(),
          title: optionalText,
          type: optionalText,
          url: optionalText,
          storagePath: optionalText,
          description: optionalText,
          position: z.coerce.number().int().positive().optional(),
          moduleId: z.string().uuid().optional().nullable(),
          lessonId: z.string().uuid().optional().nullable(),
        })
        .parse(body);
      await updateLmsResource({
        ...input,
        title: input.title ?? undefined,
        type: input.type ?? undefined,
        url: input.url ?? undefined,
        storagePath: input.storagePath ?? undefined,
        description: input.description ?? undefined,
      });
      return ok({ message: "Đã lưu tài nguyên." });
    }

    if (body.action === "delete_resource") {
      const input = z.object({ resourceId: z.string().uuid() }).parse(body);
      await deleteLmsResource(input);
      return ok({ message: "Đã xóa tài nguyên." });
    }

    if (body.action === "add_enrollment") {
      const input = z
        .object({
          courseId: z.string().min(1).optional(),
          courseSlug: z.string().min(1).optional(),
          studentName: optionalText,
          email: optionalText,
          phone: optionalText,
          userId: z.string().uuid().optional().nullable(),
          status: enrollmentStatusSchema.default("active"),
          expiresAt: optionalText,
        })
        .parse(body);
      validateEnrollmentIdentity({ email: input.email ?? undefined, phone: input.phone ?? undefined });
      const enrollment = await addLmsEnrollment({
        ...input,
        studentName: input.studentName ?? undefined,
        email: input.email ?? undefined,
        phone: input.phone ?? undefined,
        expiresAt: input.expiresAt ?? undefined,
      });
      return ok({ enrollment, message: "Đã thêm học viên vào khóa." });
    }

    if (body.action === "update_enrollment") {
      const input = z
        .object({
          enrollmentId: z.string().uuid(),
          status: enrollmentStatusSchema.optional(),
          expiresAt: optionalText,
          userId: z.string().uuid().optional().nullable(),
        })
        .parse(body);
      await updateLmsEnrollment({
        ...input,
        expiresAt: input.expiresAt ?? undefined,
      });
      return ok({ message: "Đã cập nhật học viên." });
    }

    if (body.action === "remove_enrollment") {
      const input = z.object({ enrollmentId: z.string().uuid() }).parse(body);
      await removeLmsEnrollment(input);
      return ok({ message: "Đã gỡ quyền học viên khỏi khóa." });
    }

    return NextResponse.json({ ok: false, message: "Hành động LMS không hợp lệ." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không xử lý được LMS action.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
