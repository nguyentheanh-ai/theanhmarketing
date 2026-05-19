import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import Image from "next/image";
import type { Course } from "@/data/courses";
import { getCourseLessonCount, getCourseModuleCount } from "@/data/courses";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

const moduleTitles = [
  "Hệ thống Marketing nền tảng",
  "Dữ liệu & đo lường hiệu quả",
  "Content traffic engine",
  "Blueprint cho founder",
  "AI content & automation workflow",
  "Quản trị vận hành Marketing",
];

const moduleMetrics = [
  "Tăng tốc triển khai",
  "Rõ chỉ số cần đọc",
  "Tạo nội dung đều hơn",
  "Có khung ra quyết định",
  "Giảm thao tác lặp lại",
  "Dễ bàn giao cho team",
];

const moduleTimelines = [
  ["Nền tảng & mục tiêu", "Workflow triển khai", "Đo lường và tối ưu"],
  ["Thu thập dữ liệu", "Đọc chỉ số", "Ra quyết định"],
  ["Nghiên cứu insight", "Sản xuất nội dung", "Phân phối và đo lường"],
  ["Định vị thương hiệu", "Lịch nội dung", "Cộng đồng và niềm tin"],
  ["Chọn công cụ", "Thiết kế workflow", "Tự động hóa"],
  ["Audit quy trình", "Viết SOP", "Huấn luyện team"],
];

const ecosystemNodes = [
  { label: "KHÓA HỌC", detail: "Lộ trình học có module, bài học và quyền truy cập.", side: "left top", href: "/khoa-hoc" },
  { label: "TÀI LIỆU", detail: "Checklist, template và workflow đi kèm.", side: "left bottom", href: "/blog#tai-lieu" },
  { label: "CRM", detail: "Lead, đơn hàng, học viên và quyền học.", side: "right top", href: "/admin/dashboard" },
  { label: "HỌC VIÊN", detail: "Dashboard học, tiến độ và hỗ trợ.", side: "right bottom", href: "/hoc-vien" },
];

function MiniLineChart({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "os-mini-chart compact" : "os-mini-chart"}>
      <div className="os-chart-grid" />
      <svg viewBox="0 0 220 120" role="img" aria-label="Biểu đồ hiệu quả nội dung">
        <defs>
          <linearGradient id={compact ? "lineFillCompact" : "lineFill"} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#30c7ff" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#30c7ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M12 104 C35 70 48 76 68 64 C91 49 101 24 122 42 C145 60 154 40 174 31 C192 22 202 12 211 8 L211 120 L12 120 Z" fill={`url(#${compact ? "lineFillCompact" : "lineFill"})`} />
        <path className="os-chart-line" d="M12 104 C35 70 48 76 68 64 C91 49 101 24 122 42 C145 60 154 40 174 31 C192 22 202 12 211 8" />
        <circle cx="122" cy="42" r="4" />
        <circle cx="211" cy="8" r="5" />
      </svg>
    </div>
  );
}

function MiniBarChart() {
  return (
    <div className="os-bar-chart" aria-label="Biểu đồ tương tác học viên">
      {[36, 58, 42, 74, 48, 68, 80, 62, 86, 76].map((height, index) => (
        <span key={`${height}-${index}`} style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }} />
      ))}
    </div>
  );
}

