import { LeadForm } from "@/components/forms/lead-form";
import { PageShell } from "@/components/site/page-shell";
import { getResources } from "@/services/resourceService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Triển khai AI Growth System cho team",
  description:
    "Trang dành cho SME, team marketing, cộng đồng hoặc đối tác muốn training, workshop hoặc triển khai AI Growth System cùng The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const leaders = ["SME", "Team Marketing", "Cộng đồng", "Creator"];

export default async function PartnerPage() {
  const resources = await getResources();

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <div className="partner-dashboard">
          <header>
            <strong>THE ANH MARKETING</strong>
            <span>AI Growth Partner Dashboard</span>
          </header>

          <div className="partner-grid">
            <aside className="partner-stats">
              <section>
                <p>Đề xuất hợp tác</p>
                <div>theanh.marketing/doi-tac</div>
              </section>
              {[
                ["Diagnosis", "Growth audit"],
                ["Training", "Team access"],
                ["Implementation", "Workflow theo nhu cầu"],
              ].map(([label, value]) => (
                <section key={label}>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </section>
              ))}
            </aside>

            <main className="partner-main">
              <section className="partner-network">
                <h1>Training và triển khai AI Growth System cho team</h1>
                <div className="network-map">
                  {Array.from({ length: 34 }).map((_, index) => (
                    <i key={index} style={{ left: `${12 + (index * 19) % 76}%`, top: `${18 + (index * 29) % 62}%` }} />
                  ))}
                  <strong>AI GROWTH<br />PARTNER HUB</strong>
                </div>
              </section>

              <section className="partner-leaderboard">
                <h2>Nhóm phù hợp</h2>
                {leaders.map((leader, index) => (
                  <p key={leader}>
                    <span>{index + 1}. {leader}</span>
                    <strong>{["Chẩn đoán hệ thống", "Đào tạo nội bộ", "Workshop cộng đồng", "Nội dung đồng thương hiệu"][index]}</strong>
                  </p>
                ))}
              </section>

              <section className="partner-assets">
                <h2>Toolkit có thể dùng khi hợp tác</h2>
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
          <p className="ai-kicker">Đăng ký triển khai</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Muốn audit, training hoặc triển khai Growth System cho team?
          </h2>
          <p className="ai-muted mt-4 max-w-3xl leading-8">
            Form này đi vào lead service/admin CRM hiện có, nên team có thể xem nhu cầu, phân loại pipeline và chăm sóc mà không cần thêm database mới.
          </p>
          <LeadForm source="Trang đối tác" submitLabel="Gửi nhu cầu triển khai" />
        </div>
      </section>
    </PageShell>
  );
}
