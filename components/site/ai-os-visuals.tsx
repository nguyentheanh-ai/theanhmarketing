import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import Image from "next/image";
import type { Course } from "@/data/courses";
import { getCourseLessonCount, getCourseModuleCount } from "@/data/courses";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

const moduleTitles = [
  "AI Fullstack Marketing System",
  "Marketing Data Analytics",
  "Content Traffic Engine",
  "Founder Marketing Blueprint",
  "AI Content & Automation Workflow",
  "Marketing Operation Management",
];

const moduleMetrics = [
  "X5 Efficiency",
  "10X Insights",
  "5X Traffic Growth",
  "3X Brand Reach",
  "8X Content Output",
  "4X Team Productivity",
];

const moduleTimelines = [
  ["Foundation Setup (2 weeks)", "AI Integration (5 weeks)", "Deployment & Scaling"],
  ["Data Collection (2 weeks)", "Analysis & Visualization", "Predictive Models"],
  ["Keyword Research", "Automated Content Creation", "Distribution Strategy"],
  ["Brand Strategy", "Content Calendar", "Community Building"],
  ["Tool Selection", "Workflow Design", "Automation Setup"],
  ["Process Audit", "SOP Development", "Team Training"],
];

const ecosystemNodes = [
  { label: "AI MARKETING", detail: "Automated campaigns & analytics.", side: "left top" },
  { label: "TEMPLATES", detail: "Premium playbooks.", side: "left bottom" },
  { label: "CRM", detail: "Pipeline & customer access.", side: "right top" },
  { label: "COMMUNITY", detail: "Students, proof and support.", side: "right bottom" },
];

function MiniLineChart({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "os-mini-chart compact" : "os-mini-chart"}>
      <div className="os-chart-grid" />
      <svg viewBox="0 0 220 120" role="img" aria-label="Content performance chart">
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
    <div className="os-bar-chart" aria-label="Audience engagement chart">
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
      <span className="module-preview-pill">Workflow Preview</span>
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
  const workflow = ["Market Trends", "AI Ideation", "Content Creation", "Automated Outreach", "Performance"];

  return (
    <div className="hero-os-card" aria-label="AI Content Engine dashboard mockup">
      <div className="hero-os-rail">
        {["A", "01", "02", "03", "04"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="hero-os-main">
        <div className="hero-os-topbar">
          <div>
            <p>AI Content Engine & Workflows</p>
            <nav>
              <span>Analytics</span>
              <span>Workflow</span>
              <span>Research</span>
              <span>Settings</span>
            </nav>
          </div>
          <button type="button">AI Seeded</button>
        </div>

        <div className="hero-os-grid">
          <section>
            <header>
              <span>Content Performance</span>
              <strong>+ growth</strong>
            </header>
            <MiniLineChart compact />
          </section>
          <section>
            <header>
              <span>Audience Engagement</span>
              <strong>...</strong>
            </header>
            <MiniBarChart />
          </section>
        </div>

        <section className="hero-os-workflow">
          <header>Node Based</header>
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
  const cards = ["Topic Research", "Script Generation", "Evamet Research", "Video Creation", "Auto-Posting"];

  return (
    <div className={compact ? "content-os-frame compact" : "content-os-frame"}>
      <aside className="content-os-sidebar">
        <strong>Content OS</strong>
        {["Research", "Content", "Automation", "Analytics", "Settings"].map((item, index) => (
          <span key={item} className={index === 0 ? "active" : ""}>{item}</span>
        ))}
      </aside>
      <main className="content-os-main">
        <div className="content-os-titlebar">
          <div>
            <span>Main Stage</span>
            <h3>AI Content Engine - Automated Video Scripting & Posting</h3>
          </div>
          <button type="button">+ Editor Editor</button>
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
              <span>{index === 1 ? "(GPT-4)" : index === 3 ? "(AI)" : index === 4 ? "(Multi-Platform)" : ""}</span>
            </div>
          ))}
          <div className="content-platforms">
            {["Facebook", "Instagram", "YouTube", "Multi-Platform"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="content-os-recent">
          <h4>Recent Generations</h4>
          <div>
            {[1, 2, 3, 4].map((item) => (
              <article key={item}>
                <span className="play">▶</span>
                <strong>Product Launch<br />Video - v{item === 3 ? 1 : item}</strong>
                <small>{item === 1 ? "16 May 2023" : "13 May 2024"}</small>
              </article>
            ))}
          </div>
        </section>
      </main>
      <aside className="content-os-predictions">
        <h3>Engagement Predictions</h3>
        <section>
          <header><span>Projected Reach</span><strong>Real-time</strong></header>
          <MiniLineChart compact />
        </section>
        <section>
          <header><span>Engagement Rate</span><strong>Real-time</strong></header>
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
      <div className="ecosystem-core">THE ANH<br />OS</div>
      {ecosystemNodes.map((node) => (
        <Link key={node.label} href="/khoa-hoc" className={`ecosystem-node ${node.side.replace(" ", "-")}`}>
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
    "AI-DRIVEN INSIGHTS",
    "CRM INTEGRATION",
    "PREMIUM TEMPLATES",
    "COMMUNITY HUB",
    "WORKFLOW AUTOMATION",
    "DATA ANALYTICS",
  ];

  return (
    <div className="ecosystem-feature-grid">
      {items.map((item, index) => (
        <Link key={item} href="/khoa-hoc">
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
        const moduleLabel = moduleTitles[index % moduleTitles.length] ?? "AI Marketing Module";
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
