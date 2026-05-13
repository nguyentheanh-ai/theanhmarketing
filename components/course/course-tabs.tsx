const tabs = [
  { label: "Tổng quan", href: "#tong-quan" },
  { label: "Quyền lợi", href: "#quyen-loi" },
  { label: "Giáo trình", href: "#giao-trinh" },
  { label: "Giảng viên", href: "#giang-vien" },
  { label: "Đánh giá", href: "#danh-gia" },
];

export function CourseTabs() {
  return (
    <nav className="sticky top-32 z-30 -mx-5 flex gap-2 overflow-x-auto border-y border-black/10 bg-[#fbfaf7]/90 px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:bg-white/90">
      {tabs.map((tab) => (
        <a
          key={tab.href}
          href={tab.href}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-black/60 transition hover:bg-[#f2eadf] hover:text-black"
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
