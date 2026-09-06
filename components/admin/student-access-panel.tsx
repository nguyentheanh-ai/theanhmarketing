import { StudentAccessActions } from "@/components/admin/student-access-actions";
import { AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
import Link from "next/link";
import { getAccessStatusMeta } from "@/lib/admin/crm-dashboard";
import type { AdminRole } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/course-access";
import { getAdminCourses, getAdminStudentAccessRecords } from "@/services/adminDataService";
import type { StudentAccessRecord } from "@/services/studentAccessService";

function MetricIcon({ tone, children }: { tone: "slate" | "green" | "amber"; children: string }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return <span className={`grid size-10 place-items-center rounded-md text-lg font-black ${toneClass}`}>{children}</span>;
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "slate" | "green" | "amber";
  icon: string;
}) {
  return (
    <AdminPanel className="rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <MetricIcon tone={tone}>{icon}</MetricIcon>
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-black leading-none text-slate-950">{value}</p>
        </div>
      </div>
    </AdminPanel>
  );
}

function getRoleLabel(student: StudentAccessRecord) {
  if (isAdminEmail(student.email)) {
    return "Quản trị";
  }

  return student.role === "Học viên" ? "Học viên" : "Lead";
}

function getOrderLabel(student: StudentAccessRecord) {
  const codes = student.paidOrderCodes.length > 0 ? student.paidOrderCodes : student.pendingOrderCodes;

  if (codes.length === 0) {
    return "Chưa có đơn";
  }

  if (codes.length === 1) {
    return codes[0];
  }

  return `${codes[0]} +${codes.length - 1}`;
}

function normalizeSearchQuery(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getSearchText(student: StudentAccessRecord) {
  return [
    student.name,
    student.email,
    student.phone,
    ...student.courseTitles,
    ...student.courseSlugs,
    ...student.paidOrderCodes,
    ...student.pendingOrderCodes,
  ]
    .join(" ")
    .toLowerCase();
}

export async function StudentAccessPanel({ params, adminRole }: { params: Record<string, string | string[] | undefined>; adminRole: AdminRole }) {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const query = normalizeSearchQuery(value("q"));
  const courseFilter = value("course");
  const statusFilter = value("status");
  const [courses, students] = await Promise.all([getAdminCourses(), getAdminStudentAccessRecords()]);
  const filteredStudents = students.filter((student) => (!query || getSearchText(student).includes(query))
    && (!courseFilter || student.courseSlugs.includes(courseFilter))
    && (!statusFilter || (statusFilter === "active" ? student.accessStatus === "Có quyền học" : student.accessStatus !== "Có quyền học")));
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / 25));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(Number(value("page")) || 1)));
  const visibleStudents = filteredStudents.slice((page - 1) * 25, page * 25);
  const grantedCount = filteredStudents.filter((student) => getAccessStatusMeta(student.accessStatus).tone === "success").length;
  const pendingCount = filteredStudents.length - grantedCount;
  const pageHref = (nextPage: number) => `/admin/crm-v2/students?${new URLSearchParams({ q: query, course: courseFilter, status: statusFilter, page: String(nextPage) })}`;
  return (
    <>
      <div className="mx-auto max-w-[1480px]">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="HV" label="Học viên đã lọc" tone="slate" value={filteredStudents.length} />
          <StatCard icon="✓" label="Đã cấp quyền" tone="green" value={grantedCount} />
          <StatCard icon="C" label="Đang chờ" tone="amber" value={pendingCount} />
        </section>

        <AdminPanel className="mt-5 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Danh sách học viên</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {`Trang ${page}/${pageCount} · ${filteredStudents.length} học viên đã lọc`}
              </p>
            </div>
            <form className="flex w-full max-w-xl flex-col gap-2 sm:flex-row" action="/admin/crm-v2/students">
              <label className="sr-only" htmlFor="student-search">
                Tìm học viên
              </label>
              <input
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                defaultValue={query}
                id="student-search"
                name="q"
                placeholder="Nhập tên, SĐT hoặc email"
                type="search"
              />
              <select aria-label="Khóa học" name="course" defaultValue={courseFilter} className="h-10 rounded-lg border border-slate-200 px-2 text-sm">
                <option value="">Tất cả khóa</option>{courses.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}
              </select>
              <select aria-label="Quyền học" name="status" defaultValue={statusFilter} className="h-10 rounded-lg border border-slate-200 px-2 text-sm">
                <option value="">Tất cả quyền</option><option value="active">Có quyền học</option><option value="pending">Chưa cấp quyền</option>
              </select>
              <div className="flex gap-2">
                <button className="h-10 rounded-md bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300" type="submit">
                  Tìm
                </button>
                {query ? (
                  <a className="grid h-10 place-items-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" href="/admin/crm-v2/students">
                    Xóa
                  </a>
                ) : null}
              </div>
            </form>
          </div>

          <div className="mt-4 overflow-x-auto">
            {visibleStudents.length > 0 ? (
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="rounded-l-md px-3 py-3">Tên/liên hệ</th>
                    <th className="px-3 py-3">Vai trò</th>
                    <th className="px-3 py-3">Trạng thái quyền học</th>
                    <th className="px-3 py-3">Khóa đã đăng ký</th>
                    <th className="px-3 py-3">Mã đơn</th>
                    <th className="rounded-r-md px-3 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => {
                    const status = getAccessStatusMeta(student.accessStatus);
                    const isActive = status.tone === "success";

                    return (
                      <tr key={student.id} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-3 py-4">
                          <p className="font-bold text-slate-950">{student.name || "Chưa có tên"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">{student.phone || student.email || "Chưa có liên hệ"}</p>
                          {student.phone && student.email ? <p className="mt-0.5 text-xs text-slate-400">{student.email}</p> : null}
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-700">{getRoleLabel(student)}</td>
                        <td className="px-3 py-4">
                          <StatusBadge tone={isActive ? "success" : "warning"}>{isActive ? "Đã kích hoạt" : "Đang chờ"}</StatusBadge>
                        </td>
                        <td className="max-w-xs px-3 py-4">
                          {student.courseTitles.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {student.courseTitles.map((courseTitle) => (
                                <span key={courseTitle} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                  {courseTitle}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa có khóa</span>
                          )}
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-700">{getOrderLabel(student)}</td>
                        <td className="px-3 py-4">
                          <StudentAccessActions
                            canDelete={adminRole === "owner"}
                            courses={courses}
                            student={student}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title={query ? "Không tìm thấy học viên" : "Chưa có học viên"}
                description={
                  query
                    ? "Thử tìm bằng số điện thoại, email hoặc tên khác."
                    : "Hồ sơ học viên sẽ xuất hiện sau khi có đơn hàng hoặc khi admin tạo thủ công."
                }
              />
            )}
          </div>
          <nav aria-label="Phân trang học viên" className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold">
            {page > 1 ? <Link href={pageHref(page - 1)}>← Trang trước</Link> : <span />}
            <span>{page}/{pageCount}</span>
            {page < pageCount ? <Link href={pageHref(page + 1)}>Trang tiếp →</Link> : <span />}
          </nav>
        </AdminPanel>
      </div>
    </>
  );
}
