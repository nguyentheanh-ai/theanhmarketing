import Link from "next/link";
import { getBrandSettings } from "@/services/brandService";

export async function SiteFooter() {
  const brand = await getBrandSettings();
  const phoneHref = `tel:${brand.phone.replace(/\D/g, "")}`;
  const emailHref = `mailto:${brand.email}`;
  const featuredLinks = [
    { label: "Facebook Ads", href: "/khoa-hoc/facebook-ads-2026" },
    { label: "Marketing Online", href: "/khoa-hoc/marketing-online-nen-tang" },
    { label: "AI Marketing", href: "/khoa-hoc/ai-fullstack-marketing-system" },
    { label: "Tài liệu miễn phí", href: "/tai-lieu" },
  ];
  const usefulLinks = [
    { label: "Blog", href: "/blog" },
    { label: "Tất cả khóa học", href: "/khoa-hoc" },
    { label: "Học viên", href: "/hoc-vien" },
    { label: "Đăng ký", href: "/dang-ky" },
  ];
  const helpLinks = [
    { label: "Liên hệ chúng tôi", href: "/lien-he" },
    { label: "Về chúng tôi", href: "/gioi-thieu" },
    { label: "Đăng nhập học viên", href: "/dang-nhap" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <footer id="lien-he" className="border-t border-black/10 bg-[#fbfaf7] px-5 py-14 text-black sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.4fr_0.6fr_0.7fr_0.7fr]">
        <div className="max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-3" aria-label={brand.name}>
            <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-black text-base font-black text-white">
              {brand.logoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={brand.name} className="size-full object-cover" src={brand.logoImage} />
              ) : (
                brand.logoMark
              )}
            </span>
            <span className="text-2xl font-black tracking-[-0.04em]">
              {brand.shortName}
            </span>
          </Link>
          <p className="mt-6 max-w-xl text-sm font-medium leading-7 text-black/62">
            {brand.tagline} Các khóa học và tài liệu được xây theo hướng thực hành,
            dễ áp dụng vào marketing, kinh doanh online và vận hành nội dung.
          </p>
          <div className="mt-10">
            <p className="text-lg font-black text-[#c77b20]">Đăng ký nhận bản tin</p>
            <form
              className="mt-5 flex max-w-sm items-center gap-2 rounded-full border border-black/15 bg-white p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.06)]"
              action={emailHref}
            >
              <input
                className="min-h-10 flex-1 bg-transparent px-4 text-sm text-black outline-none placeholder:text-black/38"
                name="subject"
                placeholder="Nhập địa chỉ email của bạn"
                type="email"
              />
              <button
                className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-lg font-black text-white transition hover:scale-105"
                type="submit"
                aria-label="Đăng ký nhận bản tin"
              >
                →
              </button>
            </form>
          </div>
        </div>

        <FooterColumn title="Danh mục nổi bật" links={featuredLinks} />
        <FooterColumn title="Liên kết hữu ích" links={usefulLinks} />
        <div>
          <FooterColumn title="Trợ giúp" links={helpLinks} />
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
        <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/lien-he" className="transition hover:text-black">
            Chính sách bảo mật
          </Link>
          <Link href="/dang-ky" className="transition hover:text-black">
            Điều khoản & điều kiện
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
