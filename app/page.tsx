import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

const solopreneurStats = [
  { value: "01", label: "Nguoi lam chu he thong" },
  { value: "24/7", label: "Dong co noi dung va ban hang" },
  { value: "04", label: "Lop van hanh can nam" },
];

const ecosystemLayers = [
  {
    label: "Positioning",
    title: "Dinh vi de khong bi tro thanh freelancer gia re.",
    copy: "Lam ro thi truong, loi hua, offer va ly do khach hang nen chon ban.",
  },
  {
    label: "Content Engine",
    title: "Bien chuyen mon thanh noi dung co kha nang ban hang.",
    copy: "Co khung research, angle, hook, lich xuat ban va tai san noi dung co the tai su dung.",
  },
  {
    label: "Sales System",
    title: "Thiet ke hanh trinh tu nguoi la thanh khach hang.",
    copy: "Lien ket lead magnet, landing page, email/Zalo follow-up va quy trinh tu van.",
  },
  {
    label: "AI Workflow",
    title: "Dung AI nhu bo xu ly, khong phai nhu mot mon do choi.",
    copy: "Tao workflow de nghien cuu, viet, do luong va tu dong hoa nhung viec lap lai.",
  },
];

const chipSignals = ["Research", "Content", "Offer", "CRM", "Ads", "Analytics", "Automation", "Learning"];

const operatingBlocks = [
  "Thu vien tai lieu va checklist cho nguoi tu van hanh",
  "Dashboard hoc vien de theo doi lo trinh va tai san da so huu",
  "CMS de cap nhat khoa hoc, noi dung, media va du lieu van hanh",
  "He thong thanh toan, phan quyen hoc vien va tai nguyen rieng",
];

const solopreneurFaqs = [
  {
    question: "Trang nay danh cho ai?",
    answer:
      "Danh cho solopreneur, founder nho, creator, consultant va nguoi ban tri thuc muon xay he thong noi dung, ban hang va van hanh gon hon.",
  },
  {
    question: "Co phai chi hoc marketing khong?",
    answer:
      "Khong. Trong tam la he sinh thai van hanh cho mot nguoi: dinh vi, san pham tri thuc, noi dung, sales, AI workflow va dashboard hoc tap.",
  },
  {
    question: "AI nam o dau trong he sinh thai?",
    answer:
      "AI duoc dung nhu lop xu ly: research, viet nhap, bien tap, tao checklist, phan tich du lieu va tu dong hoa cac buoc lap lai.",
  },
];

