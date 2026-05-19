import Link from "next/link";
import { BrandMark } from "@/components/site/brand-mark";
import { getBrandSettings } from "@/services/brandService";

export async function SiteFooter() {
  const brand = await getBrandSettings();
  const phoneHref = `tel:${brand.phone.replace(/\D/g, "")}`;
  const emailHref = `mailto:${brand.email}`;
  const featuredLinks = [
    { label: "The Anh OS", href: "/he-sinh-thai" },
    { label: "Khóa học", href: "/khoa-hoc" },
    { label: "AI Workflow", href: "/blog#tai-lieu" },
    { label: "Workshop live", href: "/workshop" },
  ];
  const usefulLinks = [
    { label: "Blog", href: "/blog" },
    { label: "Hệ sinh thái", href: "/he-sinh-thai" },
    { label: "Học viên", href: "/hoc-vien" },
    { label: "Đối tác", href: "/doi-tac" },
    { label: "Đăng ký", href: "/dang-ky" },
  ];
  const helpLinks = [
    { label: "Liên hệ", href: "/lien-he" },
    { label: "Marketing OS", href: "/gioi-thieu" },
    { label: "Đăng nhập học viên", href: "/dang-nhap" },
    { label: "Dashboard học viên", href: "/dashboard" },
    { label: "Admin CRM", href: "/admin/dashboard" },
  ];

  return (
    <footer id="lien-he" className="relative z-10 border-t border-[#77d7ff]/15 bg-[#04070c]/88 px-4 py-12 text-white sm:px-8 sm:py-14">
      <div className="mx-auto grid max-w-[1440px] gap-8 sm:gap-10 lg:grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr]">
        <div className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-3" aria-label={brand.name}>
            <BrandMark brand={brand} className="grid size-14 place-items-center overflow-hidden rounded-xl bg-white/8 p-1.5 ring-1 ring-[#77d7ff]/25" />
            <span className="text-2xl font-black tracking-[-0.04em]">
              {brand.shortName}
            </span>
          </Link>
          <p className="ai-muted mt-6 max-w-xl text-sm font-medium leading-7">
            Hệ sinh thái giúp người học xây nền tảng marketing, dùng AI workflow để sản xuất nội dung,
            quản lý tài liệu, học theo khóa và được chăm sóc qua CRM/admin.
          </p>
          <div className="mt-10">
            <p className="text-lg font-black text-[#8bdcff]">Đăng ký nhận bản tin</p>
            <form
              className="mt-5 flex max-w-full items-center gap-2 rounded-xl border border-[#77d7ff]/18 bg-white/7 p-1.5 shadow-[0_0_34px_rgba(56,189,248,0.12)] sm:max-w-sm"
              action={emailHref}
            >
              <input
                className="min-h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/38"
                name="subject"
                placeholder="Nhập email của bạn"
                type="email"
              />
              <button
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#159cfb] text-lg font-black text-white transition-colors hover:bg-[#38bdf8]"
                type="submit"
                aria-label="Đăng ký nhận bản tin"
              >
                -&gt;
              </button>
            </form>
          </div>
        </div>

        <FooterColumn title="Hệ sinh thái" links={featuredLinks} />
        <FooterColumn title="Liên kết" links={usefulLinks} />
        <div>
          <FooterColumn title="Trợ giúp" links={helpLinks} />
          <div className="mt-6 grid gap-2 text-sm font-semibold">
            <a href={phoneHref} className="text-white/62 transition hover:text-[#8bdcff]">
              Hotline/Zalo: {brand.phone}
            </a>
            <a href={emailHref} className="text-white/62 transition hover:text-[#8bdcff]">
              {brand.email}
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1440px] flex-col gap-3 border-t border-white/10 pt-6 text-xs font-semibold leading-6 text-white/42 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
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
      <p className="text-lg font-black text-[#8bdcff]">{title}</p>
      <div className="mt-6 grid gap-4">
        {links.map((item) => (
          <Link
            key={`${title}-${item.href}-${item.label}`}
            href={item.href}
            className="text-sm font-bold text-white/68 transition hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

