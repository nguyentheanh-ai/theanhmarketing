"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackMarketingEvent } from "@/lib/tracking/events";
import type { PaymentOrder } from "@/services/orderService";

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function PaymentStatusPoller({ initialOrder }: { initialOrder: PaymentOrder }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const purchaseTrackedRef = useRef(false);

  const countdownTarget = useMemo(() => {
    const createdTime = Date.parse(order.createdAt);
    return Number.isNaN(createdTime) ? null : createdTime + 5 * 60 * 1000;
  }, [order.createdAt]);

  useEffect(() => {
    const updateCountdown = () => {
      const target = countdownTarget ?? Date.now() + 5 * 60 * 1000;
      const left = Math.ceil((target - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, left));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [countdownTarget]);

  useEffect(() => {
    if (order.status === "paid") {
      if (!purchaseTrackedRef.current) {
        purchaseTrackedRef.current = true;
        trackMarketingEvent("Purchase", {
          content_name: order.courseTitle,
          currency: "VND",
          transaction_id: order.orderCode,
          value: order.amount,
        });
      }
      const redirectTimer = window.setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
      return () => window.clearTimeout(redirectTimer);
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
  }, [order.amount, order.courseTitle, order.orderCode, order.status, router]);

  const paid = order.status === "paid";

  return (
    <div
      className={
        paid
          ? "rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4"
          : "rounded-xl border border-white/10 bg-white/8 p-4"
      }
    >
      <p className="text-sm font-bold text-white/55">Trạng thái</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.03em]">
        {paid ? "Đã nhận thanh toán" : "Đang chờ chuyển khoản"}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/60">
        {paid
          ? "SePay đã báo tiền vào. Đang chuyển bạn tới khu học viên..."
          : "Trang này tự kiểm tra mỗi vài giây. Sau khi chuyển khoản thành công, trạng thái sẽ đổi tự động."}
      </p>

      {!paid ? (
        <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-white/65">
          Thời gian giữ đơn: {formatCountdown(secondsLeft)}
        </div>
      ) : null}
    </div>
  );
}
