import { CourseEditor } from "@/components/admin/course-editor";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getCourses } from "@/services/courseService";

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <ProtectedAdminShell nextPath="/admin/khoa-hoc">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
              Quản lý chương trình.
            </h1>
          </div>
        </div>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">Course CMS</p>
          <p className="mt-3 max-w-3xl leading-8 text-black/60">
            Editor này đọc Supabase trước, sau đó dùng bộ nội dung dự phòng trong
            code khi database chưa có dữ liệu. Khi bấm lưu, chương trình, module
            và bài học được ghi vào bảng thật. Trang public `/khoa-hoc` và Growth
            Hub đều đọc lại cùng nguồn dữ liệu này, nên đổi tiêu đề, link YouTube
            hoặc quyền học thử trong admin rồi lưu là hai nơi kia sẽ đồng bộ.
            localStorage chỉ còn là lớp backup/export an toàn, không tự đè dữ liệu
            Supabase khi mở admin. Logic preview tại đây cũng đồng bộ với trang
            chương trình public: bài Miễn phí phát video, bài Premium chỉ hiện
            thumbnail cho tới khi khách mua khóa.
          </p>
        </SoftCard>

        <div className="mt-5">
          <CourseEditor initialCourses={courses} />
        </div>
      </div>
    </ProtectedAdminShell>
  );
}
