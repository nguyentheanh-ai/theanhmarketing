import type { TestimonialItem } from "@/services/testimonialService";

export function ProofGrid({ items }: { items: TestimonialItem[] }) {
  return (
    <div className="tam-stagger mt-10 grid gap-4 md:grid-cols-3">
      {items.slice(0, 6).map((item, index) => (
        <figure className="tam-card tam-lift min-h-52 p-6" key={item.id ?? `${item.name}-${index}`}>
          <div className="flex gap-1 text-[#ffbf3f]" aria-label={item.rating ? `${item.rating} trên 5 sao` : "Phản hồi triển khai"}>
            {Array.from({ length: item.rating ?? 5 }, (_, star) => <span aria-hidden="true" key={star}>★</span>)}
          </div>
          <blockquote className="mt-5 text-sm font-semibold leading-7 text-[var(--tam-ink)]">“{item.quote}”</blockquote>
          <figcaption className="mt-5 border-t border-[var(--tam-line)] pt-4">
            <p className="text-sm font-black text-[var(--tam-ink)]">{item.name}</p>
            <p className="mt-1 text-xs font-bold text-[var(--tam-muted)]">{item.title}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
