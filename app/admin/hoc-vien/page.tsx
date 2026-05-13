import { StudentIntakeForm } from "@/components/admin/student-intake-form";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { sampleStudents } from "@/data/platform";
import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";

export default async function AdminStudentsPage() {
  const [courses, leads] = await Promise.all([getCourses(), getLeads()]);
  const studentLeads = leads.filter((lead) => lead.source.startsWith("admin-student"));

  return (
    <ProtectedAdminShell nextPath="/admin/hoc-vien">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý học viên.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Hiện có thể lưu hồ sơ học viên từ Facebook/Zalo vào Supabase leads.
          Cấp quyền học thật sẽ cần bảng enrollments và service role ở bước tiếp
          theo.
        </p>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">
            Tạo hồ sơ học viên thủ công
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Lưu học viên từ Facebook/Zalo vào hệ thống.
          </h2>
          <StudentIntakeForm courses={courses} />
        </SoftCard>

        {studentLeads.length > 0 ? (
          <SoftCard className="mt-10">
            <p className="text-sm font-semibold text-[#c77b20]">
              Hồ sơ chờ cấp quyền
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-black/45">
                  <tr>
                    <th className="py-3">Học viên</th>
                    <th>Liên hệ</th>
                    <th>Ghi chú</th>
                    <th>Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {studentLeads.map((student) => (
                    <tr key={student.id ?? student.name} className="border-t border-black/10">
                      <td className="py-4 font-semibold">{student.name}</td>
                      <td>
                        {student.phone}
                        {student.email ? (
                          <>
                            <br />
                            {student.email}
                          </>
                        ) : null}
                      </td>
                      <td className="whitespace-pre-line">{student.need}</td>
                      <td>{student.source.replace("admin-student:", "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SoftCard>
        ) : null}

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">
            Demo dashboard học viên
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-black/45">
                <tr>
                  <th className="py-3">Mã</th>
                  <th>Học viên</th>
                  <th>Liên hệ</th>
                  <th>Khóa học</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {sampleStudents.map((student) => (
                  <tr key={student.id} className="border-t border-black/10">
                    <td className="py-4 font-semibold">{student.id}</td>
                    <td>{student.name}</td>
                    <td>
                      {student.email}
                      <br />
                      {student.phone}
                    </td>
                    <td>{student.course}</td>
                    <td>{student.progress}%</td>
                    <td className="font-semibold text-[#c77b20]">
                      {student.status}
                    </td>
                    <td>{student.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SoftCard>
      </div>
    </ProtectedAdminShell>
  );
}
