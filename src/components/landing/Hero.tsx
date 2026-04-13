"use client";

import Link from "next/link";
import { GhostButton } from "@/components/ui/GhostButton";
import { AmbientOrbs, FloatingPetals, ShimmerLine } from "@/components/ui/SkincareElements";
import { Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-background/50 backdrop-blur-[2px]">
      <AmbientOrbs variant="mixed" />
      <FloatingPetals />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-16 sm:py-0">
        {/* Decorative sparkle badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 rounded-full glass mb-6 sm:mb-8 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted font-[family-name:var(--font-body)]">
            AI-powered skincare
          </span>
        </div>

        {/* Main heading */}
        <h1 className="mb-2 animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
          <span className="inline-flex flex-wrap justify-center gap-x-[0.3em] font-[family-name:var(--font-script)] text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] gradient-text">
            Skincare that
          </span>
        </h1>

        <h1 className="mb-6 animate-[fadeInUp_0.8s_ease-out_0.5s_both]">
          <span className="inline-flex flex-wrap justify-center gap-x-[0.3em] font-[family-name:var(--font-script)] text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[1.05]">
            knows your skin.
          </span>
        </h1>

        <ShimmerLine className="max-w-md mx-auto mb-6 sm:mb-8" />

        <p className="text-sm sm:text-lg text-muted max-w-xl mx-auto mb-8 sm:mb-10 px-2 font-[family-name:var(--font-body)] leading-relaxed animate-[fadeInUp_0.8s_ease-out_0.8s_both]">
          Build your skin profile. Log what works and what doesn&apos;t. Get
          personalized recommendations tailored to{" "}
          <span className="font-[family-name:var(--font-script)] text-accent text-lg sm:text-xl font-semibold">
            your unique skin
          </span>{" "}
          — powered by AI that understands ingredients, not hype.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 sm:px-0 animate-[fadeInUp_0.6s_ease-out_1s_both]">
          <Link href="/onboard" className="w-full sm:w-auto">
            <GhostButton as="span" variant="filled" size="lg" className="group w-full sm:w-auto">
              <Sparkles
                size={16}
                className="transition-transform duration-500 group-hover:rotate-180"
              />
              Start your skin profile
            </GhostButton>
          </Link>
          <Link href="/auth" className="w-full sm:w-auto">
            <GhostButton as="span" variant="outline" size="lg" className="w-full sm:w-auto">
              Sign in
            </GhostButton>
          </Link>
        </div>

        {/* Decorative dots */}
        <div className="mt-10 sm:mt-16 flex justify-center gap-3 animate-[fadeInUp_1s_ease-out_1.2s_both]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-accent/30"
              style={{
                animation: `float-gentle ${2.5 + i * 0.3}s ${i * 0.2}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
