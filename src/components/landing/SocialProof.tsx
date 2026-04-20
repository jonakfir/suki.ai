"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "I had 12 products and no idea what to do with them. Suki sorted everything in 30 seconds.",
    name: "Maya",
    age: 24,
  },
  {
    quote: "Finally understood why my routine wasn't working. The order was completely wrong.",
    name: "Sofia",
    age: 31,
  },
  {
    quote: "I'm a total beginner and it felt like having a dermatologist in my pocket.",
    name: "Jess",
    age: 19,
  },
];

export function SocialProof() {
  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-8 bg-[#f8f8f6] overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto">
        <FadeIn className="text-center mb-14 sm:mb-16">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium mb-4">
            Real people, real results
          </p>
          <h2 className="text-2xl sm:text-4xl md:text-[2.6rem] font-semibold text-accent-ink leading-tight">
            Real skin, real results.
          </h2>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <StaggerItem key={i}>
              <div className="h-full bg-[#f0f5ff] border border-accent/15 rounded-2xl p-6 sm:p-7 flex flex-col">
                <Quote size={20} className="text-accent/40 mb-4 shrink-0" />
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-xs font-semibold text-accent shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-accent-ink">{t.name}</p>
                    <p className="text-xs text-muted">{t.age} years old</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
