"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { clearCart, readCart, removeFromCart, subscribeCart, type CartItem } from "@/lib/cart";
import { formatVnd, parseVndAmount } from "@/lib/payments/sepay";
import { trackMarketingEvent } from "@/lib/tracking/events";

type CartPageClientProps = {
  auth: {
    isLoggedIn: boolean;
    email: string;
    fullName: string;
    phone: string;
  };
};

export function CartPageClient({ auth }: CartPageClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => setItems(readCart());
    update();
    return subscribeCart(update);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + parseVndAmount(item.price), 0),
    [items],
  );

  async function handleCheckout() {
    if (!auth.isLoggedIn) {
      router.push(`/dang-nhap?next=${encodeURIComponent("/gio-hang")}`);
      return;
    }

    if (items.length === 0) {
      return;
    }

    setMessage("");
    setIsCreatingOrder(true);

    const response = await fetch("/api/orders/from-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseSlugs: items.map((item) => item.slug),
      }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      order?: { orderCode: string };
      message?: string;
    };

    if (!response.ok || !payload.order?.orderCode) {
      setMessage(payload.message ?? "Không tạo được đơn thanh toán. Vui lòng thử lại.");
      setIsCreatingOrder(false);
      return;
    }

    clearCart();
    trackMarketingEvent("InitiateCheckout", {
      event_id: payload.order.orderCode,
      order_id: payload.order.orderCode,
      content_ids: items.map((item) => item.slug),
      content_name: items.map((item) => item.title).join(", "),
      content_type: "product",
      currency: "VND",
      value: total,
    });
    router.push(`/thanh-toan/${payload.order.orderCode}`);
  }

  if (items.length === 0) {
    return (
      <div className="ai-panel p-6">
        <p className="text-lg font-bold text-white/70">Giỏ hàng đang trống.</p>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Hãy thêm khóa học từ trang danh sách hoặc trang chi tiết khóa học.
        </p>
        <ButtonLink href="/khoa-hoc" className="mt-5">
          Xem khóa học
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="ai-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-black tracking-[-0.03em]">Khóa học trong giỏ</p>
          <button
            className="text-sm font-bold text-white/45 transition hover:text-white"
            onClick={() => clearCart()}
            type="button"
          >
            Xóa toàn bộ
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <div
              key={item.slug}
              className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-sm text-white/55">{item.slug}</p>
              </div>
              <p className="font-bold text-[#8bdcff]">{item.price}</p>
              <button
                className="text-sm font-bold text-white/45 transition hover:text-white"
                onClick={() => removeFromCart(item.slug)}
                type="button"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-panel-strong p-6">
        <p className="ai-kicker">Tổng thanh toán</p>
        <p className="mt-2 text-4xl font-black tracking-[-0.04em]">{formatVnd(total)}</p>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {auth.isLoggedIn
            ? "Bạn đã đăng nhập, bấm thanh toán ngay để tạo đơn và hiện mã QR."
            : "Bước tiếp theo là tạo tài khoản để gắn đơn hàng và chuyển đến mã QR thanh toán."}
        </p>
        {auth.isLoggedIn ? (
          <p className="mt-2 text-xs font-semibold text-white/50">
            Tài khoản: {auth.fullName || auth.email || "Học viên"}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {auth.isLoggedIn ? (
            <Button
              isLoading={isCreatingOrder}
              loadingLabel="Đang tạo đơn..."
              onClick={handleCheckout}
              type="button"
            >
              Thanh toán ngay
            </Button>
          ) : (
            <>
              <ButtonLink href={`/dang-ky?next=${encodeURIComponent("/gio-hang")}`}>
                Tạo tài khoản
              </ButtonLink>
              <ButtonLink href={`/dang-nhap?next=${encodeURIComponent("/gio-hang")}`} variant="secondary">
                Đăng nhập để thanh toán
              </ButtonLink>
            </>
          )}
          <Link
            href="/khoa-hoc"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-5 text-sm font-bold text-white/65 transition hover:text-white"
          >
            Thêm khóa học khác
          </Link>
        </div>
        {message ? (
          <p className="mt-4 rounded-xl bg-red-500/12 p-4 text-sm font-semibold text-red-100">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
