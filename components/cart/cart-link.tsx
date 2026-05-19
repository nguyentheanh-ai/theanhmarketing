"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart, subscribeCart } from "@/lib/cart";

export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().length);
    update();
    return subscribeCart(update);
  }, []);

  return (
    <Link
      href="/gio-hang"
      className="tap-motion inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-4 text-sm font-bold text-white/70 hover:border-[#77d7ff]/35 hover:text-white"
    >
      Giỏ hàng
      <span className="grid size-6 place-items-center rounded-full bg-[#159cfb] text-xs font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
