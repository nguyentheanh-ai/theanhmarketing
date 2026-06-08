import { StudentAccessActions } from "@/components/admin/student-access-actions";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getAccessStatusMeta } from "@/lib/admin/crm-dashboard";
import { isAdminEmail } from "@/lib/course-access";
import { getAdminCourses, getAdminStudentAccessRecords } from "@/services/adminDataService";
import { getStudentActivityLogs, type ActivityLog } from "@/services/activityLogService";
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

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; add_student?: string }>;
}) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params?.q);
  const shouldOpenStudentDialog = params?.add_student === "1";
  const [courses, students] = await Promise.all([getAdminCourses(), getAdminStudentAccessRecords()]);
  const visibleStudents = query ? students.filter((student) => getSearchText(student).includes(query)) : students;
  const activityLogEntries = await Promise.all(
    visibleStudents.map(async (student) => [
      student.id,
      student.email ? await getStudentActivityLogs({ studentEmail: student.email, limit: 20 }) : [],
    ] as const),
  );
  const activityLogsByStudentId = Object.fromEntries(activityLogEntries) as Record<string, ActivityLog[]>;
  const grantedCount = students.filter((student) => getAccessStatusMeta(student.accessStatus).tone === "success").length;
  const pendingCount = students.length - grantedCount;

  return (
    <ProtectedAdminShell nextPath="/admin/hoc-vien" allowedRoles={["owner", "editor"]}>
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-4 flex justify-end">
          <StudentCreateDialog courses={courses} defaultOpen={shouldOpenStudentDialog} />
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="HV" label="Tổng học viên" tone="slate" value={students.length} />
          <StatCard icon="✓" label="Đã cấp quyền" tone="green" value={grantedCount} />
          <StatCard icon="C" label="Đang chờ" tone="amber" value={pendingCount} />
        </section>

        <AdminPanel className="mt-5 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Danh sách học viên</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {query ? `Đang hiển thị ${visibleStudents.length}/${students.length} học viên.` : "Tìm theo tên, số điện thoại hoặc email."}
              </p>
            </div>
            <form className="flex w-full max-w-xl flex-col gap-2 sm:flex-row" action="/admin/hoc-vien">
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
              <div className="flex gap-2">
                <button className="h-10 rounded-md bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300" type="submit">
                  Tìm
                </button>
                {query ? (
                  <a className="grid h-10 place-items-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50" href="/admin/hoc-vien">
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
                            activityLogs={activityLogsByStudentId[student.id] ?? []}
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
        </AdminPanel>
      </div>
    </ProtectedAdminShell>
  );
}
