import type { ReactNode } from "react";

const platformNodes = [
  { label: "FB", name: "Facebook", className: "social-node--facebook" },
  { label: "TT", name: "TikTok", className: "social-node--tiktok" },
  { label: "YT", name: "YouTube", className: "social-node--youtube" },
  { label: "IG", name: "Instagram", className: "social-node--instagram" },
  { label: "X", name: "X", className: "social-node--x" },
  { label: "TH", name: "Threads", className: "social-node--threads" },
];

const sourceBars = [
  { label: "Facebook", value: 78, color: "bg-[#4357d8]" },
  { label: "TikTok", value: 56, color: "bg-[#111827]" },
  { label: "Báo chí", value: 42, color: "bg-[#59d98d]" },
];

const campaignBars = [32, 82, 64, 76, 58, 88, 70, 92, 80, 96, 74];

const keywords = [
  { text: "Giá tốt", className: "left-[17%] top-[28%] text-[#4357d8] text-xl" },
  { text: "Trải nghiệm", className: "left-[34%] top-[62%] text-[#59d98d] text-sm" },
  { text: "Dịch vụ", className: "left-[58%] top-[22%] text-[#4357d8] text-xs" },
  { text: "Tư vấn", className: "left-[64%] top-[56%] text-[#9ca3af] text-lg" },
  { text: "Uy tín", className: "left-[45%] top-[42%] text-[#111827] text-3xl" },
  { text: "Nhanh", className: "left-[25%] top-[50%] text-[#59d98d] text-xs" },
  { text: "Đối thủ", className: "left-[70%] top-[34%] text-[#4357d8] text-sm" },
];