function WorkflowPreview({ variant }: { variant: number }) {
  const nodes = variant % 3 === 0
    ? [
        [16, 35],
        [38, 52],
        [62, 42],
        [84, 58],
      ]
    : variant % 3 === 1
      ? [
          [18, 28],
          [44, 26],
          [72, 42],
          [36, 72],
          [68, 76],
        ]
      : [
          [18, 62],
          [40, 34],
          [60, 64],
          [82, 36],
        ];

  return (
    <div className="module-preview">
      <span className="module-preview-pill">Workflow preview</span>
      <svg viewBox="0 0 180 126" aria-hidden="true">
        {nodes.slice(0, -1).map((node, index) => {
          const next = nodes[index + 1];
          return (
            <path
              key={`${node[0]}-${next[0]}`}
              d={`M${node[0] * 1.8} ${node[1] * 1.26} C${(node[0] + 10) * 1.8} ${node[1] * 1.26}, ${(next[0] - 10) * 1.8} ${next[1] * 1.26}, ${next[0] * 1.8} ${next[1] * 1.26}`}
              className="module-preview-line"
            />
          );
        })}
        {nodes.map((node, index) => (
          <g key={`${node[0]}-${node[1]}`}>
            <rect x={node[0] * 1.8 - 12} y={node[1] * 1.26 - 12} width="24" height="24" rx="6" />
            <text x={node[0] * 1.8} y={node[1] * 1.26 + 4}>{index + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function getCourseImage(course: Course) {
  return (
    course.thumbnailImageUrl ||
    course.bannerImageUrl ||
    toYouTubeThumbnailUrl(course.videoPreviewUrl) ||
    ""
  );
}

function CoursePreview({ course, variant }: { course: Course; variant: number }) {
  const imageUrl = getCourseImage(course);

  if (!imageUrl) {
    return <WorkflowPreview variant={variant} />;
  }

  return (
    <div className="module-preview module-preview-image">
      <span className="module-preview-pill">{course.statusLabel}</span>
      <Image
        src={imageUrl}
        alt={course.thumbnailLabel || course.title}
        fill
        sizes="(min-width: 1024px) 220px, 45vw"
        unoptimized
      />
    </div>
  );
}

export function HeroDashboardMockup() {
  const workflow = ["Nghiên cứu thị trường", "AI lên ý tưởng", "Sản xuất nội dung", "Phân phối", "Đo lường"];

  return (
    <div className="hero-os-card" aria-label="Dashboard học Marketing và AI workflow">
      <div className="hero-os-rail">
        {["TA", "01", "02", "03", "04"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="hero-os-main">
        <div className="hero-os-topbar">
          <div>
            <p>The Anh Marketing OS</p>
            <nav>
              <span>Học viên</span>
              <span>Workflow</span>
              <span>Tài liệu</span>
              <span>CRM</span>
            </nav>
          </div>
          <button type="button">Đang học</button>
        </div>

        <div className="hero-os-grid">
          <section>
            <header>
              <span>Tiến độ học</span>
              <strong>+ đều</strong>
            </header>
            <MiniLineChart compact />
          </section>
          <section>
            <header>
              <span>Tương tác nội dung</span>
              <strong>live</strong>
            </header>
            <MiniBarChart />
          </section>
        </div>

        <section className="hero-os-workflow">
          <header>Workflow triển khai</header>
          <div>
            {workflow.map((item, index) => (
              <span key={item} className={index === 3 ? "active" : ""}>
                <i>{index + 1}</i>
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function ContentOsDashboardMockup({ compact = false }: { compact?: boolean }) {
  const cards = ["Nghiên cứu chủ đề", "AI viết khung", "Kiểm tra insight", "Tạo video", "Đăng đa kênh"];

  return (
    <div className={compact ? "content-os-frame compact" : "content-os-frame"}>
      <aside className="content-os-sidebar">
        <strong>Marketing OS</strong>
        {["Research", "Content", "Automation", "Analytics", "Settings"].map((item, index) => (
          <span key={item} className={index === 0 ? "active" : ""}>{item}</span>
        ))}
      </aside>
      <main className="content-os-main">
        <div className="content-os-titlebar">
          <div>
            <span>Main Stage</span>
            <h3>AI content engine - từ nghiên cứu đến phân phối</h3>
          </div>
          <button type="button">+ Thêm workflow</button>
        </div>

        <section className="content-os-canvas">
          <svg viewBox="0 0 760 315" aria-hidden="true">
            <path className="content-link dim" d="M155 78 C205 78 190 124 242 124" />
            <path className="content-link" d="M384 124 C432 124 420 188 477 188" />
            <path className="content-link" d="M370 202 C424 202 426 188 477 188" />
            <path className="content-link" d="M606 188 C650 188 644 78 692 78" />
            <path className="content-link" d="M310 124 L310 202" />
          </svg>
          {cards.map((item, index) => (
            <div key={item} className={`content-node node-${index + 1}`}>
              <i>{index === 0 ? "Q" : index === 1 ? "AI" : index === 2 ? "R" : index === 3 ? "V" : "P"}</i>
              <strong>{item}</strong>
              <span>{index === 1 ? "(AI)" : index === 3 ? "(Video)" : index === 4 ? "(Multi-platform)" : ""}</span>
            </div>
          ))}
          <div className="content-platforms">
            {["Facebook", "Instagram", "YouTube", "Multi-platform"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="content-os-recent">
          <h4>Nội dung vừa tạo</h4>
          <div>
            {[1, 2, 3, 4].map((item) => (
              <article key={item}>
                <span className="play">▶</span>
                <strong>Video bán hàng<br />phiên bản {item === 3 ? 1 : item}</strong>
                <small>{item === 1 ? "16 May 2026" : "13 May 2026"}</small>
              </article>
            ))}
          </div>
        </section>
      </main>
      <aside className="content-os-predictions">
        <h3>Dự báo hiệu quả</h3>
        <section>
          <header><span>Reach dự kiến</span><strong>real-time</strong></header>
          <MiniLineChart compact />
        </section>
        <section>
          <header><span>Tỷ lệ tương tác</span><strong>real-time</strong></header>
          <MiniLineChart compact />
        </section>
      </aside>
    </div>
  );
}

export function EcosystemMapExact() {
  return (
    <div className="ecosystem-exact">
      <div className="ecosystem-rays" />
      <svg className="ecosystem-wires" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="ecosystemWire" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#77d7ff" stopOpacity="0.12" />
            <stop offset="45%" stopColor="#9d7cff" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#77d7ff" stopOpacity="0.18" />
          </linearGradient>
          <filter id="ecosystemWireGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.25" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path className="wire-orbit" d="M22 27 C38 11 62 11 78 27 C92 42 92 58 76 73 C61 88 39 88 24 73 C8 58 8 42 22 27Z" />
        <path className="wire-main" d="M50 50 C42 42 34 33 22 27" />
        <path className="wire-main" d="M50 50 C42 58 35 67 24 73" />
        <path className="wire-main" d="M50 50 C58 42 66 33 78 27" />
        <path className="wire-main" d="M50 50 C58 58 66 67 76 73" />
        <path className="wire-thread" d="M22 27 C38 30 62 30 78 27" />
        <path className="wire-thread" d="M24 73 C39 67 61 67 76 73" />
      </svg>
      <div className="ecosystem-core">THE ANH<br />OS</div>
      {ecosystemNodes.map((node) => (
        <Link key={node.label} href={node.href} className={`ecosystem-node ${node.side.replace(" ", "-")}`}>
          <i />
          <strong>{node.label}</strong>
          <span>{node.detail}</span>
        </Link>
      ))}
    </div>
  );
}

export function EcosystemFeatureGrid() {
  const items = [
    ["LỘ TRÌNH HỌC", "/khoa-hoc"],
    ["CRM HỌC VIÊN", "/hoc-vien"],
    ["TÀI LIỆU & TEMPLATE", "/blog#tai-lieu"],
    ["CỘNG ĐỒNG", "/hoc-vien"],
    ["WORKFLOW AI", "/workshop"],
    ["DỮ LIỆU VẬN HÀNH", "/admin/dashboard"],
  ];

  return (
    <div className="ecosystem-feature-grid">
      {items.map(([item, href], index) => (
        <Link key={item} href={href}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{item}</strong>
        </Link>
      ))}
    </div>
  );
}

export function ModuleCatalogGrid({ courses, limit }: { courses: Course[]; limit?: number }) {
  const visibleCourses = typeof limit === "number" ? courses.slice(0, limit) : courses;

  return (
    <div className="module-catalog-grid">
      {visibleCourses.map((course, index) => {
        const moduleLabel = moduleTitles[index % moduleTitles.length] ?? "Marketing module";
        const timeline = course.modules.length > 0
          ? course.modules.slice(0, 3).map((module) => module.title)
          : (moduleTimelines[index % moduleTimelines.length] ?? moduleTimelines[0]);
        const tools = course.topics.length > 0 ? course.topics.slice(0, 4) : ["Facebook Ads", "AI", "Content", "CRM"];
        const lessonCount = getCourseLessonCount(course);
        const moduleCount = getCourseModuleCount(course);

        return (
          <article key={course.slug} className="module-card-exact">
            <Link href={`/khoa-hoc/${course.slug}`} className="module-card-title">
              {course.title}
            </Link>
            <div className="module-card-body">
              <Link href={`/khoa-hoc/${course.slug}`} aria-label={course.title}>
                <CoursePreview course={course} variant={index} />
              </Link>
              <div className="module-card-copy">
                <p>Lộ trình khóa học</p>
                <small className="module-card-label">{moduleLabel}</small>
                <ol>
                  {timeline.map((item, itemIndex) => (
                    <li key={item}>{itemIndex + 1}. {item}</li>
                  ))}
                </ol>
                <p>Mô tả ngắn</p>
                <small className="module-card-description">
                  {course.shortDescription || course.description}
                </small>
                <p>Chủ đề chính</p>
                <div className="tool-row">
                  {tools.map((tool) => (
                    <span key={tool}>{tool}</span>
                  ))}
                </div>
                <small>{moduleCount} module · {lessonCount} bài học<br />{course.duration || course.level}</small>
                <div className="module-card-bottom">
                  <strong>{course.price || moduleMetrics[index % moduleMetrics.length]}</strong>
                  <AddToCartButton slug={course.slug} title={course.title} price={course.price} label="Thêm" />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
