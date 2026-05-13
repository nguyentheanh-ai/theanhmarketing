import Link from "next/link";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { ButtonLink } from "@/components/ui/button-link";
import { mainNav } from "@/data/site";
import { getBrandSettings } from "@/services/brandService";

export async function SiteHeader() {
  const brand = await getBrandSettings();

  return (
    <header className="site-header-motion fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#fbfaf7]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 lg:px-12 xl:px-16">
        <Link href="/" className="flex items-center gap-3" aria-label={brand.name}>
          <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-[#09090a] text-sm font-bold text-white">
            {brand.logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={brand.name}
                className="size-full object-cover"
                src={brand.logoImage}
              />
            ) : (
              brand.logoMark
            )}
          </span>
          <span className="text-lg font-bold tracking-[-0.03em]">
            {brand.shortName}
            <span className="text-[#f2a23a]">.</span>
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
          <ThemeToggle />
          <ButtonLink href={brand.primaryCtaHref} className="hidden sm:inline-flex">
            {brand.primaryCtaLabel}
            <span aria-hidden="true">→</span>
          </ButtonLink>
          <ButtonLink href="/dang-nhap" variant="ghost" className="hidden px-0 md:inline-flex">
            Đăng nhập
          </ButtonLink>
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
      </nav>
    </header>
  );
}
