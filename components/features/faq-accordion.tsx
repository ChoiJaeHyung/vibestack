"use client";

import { useState, type ReactNode } from "react";

interface FaqAccordionProps {
  items: { question: string; answer: ReactNode }[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={`bg-bg-surface border rounded-[14px] px-6 py-5 cursor-pointer transition-all duration-300 ${
              isOpen ? "border-violet-500/30" : "border-border-default"
            }`}
            onClick={() => setOpenIndex(isOpen ? null : i)}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-text-primary pr-4">
                {item.question}
              </span>
              <span
                className={`text-xl text-text-faint transition-transform duration-300 flex-shrink-0 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </div>
            <div
              className={`overflow-hidden transition-[max-height] duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
                isOpen ? "max-h-[600px]" : "max-h-0"
              }`}
            >
              <div className="mt-3.5 text-sm leading-relaxed text-text-muted space-y-3">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
