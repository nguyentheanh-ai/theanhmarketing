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
  const primaryHref = isLoggedIn ? "/dashboard" : "/dang-ky";
  const primaryLabel = isLoggedIn ? "Growth Hub của tôi" : "Khám phá Growth System";

  return (
    <>
      <header className="site-header-motion fixed inset-x-0 top-0 z-50 border-b border-[#77d7ff]/15 bg-[#05080d]/78 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-5 lg:px-12 xl:px-16">
        <Link href="/" className="flex items-center gap-3" aria-label={brand.name}>
          <BrandMark brand={brand} className="grid size-9 place-items-center overflow-hidden rounded-lg bg-white/8 p-1 shadow-[0_0_26px_rgba(56,189,248,0.2)] ring-1 ring-[#77d7ff]/25" />
          <span className="text-base font-bold tracking-[-0.03em] text-white sm:text-lg">
            {brand.shortName}
            <span className="text-[#38bdf8]">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-white/62 lg:flex xl:gap-8">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ButtonLink href={primaryHref} className="!hidden sm:!inline-flex">
            {primaryLabel}
            <span aria-hidden="true">-&gt;</span>
          </ButtonLink>
          {isLoggedIn ? (
            <SignOutButton className="hidden min-h-10 rounded-xl px-4 text-sm font-bold text-white/62 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50 md:inline-flex md:items-center" />
          ) : (
            <ButtonLink href="/dang-nhap" variant="ghost" className="!hidden px-0 md:!inline-flex">
              Đăng nhập
            </ButtonLink>
          )}
        </div>
      </div>

      <nav className="mobile-nav-scroll mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-white/62 lg:hidden">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-xl border border-white/10 bg-white/8 px-3.5 py-2 transition hover:text-white"
          >
            {item.label}
          </Link>
        ))}
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="shrink-0 rounded-xl bg-[#159cfb] px-4 py-2 text-white shadow-[0_0_24px_rgba(56,189,248,0.28)]"
          >
            Growth Hub của tôi
          </Link>
        ) : (
          <>
            <Link
              href="/dang-ky"
              className="shrink-0 rounded-xl bg-[#8bdcff] px-4 py-2 font-black text-[#061018] shadow-[0_0_24px_rgba(139,220,255,0.3)]"
            >
              Đăng ký
            </Link>
            <Link
              href="/dang-nhap"
              className="shrink-0 rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-white"
            >
              Đăng nhập
            </Link>
          </>
        )}
      </nav>

      </header>

      <div className="mobile-site-action lg:hidden" aria-label="Hành động nhanh trên điện thoại">
        {isLoggedIn ? (
          <>
            <Link href="/dashboard">Học tiếp</Link>
            <Link href="/khoa-hoc">Khóa học</Link>
          </>
        ) : (
          <>
            <Link href="/dang-ky">Đăng ký học</Link>
            <Link href="/khoa-hoc">Xem khóa học</Link>
          </>
        )}
      </div>
    </>
  );
}
