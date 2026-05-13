import { AdminShell } from "@/components/app/admin-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";
import { adminMetrics, sampleLeads, sampleOrders, sampleStudents } from "@/data/platform";

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.045em]">
              Tổng quan hệ thống.
            </h1>
          </div>
          <ButtonLink href="/admin/khoa-hoc">Tạo khóa học</ButtonLink>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {adminMetrics.map((item) => (
            <SoftCard key={item.label}>
              <p className="text-sm text-black/55">{item.label}</p>
              <p className="mt-3 text-3xl font-black tracking-[-0.04em]">
                {item.value}
              </p>
              <p className="mt-2 text-sm text-black/45">{item.detail}</p>
            </SoftCard>
          ))}
        </div>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Đơn hàng gần đây</p>
            <div className="mt-5 grid gap-3">
              {sampleOrders.map((order) => (
                <div key={order.id} className="grid gap-2 rounded-2xl border border-black/10 p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-bold">{order.id} · {order.student}</p>
                    <p className="mt-1 text-sm text-black/55">{order.course}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="font-bold">{order.amount}</p>
                    <p className="mt-1 text-sm text-[#c77b20]">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Lead cần chăm sóc</p>
            <div className="mt-5 grid gap-3">
              {sampleLeads.map((lead) => (
                <div key={lead.name} className="rounded-2xl bg-[#f2eadf] p-4">
                  <p className="font-bold">{lead.name}</p>
                  <p className="mt-1 text-sm text-black/60">{lead.need}</p>
                  <p className="mt-2 text-sm font-semibold text-[#c77b20]">{lead.status}</p>
                </div>
              ))}
            </div>
          </SoftCard>
        </section>

        <SoftCard className="mt-5">
          <p className="text-sm font-semibold text-[#c77b20]">Học viên mới</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-black/45">
                <tr>
                  <th className="py-3">Mã</th>
                  <th>Học viên</th>
                  <th>Khóa học</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sampleStudents.map((student) => (
                  <tr key={student.id} className="border-t border-black/10">
                    <td className="py-4 font-semibold">{student.id}</td>
                    <td>{student.name}</td>
                    <td>{student.course}</td>
                    <td>{student.progress}%</td>
                    <td className="font-semibold text-[#c77b20]">{student.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SoftCard>
      </div>
    </AdminShell>
  );
}
