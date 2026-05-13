import { DashboardShell } from "@/components/app/dashboard-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";
import { sampleStudents, studentLessons } from "@/data/platform";
import { getCourses } from "@/services/courseService";
import { getResources } from "@/services/resourceService";

const currentStudent = sampleStudents[0];

export default async function DashboardPage() {
  const [courses, resources] = await Promise.all([getCourses(), getResources()]);
  const featuredCourse = courses[0];
  const firstLesson = featuredCourse.modules
    .flatMap((module) => module.lessons)
    .sort((a, b) => a.order - b.order)[0];
  const continueHref = firstLesson
    ? `/learn/${featuredCourse.slug}/${firstLesson.id}`
    : `/khoa-hoc/${featuredCourse.slug}`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#c77b20]">
              Dashboard học viên
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
              Chào {currentStudent.name}.
            </h1>
            <p className="mt-4 text-lg leading-8 text-black/60">
              Tiếp tục học, theo dõi tiến độ và tải tài liệu đi kèm khóa học.
            </p>
          </div>
          <ButtonLink href={continueHref}>Học tiếp</ButtonLink>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <SoftCard id="khoa-hoc">
            <p className="text-sm font-semibold text-[#c77b20]">Khóa học đang học</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
              {featuredCourse.title}
            </h2>
            <p className="mt-3 leading-8 text-black/60">{featuredCourse.description}</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-black"
                style={{ width: `${currentStudent.progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-black/60">
              <span>Tiến độ: {currentStudent.progress}%</span>
              <span>{currentStudent.status}</span>
            </div>
          </SoftCard>

          <SoftCard id="thong-bao">
            <p className="text-sm font-semibold text-[#c77b20]">Thông báo</p>
            <div className="mt-5 grid gap-4">
              {[
                "Module tracking đã được cập nhật checklist mới.",
                "Livestream hỏi đáp tiếp theo: 20:00 thứ Năm.",
                "Bạn còn 3 bài học chưa hoàn thành trong module hiện tại.",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-[#f2eadf] p-4 text-sm leading-6 text-black/65">
                  {item}
                </div>
              ))}
            </div>
          </SoftCard>
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <SoftCard id="tien-do">
            <p className="text-sm font-semibold text-[#c77b20]">Tiến độ bài học</p>
            <div className="mt-5 grid gap-3">
              {studentLessons.map((lesson, index) => (
                <div
                  key={lesson.title}
                  className="grid gap-3 rounded-2xl border border-black/10 p-4 sm:grid-cols-[40px_1fr_auto]"
                >
                  <span className="font-black">{index + 1}</span>
                  <div>
                    <p className="font-semibold">{lesson.title}</p>
                    <p className="mt-1 text-sm text-black/50">{lesson.duration}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#c77b20]">
                    {lesson.status}
                  </span>
                </div>
              ))}
            </div>
          </SoftCard>

          <SoftCard id="tai-lieu">
            <p className="text-sm font-semibold text-[#c77b20]">Tài liệu học viên</p>
            <div className="mt-5 grid gap-4">
              {resources.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-3 rounded-2xl bg-[#f7f3ec] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-black/50">{item.type}</p>
                  </div>
                  <ButtonLink href="/tai-lieu" variant="secondary" className="min-h-10">
                    Xem
                  </ButtonLink>
                </div>
              ))}
            </div>
          </SoftCard>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <SoftCard id="ho-so">
            <p className="text-sm font-semibold text-[#c77b20]">Hồ sơ cá nhân</p>
            <div className="mt-5 grid gap-3 text-sm text-black/65">
              <p>Họ tên: {currentStudent.name}</p>
              <p>Email: {currentStudent.email}</p>
              <p>Điện thoại: {currentStudent.phone}</p>
              <p>Ghi chú: {currentStudent.note}</p>
            </div>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Hỗ trợ</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
              Cần hỏi trong quá trình học?
            </h2>
            <p className="mt-4 leading-8 text-black/60">
              Học viên có thể gửi câu hỏi về bài học, tài liệu hoặc chiến dịch
              đang triển khai để được hỗ trợ.
            </p>
            <ButtonLink href="/lien-he" className="mt-6">
              Gửi câu hỏi
            </ButtonLink>
          </SoftCard>
        </section>
      </div>
    </DashboardShell>
  );
}