function MiniDonut({ tone = "blue" }: { tone?: "blue" | "green" | "red" }) {
  const color =
    tone === "green" ? "text-[#59d98d]" : tone === "red" ? "text-[#e45b40]" : "text-[#4357d8]";

  return (
    <div className="relative size-20">
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(#4357d8_0_48%,#59d98d_48%_76%,#d5d9e3_76%_100%)]" />
      <div className="absolute inset-4 grid place-items-center rounded-full bg-white">
        <span className={`text-[10px] font-black ${color}`}>1.0K</span>
      </div>
    </div>
  );
}

function ChartShell({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`social-chart-card rounded-[1rem] border border-[#3654ff] bg-white p-4 shadow-[0_18px_55px_rgba(30,64,175,0.14)] ${className}`}>
      <div className="flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-black/10 text-[11px] font-black text-[#4357d8]">
          {eyebrow}
        </span>
        <div>
          <p className="text-xs font-black text-[#07111f]">{title}</p>
          <p className="mt-0.5 text-[10px] font-semibold leading-4 text-black/45">
            Cập nhật theo thời gian thực
          </p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function SocialTrackHeroCharts() {
  return (
    <div className="social-dashboard relative min-h-[520px] overflow-hidden rounded-[2rem] border border-[#3654ff] bg-[#f8fbff] p-5 shadow-[0_34px_100px_rgba(30,64,175,0.14)] sm:min-h-[560px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_44%,rgba(67,87,216,0.14),transparent_36%),radial-gradient(circle_at_72%_72%,rgba(89,217,141,0.18),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-[680px] grid-cols-12 gap-3">
        <ChartShell title="Total Mentions" eyebrow="M" className="col-span-12 sm:col-span-7">
          <div className="flex h-36 items-end gap-2 border-b border-l border-black/8 px-2">
            {campaignBars.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="social-bar w-full rounded-t bg-[#4357d8]"
                style={{ height: `${value}%`, animationDelay: `${index * 90}ms` }}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-3 text-[10px] font-bold text-black/55">
            <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[#4357d8]" /> Mentions 48%</span>
            <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-[#59d98d]" /> Comments 29%</span>
          </div>
        </ChartShell>

        <ChartShell title="Total Source" eyebrow="S" className="social-float-card col-span-12 sm:col-span-5">
          <div className="flex items-center gap-4">
            <MiniDonut />
            <div className="grid flex-1 gap-2">
              {sourceBars.map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-[10px] font-bold text-black/55">
                    <span>{bar.label}</span>
                    <span>{bar.value}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-black/8">
                    <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartShell>

        <ChartShell title="Keyword Cloud" eyebrow="K" className="social-float-card col-span-12 min-h-40">
          <div className="relative h-36">
            {keywords.map((word, index) => (
              <span
                key={word.text}
                className={`social-keyword absolute font-black ${word.className}`}
                style={{ animationDelay: `${index * 180}ms` }}
              >
                {word.text}
              </span>
            ))}
          </div>
        </ChartShell>

        <ChartShell title="Sentiment Analysis" eyebrow="A" className="col-span-12 sm:col-span-8">
          <div className="grid grid-cols-[auto_1fr] items-center gap-4">
            <MiniDonut tone="green" />
            <div className="relative h-28 border-b border-l border-black/8">
              <svg viewBox="0 0 280 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path className="social-line social-line--green" d="M0 86 C45 66 70 82 112 58 S190 50 280 26" />
                <path className="social-line social-line--red" d="M0 104 C70 96 118 100 168 88 S226 86 280 78" />
              </svg>
            </div>
          </div>
        </ChartShell>

        <div className="social-profile-card social-float-card col-span-12 rounded-[1rem] border border-[#3654ff] bg-white p-4 shadow-[10px_14px_0_#1f2a89,0_18px_46px_rgba(30,64,175,0.2)] sm:absolute sm:bottom-10 sm:right-3 sm:w-[230px]">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-[#eef4ff] text-sm font-black text-[#4357d8]">TC</div>
            <div>
              <p className="text-sm font-black">Thu Cúc</p>
              <p className="text-xs font-semibold text-black/45">@lead9827</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {["F", "IG", "X", "YT"].map((item) => (
              <span key={item} className="grid size-7 place-items-center rounded-full bg-[#eef4ff] text-[10px] font-black text-[#4357d8]">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <span className="h-2 rounded-full bg-black/12" />
            <span className="h-2 w-4/5 rounded-full bg-black/12" />
            <span className="h-2 w-11/12 rounded-full bg-black/12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialListeningOrbit({ centerLabel = "AI" }: { centerLabel?: string }) {
  return (
    <div className="social-orbit relative mx-auto aspect-square w-full max-w-[520px]">
      <div className="social-ring social-ring--outer" />
      <div className="social-ring social-ring--middle" />
      <div className="social-ring social-ring--inner" />
      <div className="social-orbit-core absolute left-1/2 top-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#4357d8] text-lg font-black text-white shadow-[0_14px_34px_rgba(67,87,216,0.34)]">
        {centerLabel}
      </div>
      {platformNodes.map((node, index) => (
        <div
          key={node.name}
          className={`social-node ${node.className}`}
          style={{ animationDelay: `${index * -0.45}s` }}
          title={node.name}
        >
          {node.label}
        </div>
      ))}
    </div>
  );
}

export function SocialTrackListeningSection() {
  const bullets = [
    "Theo dõi mọi cuộc trò chuyện về thương hiệu trên Facebook, TikTok, YouTube, X, Threads, Instagram và báo điện tử.",
    "Phát hiện sớm tín hiệu bất thường, đo sentiment, nguồn thảo luận và chủ đề đang tăng tốc theo từng giai đoạn.",
    "Biến mentions rời rạc thành insight để tối ưu nội dung, chiến dịch, chăm sóc khách hàng và quyết định truyền thông.",
  ];

  return (
    <section className="bg-white px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <SocialListeningOrbit />
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#4357d8]">Social listening đa nền tảng</p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] text-[#07111f] sm:text-5xl">
            Lắng nghe dữ liệu trước khi thị trường lên tiếng quá muộn.
          </h2>
          <div className="mt-8 grid gap-5">
            {bullets.map((item) => (
              <div key={item} className="grid grid-cols-[34px_1fr] gap-4">
                <span className="mt-1 grid size-7 place-items-center rounded-full border-2 border-[#4357d8] text-sm font-black text-[#4357d8]">
                  ✓
                </span>
                <p className="text-base font-semibold leading-8 text-black/66">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SocialTrackInsightCards() {
  const cards = [
    {
      title: "Phân tích chiến dịch",
      copy: "Theo dõi mentions, tương tác, tốc độ lan tỏa và sentiment để biết thông điệp nào đang kéo hiệu quả thật.",
    },
    {
      title: "Thị phần thảo luận",
      copy: "So sánh Share of Voice giữa thương hiệu và đối thủ, tách theo nền tảng, chủ đề và mốc thời gian.",
    },
  ];

  return (
    <section className="bg-[#fbfaf7] px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-2">
        {cards.map((card, index) => (
          <div key={card.title} className="rounded-[1.75rem] border border-[#3654ff] bg-white p-6 shadow-[0_24px_80px_rgba(30,64,175,0.08)] sm:p-8">
            <div className={`rounded-[1.25rem] p-5 ${index === 0 ? "bg-[#4357d8]" : "bg-white"}`}>
              <SocialTrackHeroCharts />
            </div>
            <h3 className="mt-9 text-3xl font-black tracking-[-0.04em] text-[#07111f]">{card.title}</h3>
            <p className="mt-4 text-base font-semibold leading-8 text-black/62">{card.copy}</p>
            <div className="mt-7 grid gap-4">
              {["Custom keywords theo mục tiêu", "So sánh trước - sau chiến dịch", "Nhận diện chủ đề và bài viết nổi bật"].map((item) => (
                <div key={item} className="flex gap-3 text-sm font-semibold leading-6 text-black/66">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-[#4357d8] text-xs font-black text-[#4357d8]">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ArticleInsightPanel() {
  return (
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-[#3654ff] bg-[#eef6ff] p-5 sm:p-8">
      <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#4357d8]">SocialTrack insight</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-[#07111f]">
            Đọc bài viết cùng lớp dữ liệu social listening.
          </h2>
          <p className="mt-4 text-base font-semibold leading-8 text-black/62">
            Khi triển khai nội dung hoặc chiến dịch, SocialTrack giúp bạn kiểm tra chủ đề nào đang được nhắc đến,
            nguồn thảo luận đến từ đâu và sentiment thay đổi ra sao theo thời gian.
          </p>
        </div>
        <SocialTrackHeroCharts />
      </div>
    </section>
  );
}
