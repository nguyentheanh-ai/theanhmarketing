import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/site/brand-mark";
import { ButtonLink } from "@/components/ui/button-link";
import { mainNav } from "@/data/site";
import { getCurrentAuth } from "@/lib/auth/session";
import { getBrandSettings } from "@/services/brandService";

export async function SiteHeader() {
  const [brand, auth] = await Promise.all([getBrandSettings(), getCurrentAuth()]);
  const isLoggedIn = Boolean(auth.user);
  const primaryHref = isLoggedIn ? "/dashboard" : brand.primaryCtaHref;
  const primaryLabel = isLoggedIn ? "Khóa học của tôi" : brand.primaryCtaLabel;

  return (
    <header className="site-header-motion fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#fbfaf7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 lg:px-12 xl:px-16">
        <Link href="/" className="flex items-center gap-3" aria-label={brand.name}>
          <BrandMark brand={brand} className="grid size-11 place-items-center overflow-hidden rounded-lg bg-white p-1 shadow-[0_10px_26px_rgba(0,0,0,0.06)] ring-1 ring-black/8" />
          <span className="text-lg font-bold tracking-[-0.03em]">
            {brand.shortName}
            <span className="text-[#d8ad57]">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-medium text-black/60 lg:flex">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-black">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ButtonLink href={primaryHref} className="hidden sm:inline-flex">
            {primaryLabel}
            <span aria-hidden="true">→</span>
          </ButtonLink>
          {isLoggedIn ? (
            <SignOutButton className="hidden min-h-10 rounded-full px-4 text-sm font-bold text-black/60 transition hover:bg-black/[0.04] hover:text-black disabled:opacity-50 md:inline-flex md:items-center" />
          ) : (
            <ButtonLink href="/dang-nhap" variant="ghost" className="hidden px-0 md:inline-flex">
              Đăng nhập
            </ButtonLink>
          )}
        </div>
      </div>

      <nav className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-5 pb-3 text-sm font-semibold text-black/60 lg:hidden">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full bg-white px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition hover:text-black"
          >
            {item.label}
          </Link>
        ))}
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="shrink-0 rounded-full bg-black px-4 py-2 text-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            Khóa học của tôi
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
