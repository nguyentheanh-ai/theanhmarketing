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

function getContentIds(order: PaymentOrder) {
  const itemSlugs = order.orderItems.map((item) => item.slug).filter(Boolean);
  return itemSlugs.length ? itemSlugs : [order.courseSlug].filter(Boolean);
}

export function PaymentStatusPoller({
  initialOrder,
  disablePolling = false,
  variant = "dark",
}: {
  initialOrder: PaymentOrder;
  disablePolling?: boolean;
  variant?: "dark" | "light";
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const checkoutTrackedRef = useRef(false);
  const purchaseTrackedRef = useRef(false);
  const isLight = variant === "light";

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
    if (disablePolling) {
      return;
    }

    if (!checkoutTrackedRef.current) {
      checkoutTrackedRef.current = true;
      trackMarketingEvent("InitiateCheckout", {
        content_ids: getContentIds(order),
        content_name: order.courseTitle,
        content_type: "product",
        currency: order.currency || "VND",
        transaction_id: order.orderCode,
        value: order.amount,
      });
    }

    if (order.status === "paid") {
      if (!purchaseTrackedRef.current) {
        purchaseTrackedRef.current = true;
        trackMarketingEvent("Purchase", {
          content_ids: getContentIds(order),
          content_name: order.courseTitle,
          content_type: "product",
          currency: order.currency || "VND",
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
  }, [disablePolling, order, router]);

  const paid = order.status === "paid";

  return (
    <div
      className={
        isLight
          ? paid
            ? "rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
            : "rounded-3xl border border-blue-100 bg-blue-50 p-4 text-slate-950"
          : paid
            ? "rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4"
            : "rounded-xl border border-white/10 bg-white/8 p-4"
      }
    >
      <p className={isLight ? "text-sm font-bold text-slate-500" : "text-sm font-bold text-white/55"}>Trạng thái</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.03em]">
        {paid ? "Đã nhận thanh toán" : "Đang chờ chuyển khoản"}
      </p>
      <p className={isLight ? "mt-2 text-sm font-semibold leading-6 text-slate-600" : "mt-2 text-sm leading-6 text-white/60"}>
        {paid
          ? "SePay đã báo tiền vào. Đang chuyển bạn tới khu học viên..."
          : disablePolling
            ? "Đây là bản demo giao diện checkout. Khi tạo đơn thật từ form đăng ký, hệ thống sẽ tự đối soát SePay theo mã đơn mới."
            : "Trang này tự kiểm tra mỗi vài giây. Sau khi chuyển khoản thành công, trạng thái sẽ đổi tự động."}
      </p>

      {!paid && !disablePolling ? (
        <div className={isLight ? "mt-3 inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black text-blue-600" : "mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-white/65"}>
          Thời gian giữ đơn: {formatCountdown(secondsLeft)}
        </div>
      ) : null}
    </div>
  );
}
