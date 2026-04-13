"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import { ShimmerLine } from "@/components/ui/SkincareElements";
import { Sun, Moon } from "lucide-react";

type Step = {
  name: string;
  kind: string;
  note: string;
  img: string;
};

const AM: Step[] = [
  {
    name: "Gentle cleanser",
    kind: "Step 1 — Cleanse",
    note: "Low-pH, fragrance-free. Preps without stripping.",
    img: "https://images.pexels.com/photos/3762881/pexels-photo-3762881.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    name: "Niacinamide 5%",
    kind: "Step 2 — Serum",
    note: "Balances oil, fades post-acne marks over 6–8 weeks.",
    img: "https://images.pexels.com/photos/32282462/pexels-photo-32282462/free-photo-of-precision-beauty-niacinamide-serum-product-shot.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    name: "Hydra-glow B5",
    kind: "Step 3 — Moisturize",
    note: "Panthenol + ceramides lock in the serum.",
    img: "https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    name: "Mineral SPF 50",
    kind: "Step 4 — Protect",
    note: "Non-comedogenic, no white cast. Non-negotiable.",
    img: "https://images.pexels.com/photos/31812004/pexels-photo-31812004/free-photo-of-lancome-advanced-genifique-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];

const PM: Step[] = [
  {
    name: "Oil cleanser",
    kind: "Step 1 — Melt",
    note: "Dissolves SPF and sebum before water wash.",
    img: "https://images.pexels.com/photos/16233812/pexels-photo-16233812/free-photo-of-vials-of-cosmetics.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    name: "Retinoid 0.3%",
    kind: "Step 2 — Treat",
    note: "Start 2× weekly, buffer with moisturizer if tingly.",
    img: "https://images.pexels.com/photos/32282462/pexels-photo-32282462/free-photo-of-precision-beauty-niacinamide-serum-product-shot.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    name: "Ceramide cream",
    kind: "Step 3 — Seal",
    note: "Repairs the barrier overnight.",
    img: "https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="snap-center shrink-0 w-[16rem] sm:w-[18rem] rounded-3xl overflow-hidden bg-card/85 backdrop-blur-sm border border-card-border/50 shadow-[0_20px_50px_-30px_rgba(30,91,184,0.5)]"
    >
      <div className="relative aspect-[4/5]">
        <Image
          src={step.img}
          alt={step.name}
          fill
          sizes="(min-width: 640px) 18rem, 16rem"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 glass rounded-full px-3 py-1 text-[10px] uppercase tracking-wider">
          {step.kind}
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-medium italic text-lg mb-1">{step.name}</h4>
        <p className="text-sm text-muted leading-relaxed">{step.note}</p>
      </div>
    </motion.div>
  );
}

function Row({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: Step[] }) {
  return (
    <div className="mb-12 last:mb-0">
      <div className="sticky top-16 z-20 flex items-center gap-3 mb-4 px-1 py-2 bg-background/70 backdrop-blur-md rounded-full w-fit">
        <span className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center">
          {icon}
        </span>
        <span className="font-[family-name:var(--font-script)] text-accent-ink text-2xl">
          {title}
        </span>
      </div>
      <div className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 scroll-smooth">
        {steps.map((s, i) => (
          <StepCard key={s.name} step={s} index={i} />
        ))}
      </div>
    </div>
  );
}

export function RoutineTimeline() {
  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/30 backdrop-blur-[2px]">
      <div className="relative z-10 max-w-6xl mx-auto">
        <FadeIn className="text-center mb-3">
          <span className="font-[family-name:var(--font-script)] text-lavender text-lg">
            Her routine
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-4">
          <h2 className="text-3xl sm:text-5xl font-medium italic">
            A full day, <span className="gradient-text">sequenced.</span>
          </h2>
        </FadeIn>
        <FadeIn className="text-center mb-10">
          <p className="text-muted max-w-xl mx-auto">
            Every product in order, with the reasoning behind each step.
          </p>
        </FadeIn>
        <ShimmerLine className="max-w-xs mx-auto mb-10" />

        <Row title="Morning" icon={<Sun size={16} />} steps={AM} />
        <Row title="Night" icon={<Moon size={16} />} steps={PM} />
      </div>
    </section>
  );
}
