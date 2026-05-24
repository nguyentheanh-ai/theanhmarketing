import { CourseEditor } from "@/components/admin/course-editor";
import { AdminPageHeader, AdminPanel } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getCourses } from "@/services/courseService";

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <ProtectedAdminShell nextPath="/admin/khoa-hoc" allowedRoles={["owner", "editor"]}>
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          eyebrow="Course CMS"
          title="Quản lý chương trình"
          description="Cập nhật khóa học, module, bài học, thumbnail và quyền xem thử ở cùng một nơi để dashboard học viên và trang public luôn đồng bộ."
        />

        <AdminPanel className="mt-6 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Nguồn dữ liệu</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
            Editor đọc Supabase trước, sau đó dùng nội dung dự phòng trong code khi database chưa có dữ liệu.
            Khi bấm lưu, chương trình, module và bài học được ghi vào bảng thật. Dashboard học viên và trang
            public sẽ đọc lại cùng nguồn dữ liệu này.
          </p>
        </AdminPanel>

        <div className="mt-5">
          <CourseEditor initialCourses={courses} />
        </div>
      </div>
    </ProtectedAdminShell>
  );
}
