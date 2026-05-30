import { CourseEditor } from "@/components/admin/course-editor";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getAdminCourses } from "@/services/adminDataService";

export default async function AdminCoursesPage() {
  const courses = await getAdminCourses();

  return (
    <ProtectedAdminShell nextPath="/admin/khoa-hoc" allowedRoles={["owner", "editor"]}>
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-blue-700">Course CMS</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Quản lý khóa học
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Nguồn dữ liệu đọc Supabase trước, fallback nội dung chính thức khi database chưa sẵn sàng. Màn này chỉ tập trung vào danh sách khóa, thông tin bán hàng, media và curriculum.
            </p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            Realtime data
          </div>
        </div>

        <div className="mt-6">
          <CourseEditor initialCourses={courses} />
        </div>
      </div>
    </ProtectedAdminShell>
  );
}
