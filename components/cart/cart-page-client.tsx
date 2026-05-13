"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { clearCart, readCart, removeFromCart, subscribeCart, type CartItem } from "@/lib/cart";
import { formatVnd, parseVndAmount } from "@/lib/payments/sepay";

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
      router.push("/dang-ky");
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
    router.push(`/thanh-toan/${payload.order.orderCode}`);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <p className="text-lg font-bold text-black/70">Giỏ hàng đang trống.</p>
        <p className="mt-2 text-sm leading-6 text-black/60">
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
      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-black tracking-[-0.03em]">Khóa học trong giỏ</p>
          <button
            className="text-sm font-bold text-black/45 transition hover:text-black"
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
              className="grid gap-3 rounded-2xl border border-black/10 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-sm text-black/55">{item.slug}</p>
              </div>
              <p className="font-bold text-[#b56b18]">{item.price}</p>
              <button
                className="text-sm font-bold text-black/45 transition hover:text-black"
                onClick={() => removeFromCart(item.slug)}
                type="button"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-[#fff7ea] p-6">
        <p className="text-sm font-semibold text-[#b56b18]">Tổng thanh toán</p>
        <p className="mt-2 text-4xl font-black tracking-[-0.04em]">{formatVnd(total)}</p>
        <p className="mt-2 text-sm leading-6 text-black/60">
          {auth.isLoggedIn
            ? "Bạn đã đăng nhập, bấm thanh toán ngay để tạo đơn và hiện mã QR."
            : "Bước tiếp theo là tạo tài khoản để gắn đơn hàng và chuyển đến mã QR thanh toán."}
        </p>
        {auth.isLoggedIn ? (
          <p className="mt-2 text-xs font-semibold text-black/50">
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
            <ButtonLink href="/dang-ky">Tạo tài khoản</ButtonLink>
          )}
          <Link
            href="/khoa-hoc"
            className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-5 text-sm font-bold text-black/65 transition hover:text-black"
          >
            Thêm khóa học khác
          </Link>
        </div>
        {message ? (
          <p className="mt-4 rounded-2xl bg-[#f2eadf] p-4 text-sm font-semibold text-black/70">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
