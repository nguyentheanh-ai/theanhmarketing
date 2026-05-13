import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getPaymentOrders } from "@/services/orderService";

function getStatusLabel(status: string) {
  if (status === "paid") {
    return "Đã thanh toán";
  }

  if (status === "failed") {
    return "Thất bại";
  }

  if (status === "expired") {
    return "Hết hạn";
  }

  return "Chờ thanh toán";
}

function getDisplayDate(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default async function AdminOrdersPage() {
  const orders = await getPaymentOrders();

  return (
    <ProtectedAdminShell nextPath="/admin/don-hang">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">Quản lý đơn hàng.</h1>
        <SoftCard className="mt-10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-black/45">
                <tr>
                  <th className="py-3">Mã đơn</th>
                  <th>Học viên</th>
                  <th>Khóa học</th>
                  <th>Số tiền</th>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-black/10 align-top">
                    <td className="py-4 font-semibold">{order.orderCode}</td>
                    <td>
                      <p className="font-semibold">{order.studentName}</p>
                      {order.email ? <p className="mt-1 text-xs text-black/55">{order.email}</p> : null}
                    </td>
                    <td>
                      {order.orderItems.length > 0 ? (
                        <div className="grid gap-1">
                          {order.orderItems.map((item) => (
                            <p key={`${order.id}-${item.slug}`} className="text-black/75">
                              {item.title}
                            </p>
                          ))}
                        </div>
                      ) : (
                        order.courseTitle
                      )}
                    </td>
                    <td>{order.amountLabel}</td>
                    <td>{getDisplayDate(order.createdAt)}</td>
                    <td className="font-semibold text-[#c77b20]">{getStatusLabel(order.status)}</td>
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
