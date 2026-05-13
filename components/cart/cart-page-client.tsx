"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { clearCart, readCart, removeFromCart, subscribeCart, type CartItem } from "@/lib/cart";
import { formatVnd, parseVndAmount } from "@/lib/payments/sepay";

export function CartPageClient() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const update = () => setItems(readCart());
    update();
    return subscribeCart(update);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + parseVndAmount(item.price), 0),
    [items],
  );

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
          Bước tiếp theo là tạo tài khoản để gắn đơn hàng và chuyển đến mã QR thanh toán.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/dang-ky">Tạo tài khoản</ButtonLink>
          <Link
            href="/khoa-hoc"
            className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-5 text-sm font-bold text-black/65 transition hover:text-black"
          >
            Thêm khóa học khác
          </Link>
        </div>
      </div>
    </div>
  );
}
