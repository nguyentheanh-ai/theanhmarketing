import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";
import { getStudentAccessRecords } from "@/services/studentAccessService";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const [orders, leads, students] = await Promise.all([
    getPaymentOrders({ includeFallback: false }),
    getLeads({ includeFallback: false }),
    getStudentAccessRecords(),
  ]);
  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const grantedStudents = students.filter((student) => student.accessStatus === "Có quyền học");
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
  const adminMetrics = [
    {
      label: "Học viên",
      value: String(grantedStudents.length),
      detail: `${students.length} hồ sơ học viên`,
    },
    {
      label: "Đơn hàng",
      value: String(orders.length),
      detail: `${pendingOrders.length} đơn chờ xử lý`,
    },
    {
      label: "Doanh thu",
      value: formatVnd(revenue),
      detail: `${paidOrders.length} đơn đã thanh toán`,
    },
    {
      label: "Leads",
      value: String(leads.length),
      detail: "Từ form tư vấn và admin",
    },
  ];
  const recentOrders = orders.slice(0, 5);
  const recentLeads = leads.slice(0, 5);
  const recentStudents = students.slice(0, 5);

  return (
    <ProtectedAdminShell nextPath="/admin/dashboard">
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
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="grid gap-2 rounded-2xl border border-black/10 p-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-bold">{order.orderCode} · {order.studentName || "Chưa có tên"}</p>
                      <p className="mt-1 text-sm text-black/55">{order.courseTitle || "Chưa chọn khóa"}</p>
                    </div>
                    <div className="md:text-right">
                      <p className="font-bold">{order.amountLabel}</p>
                      <p className="mt-1 text-sm text-[#c77b20]">{order.status === "paid" ? "Đã thanh toán" : "Chờ xử lý"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-black/10 p-4 text-sm text-black/55">
                  Chưa có đơn hàng thật trong Supabase.
                </div>
              )}
            </div>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Lead cần chăm sóc</p>
            <div className="mt-5 grid gap-3">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div key={lead.id ?? `${lead.phone}-${lead.name}`} className="rounded-2xl bg-[#f2eadf] p-4">
                    <p className="font-bold">{lead.name}</p>
                    <p className="mt-1 text-sm text-black/60">{lead.need || lead.phone || "Chưa có nhu cầu"}</p>
                    <p className="mt-2 text-sm font-semibold text-[#c77b20]">{lead.status || lead.source}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-[#f2eadf] p-4 text-sm text-black/60">
                  Chưa có lead thật trong Supabase.
                </div>
              )}
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
                {recentStudents.length > 0 ? (
                  recentStudents.map((student) => (
                    <tr key={student.id} className="border-t border-black/10">
                      <td className="py-4 font-semibold">{student.paidOrderCodes[0] ?? student.id}</td>
                      <td>{student.name || student.email || "Chưa có tên"}</td>
                      <td>{student.courseTitles.length > 0 ? student.courseTitles.join(", ") : "Chưa chọn khóa"}</td>
                      <td>{student.paymentStatus}</td>
                      <td className="font-semibold text-[#c77b20]">{student.accessStatus}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-black/10">
                    <td className="py-8 text-black/55" colSpan={5}>
                      Chưa có học viên thật trong Supabase.
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
