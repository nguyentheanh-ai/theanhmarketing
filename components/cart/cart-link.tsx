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
      className="tap-motion inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-bold text-black/70 hover:border-black/20 hover:text-black"
    >
      Giỏ hàng
      <span className="grid size-6 place-items-center rounded-full bg-black text-xs font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