function AiChipScene() {
  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] bg-[#0f1012] p-6 text-white shadow-[0_34px_100px_rgba(0,0,0,0.22)] ring-1 ring-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(47,143,98,0.26),transparent_32%),linear-gradient(135deg,rgba(216,173,87,0.12),transparent_38%,rgba(255,255,255,0.04))]" />
      <div className="absolute left-8 right-8 top-12 h-px bg-white/10" />
      <div className="absolute bottom-16 left-8 right-8 h-px bg-white/10" />
      <div className="absolute bottom-8 top-8 left-14 w-px bg-white/10" />
      <div className="absolute bottom-8 top-8 right-14 w-px bg-white/10" />

      <div className="ai-chip-line absolute left-[12%] top-[25%] h-px w-[28%] bg-[#6fcf97]/70" />
      <div className="ai-chip-line ai-chip-line--slow absolute right-[12%] top-[36%] h-px w-[25%] bg-[#d8ad57]/70" />
      <div className="ai-chip-line absolute bottom-[30%] left-[16%] h-px w-[24%] bg-[#6fcf97]/70" />
      <div className="ai-chip-line ai-chip-line--slow absolute bottom-[22%] right-[15%] h-px w-[26%] bg-[#d8ad57]/70" />

      <div className="ai-chip-orbit absolute left-1/2 top-1/2 grid size-[250px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2rem] border border-white/12 bg-white/[0.04] shadow-[inset_0_0_40px_rgba(255,255,255,0.05)]">
        <div className="ai-chip-pulse absolute inset-8 rounded-[1.5rem] border border-[#6fcf97]/30" />
        <div className="relative grid size-36 place-items-center rounded-[1.4rem] border border-[#d8ad57]/40 bg-[#161719] shadow-[0_0_60px_rgba(47,143,98,0.34)]">
          <div className="absolute -left-7 top-5 h-2 w-7 rounded-full bg-[#6fcf97]/70" />
          <div className="absolute -right-7 top-5 h-2 w-7 rounded-full bg-[#6fcf97]/70" />
          <div className="absolute -left-7 bottom-5 h-2 w-7 rounded-full bg-[#d8ad57]/70" />
          <div className="absolute -right-7 bottom-5 h-2 w-7 rounded-full bg-[#d8ad57]/70" />
          <div className="absolute -top-7 left-6 h-7 w-2 rounded-full bg-[#6fcf97]/70" />
          <div className="absolute -top-7 right-6 h-7 w-2 rounded-full bg-[#d8ad57]/70" />
          <div className="absolute -bottom-7 left-6 h-7 w-2 rounded-full bg-[#d8ad57]/70" />
          <div className="absolute -bottom-7 right-6 h-7 w-2 rounded-full bg-[#6fcf97]/70" />
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d8ad57]">AI Chip</p>
            <p className="mt-2 text-3xl font-black">SOLO</p>
            <p className="text-xs font-bold text-white/48">Operating Core</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid min-h-[472px] content-between">
        <div className="flex flex-wrap gap-2">
          {chipSignals.slice(0, 4).map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/68">
              {item}
            </span>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {chipSignals.slice(4).map((item) => (
            <div key={item} className="rounded-[1rem] border border-white/10 bg-black/20 p-4 backdrop-blur">
              <p className="text-sm font-black text-white">{item}</p>
              <div className="mt-3 h-1 rounded-full bg-[#2f8f62]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SolopreneurStats() {
  return (
    <div className="grid gap-3 rounded-[1.5rem] border border-black/8 bg-white p-3 shadow-[0_22px_70px_rgba(0,0,0,0.06)] sm:grid-cols-3">
      {solopreneurStats.map((item) => (
        <div key={item.label} className="rounded-[1.1rem] bg-[#f7f3ec] px-5 py-4">
          <p className="text-3xl font-black text-[#111113]">{item.value}</p>
          <p className="mt-1 text-sm font-bold text-black/54">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const [resources, testimonials] = await Promise.all([
    getResources(),
    getTestimonials(),
  ]);
  const featuredResources = resources.slice(0, 3);
  const featuredTestimonials = testimonials.slice(0, 3);

  return (
    <PageShell>
      <section className="bg-[#f6f0e4] px-5 pb-20 pt-36 sm:px-8 lg:pt-32">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black/58 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
              Solopreneur Operating System
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-none text-[#101012] sm:text-6xl lg:text-7xl">
              <span className="block">Mot he sinh thai</span>
              <span className="block text-[#2f8f62]">cho Solopreneur</span>
              <span className="block">van hanh gon hon</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-black/68">
              The Anh Marketing se phat trien thanh nen tang giup solopreneur dong goi chuyen mon,
              xay content engine, tao he thong ban hang va dung AI nhu mot bo xu ly van hanh moi ngay.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/khoa-hoc" className="w-full sm:w-auto">
                Kham pha he sinh thai
                <span aria-hidden="true">-&gt;</span>
              </ButtonLink>
              <ButtonLink href="/tai-lieu" variant="secondary" className="w-full sm:w-auto">
                Tai tai nguyen mien phi
              </ButtonLink>
            </div>
            <div className="mt-10">
              <SolopreneurStats />
            </div>
          </div>

          <AiChipScene />
        </div>
      </section>

      <section className="border-y border-black/8 bg-[#111113] px-5 py-16 text-white sm:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8ad57]">
              Solopreneur stack
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              Tu mot nguoi lam tat ca thanh mot he thong biet phan vai.
            </h2>
          </div>
          <div>
            <p className="text-lg font-medium leading-9 text-white/68">
              Trang chu khong tap trung vao mot khoa hoc don le. Day la lop dinh vi cho ca he
              sinh thai: noi dung, san pham tri thuc, sales, tai lieu, dashboard va AI workflow.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {["Think", "Build", "Sell", "Scale"].map((item) => (
                <div key={item} className="rounded-[1.1rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-black text-white">{item}</p>
                  <div className="mt-4 h-1.5 rounded-full bg-[#2f8f62]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeading
          eyebrow="Van de cua Solopreneur"
          title="Ban khong thieu cong cu. Ban thieu mot he dieu hanh cho cong viec mot nguoi."
          description="Solopreneur thuong bi keo giua chuyen mon, noi dung, khach hang, sale, hoc tap va van hanh. He sinh thai nay gom cac lop can thiet de moi viec khong con nam het trong dau ban."
        />
        <div className="grid gap-4">
          {ecosystemLayers.map((item, index) => (
            <div
              key={item.label}
              className="grid gap-4 rounded-[1.25rem] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.045)] sm:grid-cols-[64px_1fr]"
            >
              <span className="grid size-12 place-items-center rounded-full bg-[#111113] text-sm font-black text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#2f8f62]">{item.label}</p>
                <h3 className="mt-2 text-2xl font-black leading-tight">{item.title}</h3>
                <p className="mt-3 text-base font-semibold leading-7 text-black/60">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <SectionHeading
              eyebrow="AI chip layer"
              title="AI la lop xu ly nam giua chuyen mon va hanh dong."
              description="Thay vi dung AI roi rac, he sinh thai can cac workflow on dinh: research, viet, bien tap, phan tich, chuyen doi va tai su dung tai san tri thuc."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {chipSignals.map((signal) => (
                <div key={signal} className="rounded-[1.25rem] border border-black/8 bg-[#fbfaf7] p-6">
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b86f1e]">{signal}</p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/8">
                    <div className="ai-signal-bar h-full rounded-full bg-[#2f8f62]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading
            eyebrow="He sinh thai"
            title="Cac lop can co de mot solopreneur van hanh nhu mot doi nho."
          />
          <div className="grid gap-4">
            {operatingBlocks.map((item, index) => (
              <div key={item} className="rounded-[1.25rem] border border-black/8 bg-white p-6">
                <p className="text-sm font-black text-[#2f8f62]">Layer {index + 1}</p>
                <p className="mt-3 text-lg font-bold leading-8 text-black/70">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#ebe2d4] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Tai nguyen"
              title="Tai san thuc hanh de solopreneur trien khai nhanh hon."
            />
            <ButtonLink href="/tai-lieu" variant="secondary">
              Xem thu vien
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredResources.map((item) => (
              <SoftCard key={item.title} className="h-full rounded-[1.25rem]">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b86f1e]">
                  {item.type} / {item.access}
                </p>
                <h3 className="mt-4 text-2xl font-black leading-tight">{item.title}</h3>
                <p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-black/58">
                  {item.description}
                </p>
              </SoftCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <SectionHeading
          eyebrow="Hoc vien"
          title="Tap trung vao kha nang bien kien thuc thanh he thong lam viec."
          align="center"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featuredTestimonials.map((item) => (
            <SoftCard key={item.name} className="h-full rounded-[1.25rem]">
              <p className="text-lg font-semibold leading-8 text-black/70">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-7 font-black">{item.name}</p>
              <p className="mt-1 text-sm font-semibold text-black/45">{item.title}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
        <SectionHeading eyebrow="FAQ" title="Nhung cau hoi nen lam ro." />
        <div className="grid gap-4">
          {solopreneurFaqs.map((item) => (
            <div key={item.question} className="rounded-[1.25rem] border border-black/8 bg-white p-6">
              <h3 className="text-xl font-black leading-tight">{item.question}</h3>
              <p className="mt-3 text-base font-medium leading-8 text-black/62">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[1.75rem] bg-[#111113] p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.14)] sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8ad57]">
              Solopreneur ecosystem
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
              Xay he thong de ban khong phai luc nao cung tu minh keo moi thu.
            </h2>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/68">
              Bat dau tu tai nguyen, lo trinh hoc va nhung workflow co the dung ngay cho cong viec mot nguoi.
            </p>
          </div>
          <ButtonLink href="/tai-lieu" className="mt-9 bg-white text-black hover:bg-white/88 lg:mt-0">
            Lay tai nguyen dau tien
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
