import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getTestimonials } from "@/services/testimonialService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Học viên & Cộng đồng",
  description:
    "Community hub, feedback, case study và câu chuyện học viên của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const communities = ["Creators", "SaaS Founders", "Marketers", "AI Builders"];

export default async function StudentsPage() {
  const testimonials = await getTestimonials();

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <div className="community-hub">
          <aside>
            <strong>The Anh Marketing</strong>
            <p>Sub-Communities</p>
            {communities.map((item, index) => (
              <span key={item} className={index === 1 ? "active" : ""}>{item}</span>
            ))}
            <ButtonLink href="/dang-ky" className="mt-auto">Join a Community</ButtonLink>
          </aside>

          <main>
            <header>
              <h1>Ecosystem Community Hub</h1>
              <div>Search Ecosystem...</div>
            </header>

            <div className="community-grid">
              <section className="community-pulse">
                <p className="ai-kicker">Pulse</p>
                <h2>Latest Member Wins & AI Shares</h2>
                <div className="mt-6 grid gap-5">
                  {testimonials.slice(0, 4).map((item, index) => (
                    <article key={`${item.name}-${index}`}>
                      <i>{item.name.slice(0, 1)}</i>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.quote}</p>
                        <span>{item.title}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="community-map">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="ai-kicker">Global Ecosystem Map</p>
                    <h2>Members Worldwide</h2>
                  </div>
                  <div className="flex gap-2">
                    {["Role", "Industry", "Location"].map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
                <div className="map-orbits">
                  {["San Francisco", "London", "Berlin", "Singapore", "Lagos", "Marrakesh"].map((city, index) => (
                    <i key={city} className={`city-${index}`}>{city}</i>
                  ))}
                </div>
              </section>

              <section className="community-events">
                <h2>Upcoming Community Events</h2>
                {[
                  "Fireside Chat: Scaling AI Products",
                  "Networking Mixer: Creators & Founders",
                ].map((event) => (
                  <div key={event}>
                    <span>{event}</span>
                    <ButtonLink href="/workshop" variant="secondary">RSVP</ButtonLink>
                  </div>
                ))}
              </section>
            </div>
          </main>
        </div>
      </section>
    </PageShell>
  );
}
