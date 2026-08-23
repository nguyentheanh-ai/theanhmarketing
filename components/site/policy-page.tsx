import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export type PolicySection = { title: string; paragraphs: string[] };

export function PolicyPage({ title, description, sections }: { title: string; description: string; sections: PolicySection[] }) {
  return (
    <PageShell>
      <main className="tam-container max-w-4xl pb-20 pt-28 sm:pt-36">
        <Link href="/academy/bo-kit-agent-doanh-nghiep" className="text-sm font-black text-[var(--tam-accent-strong)]">← Quay lại Đội ngũ nhân sự AI</Link>
        <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-[var(--tam-accent-strong)]">The Anh Marketing</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] text-[var(--tam-ink)] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-base font-medium leading-8 text-[var(--tam-muted)]">{description}</p>
        <div className="mt-12 grid gap-8">
          {sections.map((section) => <section key={section.title} className="rounded-3xl border border-[var(--tam-line)] bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--tam-ink)]">{section.title}</h2><div className="mt-4 grid gap-4 text-sm font-medium leading-8 text-[var(--tam-muted)]">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}
        </div>
      </main>
    </PageShell>
  );
}
