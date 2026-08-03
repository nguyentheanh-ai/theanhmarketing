import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";
import { HeaderAuthActions } from "@/components/site/header-auth-actions";
import { MobileMenu } from "@/components/site/mobile-menu";
import { mainNav } from "@/data/site";
import { getBrandSettings } from "@/services/brandService";

export async function SiteHeader() {
  const brand = await getBrandSettings();

  return (
    <header className="tam-public-header site-header-motion fixed inset-x-0 top-0 z-50 border-b border-[#dbe7f1]/80 bg-white/88 backdrop-blur-xl">
      <div className="tam-container flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={brand.name}>
            <BrandMark brand={brand} className="grid size-9 place-items-center overflow-hidden rounded-xl bg-[#eef8ff] p-1 ring-1 ring-[#159cfb]/15" />
            <span className="text-base font-black tracking-[-0.035em] text-[var(--tam-ink)] sm:text-lg">
              {brand.shortName}
              <span className="text-[var(--tam-accent)]">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-[var(--tam-muted)] lg:flex xl:gap-8" aria-label="Điều hướng chính">
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} className="relative py-2 transition after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--tam-accent)] after:transition-transform hover:text-[var(--tam-ink)] hover:after:scale-x-100">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <HeaderAuthActions />
          </div>
          <MobileMenu items={mainNav} />
      </div>
    </header>
  );
}
