"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { formatVnd, parseVndAmount } from "@/lib/payments/sepay";
import { readCart, subscribeCart, type CartItem } from "@/lib/cart";

export function CartToast() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const update = (showToast = false) => {
      const latest = readCart();
      setItems(latest);

      if (latest.length > 0 && showToast) {
        setVisible(true);
        if (timer) {
          window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => setVisible(false), 5000);
      } else {
        setVisible(false);
      }
    };

    update(false);
    const unsubscribe = subscribeCart((action) => update(action === "add"));
    return () => {
      unsubscribe();
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + parseVndAmount(item.price), 0),
    [items],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={`ai-panel fixed bottom-5 right-5 z-[70] w-[min(420px,calc(100vw-2.5rem))] p-4 transition duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-85"
      }`}
    >
      <p className="ai-kicker">Giỏ hàng</p>
      <p className="mt-2 text-base font-black text-white">Đã thêm {items.length} khóa học</p>
      <p className="mt-1 text-sm text-white/60">Tổng tạm tính: {formatVnd(total)}</p>
      <div className="mt-4 flex gap-2">
        <ButtonLink href="/gio-hang" className="flex-1" size="md">
          Thanh toán
        </ButtonLink>
        <ButtonLink href="/khoa-hoc" className="flex-1" size="md" variant="quiet">
          Mua tiếp
        </ButtonLink>
      </div>
    </aside>
  );
}
