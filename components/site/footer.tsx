import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";
import { getBrandSettings } from "@/services/brandService";

export async function SiteFooter() {
  const brand = await getBrandSettings();
  const phoneHref = `tel:${brand.phone.replace(/\D/g, "")}`;
  const emailHref = `mailto:${brand.email}`;
  const featuredLinks = [
    { label: "Solopreneur OS", href: "/khoa-hoc" },
    { label: "Content Engine", href: "/blog" },
    { label: "AI Workflow", href: "/tai-lieu" },
    { label: "Tai nguyen mien phi", href: "/tai-lieu" },
  ];
  const usefulLinks = [
    { label: "Blog", href: "/blog" },
    { label: "He sinh thai", href: "/khoa-hoc" },
    { label: "Hoc vien", href: "/hoc-vien" },
    { label: "Dang ky", href: "/dang-ky" },
  ];
  const helpLinks = [
    { label: "Lien he chung toi", href: "/lien-he" },
    { label: "Ve chung toi", href: "/gioi-thieu" },
    { label: "Dang nhap hoc vien", href: "/dang-nhap" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <footer id="lien-he" className="border-t border-black/10 bg-[#fbfaf7] px-5 py-14 text-black sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr]">
        <div className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-3" aria-label={brand.name}>
            <BrandMark brand={brand} className="grid size-14 place-items-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-black/10" />
            <span className="text-2xl font-black tracking-[-0.04em]">
              {brand.shortName}
            </span>
          </Link>
          <p className="mt-6 max-w-xl text-sm font-medium leading-7 text-black/62">
            He sinh thai giup solopreneur dong goi chuyen mon, xay content engine,
            thiet ke sales system va dung AI workflow de van hanh gon hon.
          </p>
          <div className="mt-10">
            <p className="text-lg font-black text-[#c77b20]">Dang ky nhan ban tin</p>
            <form
              className="mt-5 flex max-w-sm items-center gap-2 rounded-full border border-black/15 bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.06)]"
              action={emailHref}
            >
              <input
                className="min-h-10 flex-1 bg-transparent px-4 text-sm text-black outline-none placeholder:text-black/38"
                name="subject"
                placeholder="Nhap dia chi email cua ban"
                type="email"
              />
              <button
                className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-lg font-black text-white transition-colors hover:bg-black/82"
                type="submit"
                aria-label="Dang ky nhan ban tin"
              >
                -&gt;
              </button>
            </form>
          </div>
        </div>

        <FooterColumn title="He sinh thai" links={featuredLinks} />
        <FooterColumn title="Lien ket huu ich" links={usefulLinks} />
        <div>
          <FooterColumn title="Tro giup" links={helpLinks} />
          <div className="mt-6 grid gap-2 text-sm font-semibold text-black/62">
            <a href={phoneHref} className="text-black/62 transition hover:text-[#c77b20]">
              Hotline/Zalo: {brand.phone}
            </a>
            <a href={emailHref} className="text-black/62 transition hover:text-[#c77b20]">
              {brand.email}
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1440px] flex-col gap-3 border-t border-black/10 pt-6 text-xs font-semibold text-black/42 sm:flex-row sm:items-center sm:justify-between">
        <p>(c) {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/lien-he" className="transition hover:text-black">
            Chinh sach bao mat
          </Link>
          <Link href="/dang-ky" className="transition hover:text-black">
            Dieu khoan va dieu kien
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  links,
  title,
}: {
  links: { label: string; href: string }[];
  title: string;
}) {
  return (
    <nav>
      <p className="text-lg font-black text-[#c77b20]">{title}</p>
      <div className="mt-6 grid gap-4">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-bold text-black/68 transition hover:text-black"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
