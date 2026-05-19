import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/cart-page-client";
import { PageShell } from "@/components/site/page-shell";
import { getCurrentAuth } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Giỏ hàng",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage() {
  const auth = await getCurrentAuth();
  const user = auth.user;

  return (
    <PageShell>
      <section className="ai-shell pb-24 pt-32 sm:pt-40">
        <p className="ai-kicker">Giỏ hàng</p>
        <h1 className="ai-glow-text mt-4 text-5xl font-black tracking-[-0.04em] sm:text-7xl">
          Chốt khóa học trước khi thanh toán.
        </h1>
        <p className="ai-muted mt-6 max-w-3xl text-lg leading-9">
          Bạn có thể thêm nhiều khóa học vào giỏ và thanh toán tự động qua SePay.
        </p>
        <div className="mt-10">
          <CartPageClient
            auth={{
              isLoggedIn: Boolean(user),
              email: user?.email ?? "",
              fullName: String(user?.user_metadata?.full_name ?? ""),
              phone: String(user?.user_metadata?.phone ?? ""),
            }}
          />
        </div>
      </section>
    </PageShell>
  );
}
