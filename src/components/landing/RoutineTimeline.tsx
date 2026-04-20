"use client";

import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import { Sun, Moon, Droplets, Sparkles, Circle, ShieldCheck, Flame, Star, CloudMoon } from "lucide-react";

type Step = {
  name: string;
  kind: string;
  note: string;
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

const AM: Step[] = [
  {
    name: "Gentle cleanser",
    kind: "Step 1 — Cleanse",
    note: "Low-pH, fragrance-free. Preps without stripping.",
    Icon: Droplets,
    iconBg: "bg-blue-50",
    iconColor: "text-accent",
  },
  {
    name: "Niacinamide 5%",
    kind: "Step 2 — Serum",
    note: "Balances oil, fades post-acne marks over 6–8 weeks.",
    Icon: Sparkles,
    iconBg: "bg-indigo-50",
    iconColor: "text-accent-deep",
  },
  {
    name: "Hydra-glow B5",
    kind: "Step 3 — Moisturise",
    note: "Panthenol + ceramides lock in the serum.",
    Icon: Circle,
    iconBg: "bg-sky-50",
    iconColor: "text-accent-glow",
  },
  {
    name: "Mineral SPF 50",
    kind: "Step 4 — Protect",
    note: "Non-comedogenic, no white cast. Non-negotiable.",
    Icon: ShieldCheck,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
  },
];

const PM: Step[] = [
  {
    name: "Oil cleanser",
    kind: "Step 1 — Melt",
    note: "Dissolves SPF and sebum before water wash.",
    Icon: Flame,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-400",
  },
  {
    name: "Retinoid 0.3%",
    kind: "Step 2 — Treat",
    note: "Start 2× weekly, buffer with moisturizer if tingly.",
    Icon: Star,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-400",
  },
  {
    name: "Ceramide cream",
    kind: "Step 3 — Seal",
    note: "Repairs the barrier overnight.",
    Icon: CloudMoon,
    iconBg: "bg-indigo-50",
    iconColor: "text-accent-deep",
  },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="snap-center shrink-0 w-[15rem] sm:w-[17rem] rounded-2xl overflow-hidden bg-white border border-blue-100 shadow-[0_4px_24px_-8px_rgba(59,125,216,0.12)]"
    >
      {/* Icon area */}
      <div className={`flex items-center justify-center h-36 ${step.iconBg}`}>
        <step.Icon size={48} className={`${step.iconColor} opacity-80`} strokeWidth={1.25} />
      </div>

      {/* Text */}
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted font-medium mb-1">
          {step.kind}
        </p>
        <h4 className="font-semibold text-accent-ink text-base mb-1.5">{step.name}</h4>
        <p className="text-sm text-muted leading-relaxed">{step.note}</p>
      </div>
    </motion.div>
  );
}

function Row({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: Step[] }) {
  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
          {icon}
        </span>
        <span className="text-sm font-semibold text-accent-ink uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 sm:-mx-8 px-4 sm:px-8 scroll-smooth">
        {steps.map((s, i) => (
          <StepCard key={s.name} step={s} index={i} />
        ))}
      </div>
    </div>
  );
}

export function RoutineTimeline() {
  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-8 bg-[#f0f5ff] overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <FadeIn className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium mb-4">
            Your daily routine
          </p>
          <h2 className="text-2xl sm:text-4xl md:text-[2.6rem] font-semibold text-accent-ink leading-tight mb-4">
            A full day, sequenced.
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-md mx-auto leading-relaxed">
            Every product in order, with the reasoning behind each step.
          </p>
        </FadeIn>

        <Row title="Morning" icon={<Sun size={16} />} steps={AM} />
        <Row title="Night" icon={<Moon size={16} />} steps={PM} />
      </div>
    </section>
  );
}
