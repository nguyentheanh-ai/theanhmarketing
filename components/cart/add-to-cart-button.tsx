"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { addToCart, readCart, subscribeCart } from "@/lib/cart";
import { trackMarketingEvent } from "@/lib/tracking/events";

type AddToCartButtonProps = {
  slug: string;
  title: string;
  price: string;
  className?: string;
  label?: string;
};

export function AddToCartButton({ slug, title, price, className = "", label = "Thêm vào giỏ" }: AddToCartButtonProps) {
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
        if (!exists) {
          trackMarketingEvent("AddToCart", {
            content_ids: [slug],
            content_name: title,
            currency: "VND",
          });
        }
        addToCart({ slug, title, price });
        setExists(true);
      }}
      type="button"
    >
      {exists ? "Đã trong giỏ" : label}
    </Button>
  );
}
