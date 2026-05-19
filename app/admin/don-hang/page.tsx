import { AdminPageHeader, AdminPanel, EmptyState, StatusBadge } from "@/components/admin/crm-ui";
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
      <div className="mx-auto max-w-7xl">
        <AdminPageHeader
          eyebrow="Revenue operations"
          title="Quản lý đơn hàng"
          description="Theo dõi trạng thái thanh toán, đối soát đơn chờ và doanh thu đã ghi nhận từ checkout hoặc tạo thủ công."
        />

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Tổng đơn</p>
            <p className="mt-2 text-3xl font-black">{orders.length}</p>
          </AdminPanel>
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Chờ thanh toán</p>
            <p className="mt-2 text-3xl font-black text-[#9a6418]">{pendingOrders.length}</p>
          </AdminPanel>
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Đã thanh toán</p>
            <p className="mt-2 text-3xl font-black text-[#1f7a4d]">{paidOrders.length}</p>
          </AdminPanel>
          <AdminPanel className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/38">Doanh thu</p>
            <p className="mt-2 text-2xl font-black">{formatVnd(revenue)}</p>
          </AdminPanel>
        </section>

        <AdminPanel className="mt-5 p-5">
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

          <div className="mt-5 overflow-x-auto">
            {orders.length > 0 ? (
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-black/38">
                  <tr>
                    <th className="py-3">Mã đơn</th>
                    <th>Học viên</th>
                    <th>Khóa học</th>
                    <th>Số tiền</th>
                    <th>Ngày tạo</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const status = getOrderStatusMeta(order.status);

                    return (
                      <tr key={order.id} className="border-t border-black/10 align-top">
                        <td className="py-4 font-black">{order.orderCode}</td>
                        <td>
                          <p className="font-semibold">{order.studentName || "Chưa có tên"}</p>
                          {order.email || order.phone ? (
                            <p className="mt-1 text-xs text-black/45">{order.email || order.phone}</p>
                          ) : null}
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
