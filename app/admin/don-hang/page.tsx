import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { sampleOrders } from "@/data/platform";

export default function AdminOrdersPage() {
  return (
    <ProtectedAdminShell nextPath="/admin/don-hang">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý đơn hàng.
        </h1>
        <SoftCard className="mt-10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
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
                {sampleOrders.map((order) => (
                  <tr key={order.id} className="border-t border-black/10">
                    <td className="py-4 font-semibold">{order.id}</td>
                    <td>{order.student}</td>
                    <td>{order.course}</td>
                    <td>{order.amount}</td>
                    <td>{order.date}</td>
                    <td className="font-semibold text-[#c77b20]">{order.status}</td>
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
