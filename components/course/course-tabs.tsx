const tabs = [
  { label: "Tổng quan", href: "#tong-quan" },
  { label: "Quyền lợi", href: "#quyen-loi" },
  { label: "Giáo trình", href: "#giao-trinh" },
  { label: "Giảng viên", href: "#giang-vien" },
  { label: "Đánh giá", href: "#danh-gia" },
];

export function CourseTabs() {
  return (
    <nav className="sticky top-32 z-30 -mx-5 flex gap-2 overflow-x-auto border-y border-[#77d7ff]/15 bg-[#05080d]/82 px-5 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      {tabs.map((tab) => (
        <a
          key={tab.href}
          href={tab.href}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
