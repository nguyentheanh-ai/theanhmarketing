import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { markLessonCompleted } from "@/services/lmsService";

const progressSchema = z.object({
  courseSlug: z.string().trim().min(1),
  lessonId: z.string().trim().min(1),
  completed: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user } = await getCurrentAuth();

  if (!user?.id || !user.email) {
    return NextResponse.json(
      { ok: false, message: isAuthGuardEnabled() ? "Bạn cần đăng nhập để cập nhật tiến độ." : "Thiếu phiên học viên." },
      { status: 401 },
    );
  }

  try {
    const input = progressSchema.parse(await request.json().catch(() => null));
    const result = await markLessonCompleted({
      userId: user.id,
      email: user.email,
      courseSlug: input.courseSlug,
      lessonId: input.lessonId,
      completed: input.completed,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không cập nhật được tiến độ học." },
      { status: 400 },
    );
  }
}
