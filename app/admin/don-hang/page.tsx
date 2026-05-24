import { AdminPageHeader, AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
import { CopyPhoneButton } from "@/components/admin/copy-phone-button";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { formatAdminDate, getOrderStatusMeta } from "@/lib/admin/crm-dashboard";
import { getPaymentOrders } from "@/services/orderService";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminOrdersPage() {
  const orders = await getPaymentOrders({ includeFallback: false });
  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);

  return (
    <ProtectedAdminShell nextPath="/admin/don-hang">
      <div className="mx-auto max-w-[1180px]">
        <AdminPageHeader
          eyebrow="Revenue operations"
          title="Quản lý đơn hàng"
          description="Theo dõi trạng thái thanh toán, đối soát đơn chờ và doanh thu đã ghi nhận từ checkout hoặc tạo thủ công."
        />

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <AdminPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Tổng đơn</p>
            <p className="mt-2 text-3xl font-black">{orders.length}</p>
          </AdminPanel>
          <AdminPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Chờ thanh toán</p>
            <p className="mt-2 text-3xl font-black text-[#9a6418]">{pendingOrders.length}</p>
          </AdminPanel>
          <AdminPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Đã thanh toán</p>
            <p className="mt-2 text-3xl font-black text-[#1f7a4d]">{paidOrders.length}</p>
          </AdminPanel>
          <AdminPanel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Doanh thu</p>
            <p className="mt-2 text-2xl font-black">{formatVnd(revenue)}</p>
          </AdminPanel>
        </section>

        <AdminPanel className="mt-7 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">Order queue</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.025em]">Danh sách đơn</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="warning">Chờ thanh toán</StatusBadge>
              <StatusBadge tone="success">Đã thanh toán</StatusBadge>
              <StatusBadge tone="neutral">Hết hạn</StatusBadge>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {orders.length > 0 ? (
              <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
                <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                  <tr>
                    <th className="py-3">Mã đơn</th>
                    <th>Học viên</th>
                    <th>Khóa học</th>
                    <th>Số tiền</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                    <th>Email thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const status = getOrderStatusMeta(order.status);
                    const paymentEmailStatus =
                      order.status !== "paid"
                        ? ({ label: "Chưa thanh toán", tone: "neutral" } as const)
                        : order.paymentEmailSentAt
                          ? ({ label: "Đã gửi", tone: "success" } as const)
                          : order.paymentEmailLastError
                            ? ({ label: "Lỗi email", tone: "warning" } as const)
                            : ({ label: "Chưa gửi", tone: "neutral" } as const);

                    return (
                      <tr key={order.id} className="border-t border-black/10 align-top">
                        <td className="py-4 font-black">{order.orderCode}</td>
                        <td>
                          <p className="font-semibold">{order.studentName || "Chưa có tên"}</p>
                          <div className="mt-1 grid gap-1 text-xs text-black/45">
                            {order.email ? <p className="break-all">{order.email}</p> : null}
                            {order.phone ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <a className="font-semibold text-slate-700 hover:text-slate-950" href={`tel:${order.phone}`}>
                                  {order.phone}
                                </a>
                                <CopyPhoneButton phone={order.phone} />
                              </div>
                            ) : (
                              <p>Chưa có SĐT</p>
                            )}
                          </div>
                        </td>
                        <td className="max-w-sm text-black/65">
                          {order.orderItems.length > 0 ? (
                            <div className="grid gap-1">
                              {order.orderItems.map((item) => (
                                <p key={`${order.id}-${item.slug}`}>{item.title}</p>
                              ))}
                            </div>
                          ) : (
                            order.courseTitle || "Chưa chọn khóa"
                          )}
                        </td>
                        <td className="font-semibold">{order.amountLabel}</td>
                        <td className="text-black/50">{formatAdminDate(order.createdAt)}</td>
                        <td>
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                        </td>
                        <td>
                          <StatusBadge tone={paymentEmailStatus.tone}>{paymentEmailStatus.label}</StatusBadge>
                          {order.paymentEmailLastError ? (
                            <p className="mt-1 max-w-[220px] text-xs leading-5 text-black/45">
                              {order.paymentEmailLastError}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="Chưa có đơn hàng"
                description="Đơn từ trang thanh toán hoặc hồ sơ học viên thanh toán thủ công sẽ xuất hiện tại đây."
              />
            )}
          </div>
        </AdminPanel>
      </div>
    </ProtectedAdminShell>
  );
}
