"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import { AmbientOrbs, ShimmerLine } from "@/components/ui/SkincareElements";
import { motion } from "framer-motion";
import { ClipboardList, Droplets, Sparkles } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: ClipboardList,
    title: "Build your profile",
    description:
      "Tell suki. about your skin type, concerns, allergies, and preferences. It takes two minutes.",
    color: "accent" as const,
  },
  {
    num: "02",
    icon: Droplets,
    title: "Log your products",
    description:
      "Track what you love, what broke you out, and what sits on your shelf untouched.",
    color: "rose" as const,
  },
  {
    num: "03",
    icon: Sparkles,
    title: "Get smart recommendations",
    description:
      "suki. analyzes your profile and history to suggest products that actually work with your skin.",
    color: "lavender" as const,
  },
];

const colorMap = {
  accent: {
    bg: "bg-accent/10",
    text: "text-accent",
    glow: "shadow-[0_0_30px_rgba(91,155,213,0.15)]",
    border: "border-accent/20",
    line: "from-accent/30",
  },
  rose: {
    bg: "bg-rose/10",
    text: "text-rose",
    glow: "shadow-[0_0_30px_rgba(232,160,191,0.15)]",
    border: "border-rose/20",
    line: "from-rose/30",
  },
  lavender: {
    bg: "bg-lavender/10",
    text: "text-lavender",
    glow: "shadow-[0_0_30px_rgba(184,169,232,0.15)]",
    border: "border-lavender/20",
    line: "from-lavender/30",
  },
};

export function HowItWorks() {
  return (
    <section className="relative py-16 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/50 backdrop-blur-[2px]">
      {/* Top fade for smooth transition from hero */}
      <div
        className="absolute top-0 left-0 right-0 h-32 z-[1] pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(240,244,250,0.5), transparent)",
        }}
      />
      <AmbientOrbs variant="blue" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <FadeIn className="text-center mb-4">
          <span className="font-[family-name:var(--font-script)] text-accent text-lg">
            How it works
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-6">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium italic mb-4 px-2">
            Your routine, thoughtfully built.
          </h2>
        </FadeIn>
        <FadeIn className="text-center mb-10 sm:mb-16">
          <p className="text-sm sm:text-base text-muted max-w-lg mx-auto font-[family-name:var(--font-body)]">
            Three simple steps to skincare that actually makes sense for you.
          </p>
        </FadeIn>

        <ShimmerLine className="max-w-xs mx-auto mb-10 sm:mb-16" />

        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          {steps.map((step, i) => {
            const colors = colorMap[step.color];
            return (
              <StaggerItem key={i}>
                <motion.div
                  className={`relative text-center p-6 sm:p-8 rounded-2xl glass border ${colors.border} transition-all duration-500 hover:${colors.glow}`}
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Step number */}
                  <span className="absolute top-4 right-4 font-[family-name:var(--font-script)] text-3xl text-muted/20 font-bold">
                    {step.num}
                  </span>

                  <div
                    className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mx-auto mb-5`}
                  >
                    <step.icon size={24} className={colors.text} />
                  </div>

                  <h3 className="text-xl font-medium italic mb-2">{step.title}</h3>
                  <p className="text-sm text-muted font-[family-name:var(--font-body)] leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
