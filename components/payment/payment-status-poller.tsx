"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentOrder } from "@/services/orderService";

export function PaymentStatusPoller({ initialOrder }: { initialOrder: PaymentOrder }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (order.status === "paid") {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/orders/${order.orderCode}`, { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { order?: PaymentOrder };

      if (data.order) {
        setOrder(data.order);

        if (data.order.status === "paid") {
          router.refresh();
        }
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [order.orderCode, order.status, router]);

  const paid = order.status === "paid";

  return (
    <div className={paid ? "rounded-2xl bg-[#e7f3df] p-4" : "rounded-2xl bg-[#f2eadf] p-4"}>
      <p className="text-sm font-bold text-black/55">Trạng thái</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.03em]">
        {paid ? "Đã nhận thanh toán" : "Đang chờ chuyển khoản"}
      </p>
      <p className="mt-2 text-sm leading-6 text-black/60">
        {paid
          ? "Sepay đã báo tiền vào và đơn hàng đã được cập nhật tự động."
          : "Trang này tự kiểm tra mỗi vài giây. Sau khi chuyển khoản thành công, trạng thái sẽ đổi tự động."}
      </p>
    </div>
  );
}
