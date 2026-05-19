import Link from "next/link";
import { AdminPageHeader, AdminPanel, EmptyState, StatusBadge, TextLink } from "@/components/admin/crm-ui";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { ButtonLink } from "@/components/ui/button-link";
import {
  buildAdminDashboardModel,
  formatAdminDate,
  getAccessStatusMeta,
  getLeadStatusMeta,
  getOrderStatusMeta,
} from "@/lib/admin/crm-dashboard";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";
import { getStudentAccessRecords } from "@/services/studentAccessService";

export default async function AdminDashboardPage() {
  const [orders, leads, students] = await Promise.all([
    getPaymentOrders({ includeFallback: false }),
    getLeads({ includeFallback: false }),
    getStudentAccessRecords(),
  ]);
  const model = buildAdminDashboardModel({ orders, leads, students });

  return (
    <ProtectedAdminShell nextPath="/admin/dashboard">
      <div className="mx-auto max-w-[1440px]">
        <AdminPageHeader
          eyebrow="Command center"
          title="Dashboard vận hành CRM"
          description="Theo dõi lead, đơn thanh toán, quyền học và các việc cần xử lý trong một màn hình gọn hơn cho admin."
          action={<ButtonLink href="/admin/leads">Thêm lead</ButtonLink>}
        />

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((item) => (
            <Link key={item.id} href={item.href}>
              <AdminPanel className="h-full p-5 transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-black/55">{item.label}</p>
                  <StatusBadge tone={item.tone}>Live</StatusBadge>
                </div>
                <p className="mt-4 text-3xl font-black tracking-[-0.035em]">{item.value}</p>
                <p className="mt-2 text-sm leading-5 text-black/45">{item.detail}</p>
              </AdminPanel>
            </Link>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <AdminPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
                  Ưu tiên hôm nay
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Việc cần xử lý</h2>
              </div>
              <TextLink href="/admin/leads">Mở pipeline</TextLink>
            </div>
            <div className="mt-5 grid gap-3">
              {model.priorityTasks.length > 0 ? (
                model.priorityTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="grid gap-3 rounded-lg border border-black/10 p-4 transition hover:border-black/20 hover:bg-[#fafafa] md:grid-cols-[auto_1fr_auto]"
                  >
                    <StatusBadge tone={task.tone}>
                      {task.type === "order" ? "Đơn" : task.type === "lead" ? "Lead" : "Quyền học"}
                    </StatusBadge>
                    <div>
                      <p className="font-black text-black/80">{task.title}</p>
                      <p className="mt-1 text-sm text-black/50">{task.detail}</p>
                    </div>
                    <p className="text-sm font-semibold text-black/40">{formatAdminDate(task.createdAt)}</p>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="Không có việc khẩn cấp"
                  description="Khi có đơn chờ thanh toán, lead mới hoặc học viên chờ cấp quyền, danh sách này sẽ tự nổi lên đầu dashboard."
                />
              )}
            </div>
          </AdminPanel>

          <AdminPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">
              Pipeline
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Từ lead đến quyền học</h2>
            <div className="mt-5 grid gap-3">
              {model.pipeline.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-4 rounded-lg border border-black/10 p-4 transition hover:border-black/20 hover:bg-[#fafafa]"
                >
                  <div>
                    <p className="font-black">{item.label}</p>
                    <p className="mt-1 text-sm text-black/45">{item.detail}</p>
                  </div>
                  <StatusBadge tone={item.tone}>{item.count}</StatusBadge>
                </Link>
              ))}
            </div>
          </AdminPanel>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <AdminPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black tracking-[-0.025em]">Đơn hàng gần đây</h2>
              <TextLink href="/admin/don-hang">Xem tất cả</TextLink>
            </div>
            <div className="mt-5 overflow-x-auto">
              {model.recentOrders.length > 0 ? (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                    <tr>
                      <th className="py-3">Mã đơn</th>
                      <th>Học viên</th>
                      <th>Khóa học</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.recentOrders.map((order) => {
                      const status = getOrderStatusMeta(order.status);

                      return (
                        <tr key={order.id} className="border-t border-black/8 align-top">
                          <td className="py-4 font-black">{order.orderCode}</td>
                          <td>
                            <p className="font-semibold">{order.studentName || "Chưa có tên"}</p>
                            <p className="mt-1 text-xs text-black/45">{order.email || order.phone || "Chưa có liên hệ"}</p>
                          </td>
                          <td className="max-w-xs text-black/65">{order.courseTitle || "Chưa chọn khóa"}</td>
                          <td className="font-semibold">{order.amountLabel}</td>
                          <td><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="Chưa có đơn hàng thật"
                  description="Các đơn từ checkout hoặc thanh toán thủ công sẽ xuất hiện tại đây sau khi Supabase có dữ liệu."
                />
              )}
            </div>
          </AdminPanel>

          <AdminPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black tracking-[-0.025em]">Lead cần chăm sóc</h2>
              <TextLink href="/admin/leads">Mở leads</TextLink>
            </div>
            <div className="mt-5 grid gap-3">
              {model.recentLeads.length > 0 ? (
                model.recentLeads.map((lead) => {
                  const status = getLeadStatusMeta(lead.status);

                  return (
                    <Link key={lead.id ?? `${lead.name}-${lead.phone}`} href="/admin/leads" className="rounded-lg border border-black/10 p-4 transition hover:border-black/20 hover:bg-[#fafafa]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{lead.name}</p>
                          <p className="mt-1 text-sm text-black/50">{lead.need || lead.phone || "Chưa có nhu cầu"}</p>
                        </div>
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </div>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-black/35">
                        {lead.source || "Website"} · {formatAdminDate(lead.createdAt)}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <EmptyState
                  title="Chưa có lead thật"
                  description="Lead từ form tư vấn hoặc nhập tay trong admin sẽ xuất hiện ở đây để follow-up."
                />
              )}
            </div>
          </AdminPanel>
        </section>

        <AdminPanel className="mt-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-[-0.025em]">Học viên và quyền truy cập</h2>
            <TextLink href="/admin/hoc-vien">Quản lý học viên</TextLink>
          </div>
          <div className="mt-5 overflow-x-auto">
            {model.recentStudents.length > 0 ? (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                  <tr>
                    <th className="py-3">Học viên</th>
                    <th>Liên hệ</th>
                    <th>Khóa học</th>
                    <th>Đơn hàng</th>
                    <th>Quyền học</th>
                  </tr>
                </thead>
                <tbody>
                  {model.recentStudents.map((student) => {
                    const status = getAccessStatusMeta(student.accessStatus);

                    return (
                      <tr key={student.id} className="border-t border-black/8 align-top">
                        <td className="py-4 font-black">{student.name || "Chưa có tên"}</td>
                        <td>
                          {student.email || "Chưa có email"}
                          <p className="mt-1 text-xs text-black/45">{student.phone || "Chưa có SĐT"}</p>
                        </td>
                        <td className="max-w-sm text-black/65">
                          {student.courseTitles.length > 0 ? student.courseTitles.join(", ") : "Chưa chọn khóa"}
                        </td>
                        <td className="text-black/55">
                          {student.paidOrderCodes[0] ?? student.pendingOrderCodes[0] ?? "Chưa có đơn"}
                        </td>
                        <td><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="Chưa có hồ sơ học viên thật"
                description="Hồ sơ được tổng hợp từ đơn hàng và form tạo học viên thủ công trong admin."
              />
            )}
          </div>
        </AdminPanel>
      </div>
    </ProtectedAdminShell>
  );
}
