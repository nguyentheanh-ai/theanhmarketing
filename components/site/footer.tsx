import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";
import { getBrandSettings } from "@/services/brandService";

export async function SiteFooter() {
  const brand = await getBrandSettings();
  const phoneHref = `tel:${brand.phone.replace(/\D/g, "")}`;
  const emailHref = `mailto:${brand.email}`;
  const featuredLinks = [
    { label: "AI Growth System", href: "/he-sinh-thai" },
    { label: "AI Ads Engine", href: "/khoa-hoc" },
    { label: "AI Growth Toolkit", href: "/blog#tai-lieu" },
    { label: "Workshop chẩn đoán", href: "/workshop" },
  ];
  const usefulLinks = [
    { label: "Blog", href: "/blog" },
    { label: "Hệ thống", href: "/he-sinh-thai" },
    { label: "AI Operator Hub", href: "/hoc-vien" },
    { label: "Triển khai cho team", href: "/doi-tac" },
    { label: "Đăng ký", href: "/dang-ky" },
  ];
  const helpLinks = [
    { label: "Liên hệ", href: "/lien-he" },
    { label: "Marketing OS", href: "/gioi-thieu" },
    { label: "Đăng nhập học viên", href: "/dang-nhap" },
    { label: "Dashboard học viên", href: "/dashboard" },
  ];

  return (
    <footer id="lien-he" className="tam-public-footer relative z-10 border-t border-[var(--tam-line)] bg-[#f5f9fd] py-12 text-[var(--tam-ink)] sm:py-16">
      <div className="tam-container grid gap-10 lg:grid-cols-[1.35fr_0.65fr_0.72fr_0.72fr]">
        <div className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-3" aria-label={brand.name}>
            <BrandMark brand={brand} className="grid size-13 place-items-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[#159cfb]/15" />
            <span className="text-2xl font-black tracking-[-0.04em]">
              {brand.shortName}
            </span>
          </Link>
          <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-[var(--tam-muted)]">
            AI Performance Marketing System giúp SME và Solopreneur biến content, ads, funnel,
            automation và CRM/Data thành một hệ thống tăng trưởng có thể vận hành lặp lại.
          </p>
          <div className="mt-10">
            <p className="text-lg font-black text-[var(--tam-ink)]">Nhận AI Growth Toolkit</p>
            <form
              className="mt-4 flex max-w-full items-center gap-2 rounded-full border border-[var(--tam-line)] bg-white p-1.5 shadow-sm sm:max-w-sm"
              action={emailHref}
            >
              <input
                className="min-h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--tam-ink)] outline-none placeholder:text-slate-400"
                name="subject"
                placeholder="Nhập email để nhận toolkit"
                type="email"
              />
              <button
                className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--tam-accent)] text-lg font-black text-white transition-colors hover:bg-[var(--tam-accent-strong)]"
                type="submit"
                aria-label="Nhận AI Growth Toolkit"
              >
                -&gt;
              </button>
            </form>
          </div>
        </div>

        <FooterColumn title="Growth System" links={featuredLinks} />
        <FooterColumn title="Liên kết" links={usefulLinks} />
        <div>
          <FooterColumn title="Trợ giúp" links={helpLinks} />
          <div className="mt-6 grid gap-2 text-sm font-semibold">
            <a href={phoneHref} className="text-[var(--tam-muted)] transition hover:text-[var(--tam-accent-strong)]">
              Hotline/Zalo: {brand.phone}
            </a>
            <a href={emailHref} className="text-[var(--tam-muted)] transition hover:text-[var(--tam-accent-strong)]">
              {brand.email}
            </a>
          </div>
        </div>
      </div>
      <div className="tam-container mt-10 flex flex-col gap-3 border-t border-[var(--tam-line)] pt-6 text-xs font-semibold leading-6 text-slate-500 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/lien-he" className="transition hover:text-white">
            Chính sách bảo mật
          </Link>
          <Link href="/dang-ky" className="transition hover:text-white">
            Điều khoản và điều kiện
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
      <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--tam-ink)]">{title}</p>
      <div className="mt-6 grid gap-4">
        {links.map((item) => (
          <Link
            key={`${title}-${item.href}-${item.label}`}
            href={item.href}
            className="text-sm font-semibold text-[var(--tam-muted)] transition hover:text-[var(--tam-accent-strong)]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
