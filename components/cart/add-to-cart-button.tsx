"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { addToCart, readCart, subscribeCart } from "@/lib/cart";

type AddToCartButtonProps = {
  slug: string;
  title: string;
  price: string;
  className?: string;
};

export function AddToCartButton({ slug, title, price, className = "" }: AddToCartButtonProps) {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const update = () => setExists(readCart().some((item) => item.slug === slug));
    update();
    return subscribeCart(update);
  }, [slug]);

  return (
    <Button
      data-testid={`add-to-cart-${slug}`}
      className={exists ? `border border-[#2f8f62] bg-[#e7f3df] text-[#1f5e41] ${className}` : className}
      size="md"
      variant={exists ? "secondary" : "secondary"}
      onClick={() => {
        addToCart({ slug, title, price });
        setExists(true);
      }}
      type="button"
    >
      {exists ? "Đã trong giỏ" : "Thêm vào giỏ"}
    </Button>
  );
}
