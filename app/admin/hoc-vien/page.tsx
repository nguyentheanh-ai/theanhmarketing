import { StudentAccessActions } from "@/components/admin/student-access-actions";
import { StudentIntakeForm } from "@/components/admin/student-intake-form";
import { AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getAccessStatusMeta } from "@/lib/admin/crm-dashboard";
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
    return "Admin";
  }

  return student.role === "Học viên" ? "Student" : "Lead";
}

function getOrderLabel(student: StudentAccessRecord) {
  const codes = student.paidOrderCodes.length > 0 ? student.paidOrderCodes : student.pendingOrderCodes;

  if (codes.length === 0) {
    return "No order";
  }

  if (codes.length === 1) {
    return codes[0];
  }

  return `${codes[0]} +${codes.length - 1}`;
}

export default async function AdminStudentsPage() {
  const [courses, students] = await Promise.all([getAdminCourses(), getAdminStudentAccessRecords()]);
  const grantedCount = students.filter((student) => getAccessStatusMeta(student.accessStatus).tone === "success").length;
  const pendingCount = students.length - grantedCount;

  return (
    <ProtectedAdminShell nextPath="/admin/hoc-vien">
      <div className="mx-auto max-w-[1480px]">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="S" label="Total Students" tone="slate" value={students.length} />
          <StatCard icon="✓" label="Active Access" tone="green" value={grantedCount} />
          <StatCard icon="P" label="Pending" tone="amber" value={pendingCount} />
        </section>

        <AdminPanel className="mt-4 max-w-4xl rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Add New Student</h2>
          <StudentIntakeForm courses={courses} />
        </AdminPanel>

        <AdminPanel className="mt-5 rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Student List</h2>

          <div className="mt-4 overflow-x-auto">
            {students.length > 0 ? (
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="rounded-l-md px-3 py-3">Name/Contact</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Access Status</th>
                    <th className="px-3 py-3">Enrolled Course</th>
                    <th className="px-3 py-3">Order ID</th>
                    <th className="rounded-r-md px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const status = getAccessStatusMeta(student.accessStatus);
                    const isActive = status.tone === "success";

                    return (
                      <tr key={student.id} className="border-b border-slate-100 align-top last:border-0">
                        <td className="px-3 py-4">
                          <p className="font-bold text-slate-950">{student.name || "No name"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-600">{student.phone || student.email || "No contact"}</p>
                          {student.phone && student.email ? <p className="mt-0.5 text-xs text-slate-400">{student.email}</p> : null}
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-700">{getRoleLabel(student)}</td>
                        <td className="px-3 py-4">
                          <StatusBadge tone={isActive ? "success" : "warning"}>{isActive ? "Active" : "Pending"}</StatusBadge>
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
                            <span className="text-slate-400">No course</span>
                          )}
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-700">{getOrderLabel(student)}</td>
                        <td className="px-3 py-4">
                          <StudentAccessActions courses={courses} student={student} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No students yet" description="Student records will appear here after an order or manual admin entry." />
            )}
          </div>
        </AdminPanel>
      </div>
    </ProtectedAdminShell>
  );
}
