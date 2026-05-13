import Link from "next/link";
import { mainNav } from "@/data/site";
import { getBrandSettings } from "@/services/brandService";

export async function SiteFooter() {
  const brand = await getBrandSettings();
  const phoneHref = `tel:${brand.phone.replace(/\D/g, "")}`;
  const emailHref = `mailto:${brand.email}`;

  return (
    <footer id="lien-he" className="px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-8 border-t border-black/10 pt-8 text-sm text-black/60 md:grid-cols-[1fr_auto_auto]">
        <div>
          <p className="font-bold text-black">{brand.name}</p>
          <p className="mt-2">{brand.tagline}</p>
        </div>
        <nav className="grid gap-2 md:justify-items-end">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-black">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 md:items-end">
          <a href={phoneHref} className="transition hover:text-black">
            Hotline/Zalo: {brand.phone}
          </a>
          <a href={emailHref} className="transition hover:text-black">
            {brand.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
