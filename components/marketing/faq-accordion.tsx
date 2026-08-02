"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function FaqAccordion({ faqs }: { faqs: Array<{ answer: string; question: string }> }) {
  const [openIndex, setOpenIndex] = useState(0);
  const id = useId();

  return (
    <div className="tam-card mx-auto mt-10 max-w-3xl divide-y divide-[var(--tam-line)] overflow-hidden">
      {faqs.map((faq, index) => {
        const open = openIndex === index;
        const panelId = `${id}-panel-${index}`;
        return (
          <div key={faq.question}>
            <button
              aria-controls={panelId}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left text-sm font-black text-[var(--tam-ink)] sm:px-7 sm:text-base"
              onClick={() => setOpenIndex(open ? -1 : index)}
              type="button"
            >
              {faq.question}
              <ChevronDown className={`shrink-0 text-[var(--tam-accent)] transition ${open ? "rotate-180" : ""}`} size={18} aria-hidden="true" />
            </button>
            <div className={open ? "grid grid-rows-[1fr]" : "grid grid-rows-[0fr]"} id={panelId}>
              <div className="overflow-hidden">
                <p className="px-5 pb-6 text-sm leading-7 text-[var(--tam-muted)] sm:px-7">{faq.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
