import { BrandMark } from "@/components/site/brand-mark";

const agentTasks = [
  { number: "01", icon: "video", title: "Edit video thương hiệu cá nhân", meta: "3 phút", side: "left", line: "agent-kit-line-left-1" },
  { number: "02", icon: "research", title: "Nghiên cứu lên kế hoạch", meta: "20 phút", side: "left", line: "agent-kit-line-left-2" },
  { number: "03", icon: "outline", title: "Lên outline khóa học", meta: "5 phút", side: "left", line: "agent-kit-line-left-3" },
  { number: "04", icon: "image", title: "Tự động tạo ảnh - đăng bài", meta: "", side: "right", line: "agent-kit-line-right-1" },
  { number: "05", icon: "ads", title: "Lên quảng cáo tự động ngay", meta: "", side: "right", line: "agent-kit-line-right-2" },
] as const;

const bottomModules = ["AI Research", "Planning", "Content", "Automation", "Ads"];

function AgentIcon({ type }: { type: (typeof agentTasks)[number]["icon"] }) {
  const iconClass = "h-14 w-14 text-[#4bbcff] drop-shadow-[0_0_16px_rgba(75,188,255,0.45)]";

  if (type === "video") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="8" y="9" width="40" height="46" rx="4" stroke="currentColor" strokeWidth="4" />
        <path d="M23 25v14l13-7-13-7Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M16 17h4M28 17h6M42 17h6M43 45l12 12M55 45 43 57" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "research") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="13" y="12" width="31" height="42" rx="5" stroke="currentColor" strokeWidth="4" />
        <path d="M22 24h14M22 34h12M22 44h8M21 12l3-5h10l3 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="43" cy="43" r="10" stroke="currentColor" strokeWidth="4" />
        <path d="m50 50 7 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "outline") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M15 8h25l10 10v38H15V8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M39 8v12h11M24 28h16M24 38h14M24 48h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <circle cx="46" cy="48" r="10" fill="#0f1b2a" stroke="currentColor" strokeWidth="4" />
        <path d="m41 48 4 4 8-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "image") {
    return (
      <svg className={iconClass} fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="10" y="12" width="38" height="38" rx="5" stroke="currentColor" strokeWidth="4" />
        <circle cx="22" cy="24" r="4" fill="currentColor" />
        <path d="m16 43 11-11 8 8 5-5 8 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="39" y="35" width="17" height="17" rx="3" fill="#0f1b2a" stroke="currentColor" strokeWidth="4" />
        <path d="M47.5 47V39M47.5 39l-4 4M47.5 39l4 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} fill="none" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="4" />
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="4" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <path d="M32 32 49 15M49 15h-9M49 15v9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentTaskCard({ task }: { task: (typeof agentTasks)[number] }) {
  return (
    <article className={`agent-kit-card agent-kit-card-${task.side}`}>
      <span className="agent-kit-index">{task.number}</span>
      <AgentIcon type={task.icon} />
      <div>
        <h3>{task.title}</h3>
        {task.meta ? (
          <p>
            chỉ trong <strong>{task.meta}</strong>
          </p>
        ) : null}
      </div>
      <span className={`agent-kit-wire ${task.line}`} aria-hidden="true" />
    </article>
  );
}

export function AgentKitWorkflow() {
  const leftTasks = agentTasks.filter((task) => task.side === "left");
  const rightTasks = agentTasks.filter((task) => task.side === "right");

  return (
    <section className="agent-kit-section">
      <div className="agent-kit-heading">
        <h2>
          Bộ Agent kit hỗ trợ <span>90%</span>
          <br />
          công việc chuyên gia đang làm
        </h2>
      </div>

      <div className="agent-kit-map">
        <div className="agent-kit-column agent-kit-column-left">
          {leftTasks.map((task) => (
            <AgentTaskCard key={task.number} task={task} />
          ))}
        </div>

        <div className="agent-kit-core" aria-label="Agent Kit trung tâm">
          <div className="agent-kit-core-orbit" />
          <div className="agent-kit-core-box">
            <BrandMark className="agent-kit-logo" />
            <strong>Agent Kit</strong>
          </div>
        </div>

        <div className="agent-kit-column agent-kit-column-right">
          {rightTasks.map((task) => (
            <AgentTaskCard key={task.number} task={task} />
          ))}
        </div>
      </div>

      <div className="agent-kit-modules" aria-label="Agent Kit modules">
        {bottomModules.map((module) => (
          <span key={module}>
            <i aria-hidden="true" />
            {module}
          </span>
        ))}
      </div>
    </section>
  );
}
