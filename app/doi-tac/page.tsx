import { LeadForm } from "@/components/forms/lead-form";
import { PageShell } from "@/components/site/page-shell";
import { getResources } from "@/services/resourceService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đối tác đào tạo",
  description:
    "Trang dành cho doanh nghiệp, cộng đồng hoặc đối tác muốn tổ chức workshop, khóa học hoặc workflow training cùng The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const leaders = ["Doanh nghiệp", "Cộng đồng", "Creator", "Team Marketing"];

export default async function PartnerPage() {
  const resources = await getResources();

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <div className="partner-dashboard">
          <header>
            <strong>THE ANH MARKETING</strong>
            <span>Partner & Training Dashboard</span>
          </header>

          <div className="partner-grid">
            <aside className="partner-stats">
              <section>
                <p>Đề xuất hợp tác</p>
                <div>theanh.marketing/doi-tac</div>
              </section>
              {[
                ["Workshop", "Live training"],
                ["Khóa học", "Team access"],
                ["Workflow", "Theo nhu cầu"],
              ].map(([label, value]) => (
                <section key={label}>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </section>
              ))}
            </aside>

            <main className="partner-main">
              <section className="partner-network">
                <h1>Hợp tác đào tạo Marketing & AI cho team</h1>
                <div className="network-map">
                  {Array.from({ length: 34 }).map((_, index) => (
                    <i key={index} style={{ left: `${12 + (index * 19) % 76}%`, top: `${18 + (index * 29) % 62}%` }} />
                  ))}
                  <strong>THE ANH<br />TRAINING HUB</strong>
                </div>
              </section>

              <section className="partner-leaderboard">
                <h2>Nhóm phù hợp</h2>
                {leaders.map((leader, index) => (
                  <p key={leader}>
                    <span>{index + 1}. {leader}</span>
                    <strong>{["Đào tạo nội bộ", "Workshop cộng đồng", "Nội dung đồng thương hiệu", "Workflow vận hành"][index]}</strong>
                  </p>
                ))}
              </section>

              <section className="partner-assets">
                <h2>Tài liệu có thể dùng khi hợp tác</h2>
                <div>
                  {resources.slice(0, 4).map((resource) => (
                    <span key={resource.slug}>{resource.title}</span>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>

        <div className="mt-8 ai-panel-strong p-8 sm:p-10">
          <p className="ai-kicker">Đăng ký đối tác</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Muốn tổ chức workshop, khóa học hoặc workflow training theo nhu cầu?
          </h2>
          <p className="ai-muted mt-4 max-w-3xl leading-8">
            Form này đi vào lead service/admin CRM hiện có, nên team có thể xem và chăm sóc trong admin mà không cần thêm database mới.
          </p>
          <LeadForm source="Trang đối tác" submitLabel="Gửi đề xuất hợp tác" />
        </div>
      </section>
    </PageShell>
  );
}
