import { StudentIntakeForm } from "@/components/admin/student-intake-form";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getCourses } from "@/services/courseService";
import { getStudentAccessRecords } from "@/services/studentAccessService";

export default async function AdminStudentsPage() {
  const [courses, students] = await Promise.all([getCourses(), getStudentAccessRecords()]);
  const grantedCount = students.filter((student) => student.accessStatus === "Có quyền học").length;
  const pendingCount = students.length - grantedCount;

  return (
    <ProtectedAdminShell nextPath="/admin/hoc-vien">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý học viên.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Dữ liệu học viên được tổng hợp từ đơn hàng thật và hồ sơ tư vấn. Đơn đã thanh toán
          sẽ tự trở thành quyền học, cùng email đăng nhập của học viên trong dashboard.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <SoftCard>
            <p className="text-sm font-semibold text-black/45">Tổng hồ sơ</p>
            <p className="mt-3 text-4xl font-black">{students.length}</p>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-black/45">Có quyền học</p>
            <p className="mt-3 text-4xl font-black text-[#2f8f62]">{grantedCount}</p>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-black/45">Chờ xử lý</p>
            <p className="mt-3 text-4xl font-black text-[#c77b20]">{pendingCount}</p>
          </SoftCard>
        </div>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">
            Tạo hồ sơ và cấp quyền
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Lưu học viên từ Facebook/Zalo vào hệ thống.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/55">
            Chọn “Đã thanh toán” để hệ thống tạo đơn thủ công trạng thái paid. Email trong
            form chính là email được dùng để mở khóa học trong dashboard.
          </p>
          <StudentIntakeForm courses={courses} />
        </SoftCard>

        <SoftCard className="mt-10">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#c77b20]">Quyền học viên</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                Danh sách học viên thật.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-black/55">
              Dashboard học viên đọc cùng nguồn đơn hàng này, nên học viên đã thanh toán sẽ thấy
              khóa học trong mục đã sở hữu.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="text-black/45">
                <tr>
                  <th className="py-3">Học viên</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Quyền học</th>
                  <th>Khóa học</th>
                  <th>Đơn hàng</th>
                  <th>Nguồn / ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map((student) => (
                    <tr key={student.id} className="border-t border-black/10 align-top">
                      <td className="py-4 font-semibold">{student.name || "Chưa có tên"}</td>
                      <td>
                        {student.email || "Chưa có email"}
                        <br />
                        <span className="text-black/50">{student.phone || "Chưa có SĐT"}</span>
                      </td>
                      <td>{student.role}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            student.accessStatus === "Có quyền học"
                              ? "bg-[#e8f7ec] text-[#237a4f]"
                              : "bg-[#f7edda] text-[#a36216]"
                          }`}
                        >
                          {student.accessStatus}
                        </span>
                        <p className="mt-2 text-xs text-black/45">{student.paymentStatus}</p>
                      </td>
                      <td className="max-w-xs">
                        {student.courseTitles.length > 0 ? student.courseTitles.join(", ") : "Chưa chọn khóa"}
                      </td>
                      <td>
                        {student.paidOrderCodes.length > 0 ? (
                          <p>Paid: {student.paidOrderCodes.join(", ")}</p>
                        ) : null}
                        {student.pendingOrderCodes.length > 0 ? (
                          <p className="text-black/50">Pending: {student.pendingOrderCodes.join(", ")}</p>
                        ) : null}
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
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-black/10">
                    <td className="py-8 text-black/55" colSpan={7}>
                      Chưa có đơn hàng hoặc hồ sơ học viên thật trong Supabase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SoftCard>
      </div>
    </ProtectedAdminShell>
  );
}
