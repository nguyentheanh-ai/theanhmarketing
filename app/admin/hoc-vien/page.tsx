import { StudentIntakeForm } from "@/components/admin/student-intake-form";
import { AdminPageHeader, AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { formatAdminDate, getAccessStatusMeta } from "@/lib/admin/crm-dashboard";
import { getCourses } from "@/services/courseService";
import { getStudentAccessRecords } from "@/services/studentAccessService";

export default async function AdminStudentsPage() {
  const [courses, students] = await Promise.all([getCourses(), getStudentAccessRecords()]);
  const grantedCount = students.filter((student) => getAccessStatusMeta(student.accessStatus).tone === "success").length;
  const pendingCount = students.length - grantedCount;

  return (
    <ProtectedAdminShell nextPath="/admin/hoc-vien">
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          eyebrow="Student success"
          title="Quản lý học viên"
          description="Tổng hợp học viên từ đơn hàng thật và hồ sơ tư vấn, giúp admin kiểm tra quyền học, khóa đã mua và trạng thái thanh toán."
        />

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Tổng hồ sơ</p>
            <p className="mt-2 text-3xl font-black">{students.length}</p>
          </AdminPanel>
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Có quyền học</p>
            <p className="mt-2 text-3xl font-black text-[#1f7a4d]">{grantedCount}</p>
          </AdminPanel>
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Chờ xử lý</p>
            <p className="mt-2 text-3xl font-black text-[#9a6418]">{pendingCount}</p>
          </AdminPanel>
        </section>

        <AdminPanel className="mt-5 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
            Tạo hồ sơ và cấp quyền
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">
            Lưu học viên từ Facebook/Zalo vào hệ thống
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/55">
            Chọn trạng thái đã thanh toán để hệ thống tạo đơn thủ công trạng thái paid. Email trong form là email dùng để mở khóa học trong dashboard học viên.
          </p>
          <StudentIntakeForm courses={courses} />
        </AdminPanel>

        <AdminPanel className="mt-5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">Access queue</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Danh sách học viên</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success">Có quyền học</StatusBadge>
              <StatusBadge tone="warning">Chờ cấp quyền</StatusBadge>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            {students.length > 0 ? (
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                  <tr>
                    <th className="py-3">Học viên</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Quyền học</th>
                    <th>Khóa học</th>
                    <th>Đơn hàng</th>
                    <th>Nguồn / ghi chú</th>
                    <th>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const status = getAccessStatusMeta(student.accessStatus);

                    return (
                      <tr key={student.id} className="border-t border-black/10 align-top">
                        <td className="py-4 font-black">{student.name || "Chưa có tên"}</td>
                        <td>
                          {student.email || "Chưa có email"}
                          <p className="mt-1 text-xs text-black/45">{student.phone || "Chưa có SĐT"}</p>
                        </td>
                        <td>{student.role}</td>
                        <td>
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                          <p className="mt-2 text-xs text-black/45">{student.paymentStatus}</p>
                        </td>
                        <td className="max-w-xs text-black/65">
                          {student.courseTitles.length > 0 ? student.courseTitles.join(", ") : "Chưa chọn khóa"}
                        </td>
                        <td className="text-black/55">
                          {student.paidOrderCodes.length > 0 ? <p>Paid: {student.paidOrderCodes.join(", ")}</p> : null}
                          {student.pendingOrderCodes.length > 0 ? <p>Pending: {student.pendingOrderCodes.join(", ")}</p> : null}
                          {student.paidOrderCodes.length === 0 && student.pendingOrderCodes.length === 0 ? "Chưa có đơn" : null}
                        </td>
                        <td className="max-w-xs whitespace-pre-line">
                          <span className="font-semibold">{student.source || "Admin"}</span>
                          {student.note ? (
                            <>
                              <br />
                              <span className="text-black/55">{student.note}</span>
                            </>
                          ) : null}
                        </td>
                        <td className="text-black/50">{formatAdminDate(student.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="Chưa có hồ sơ học viên"
                description="Khi có đơn hàng hoặc hồ sơ tạo thủ công, học viên sẽ xuất hiện trong access queue này."
              />
            )}
          </div>
        </AdminPanel>
      </div>
    </ProtectedAdminShell>
  );
}
