"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Sparkles, Check, ChevronRight } from "lucide-react";

const AM_STEPS = [
  { done: true,  name: "Gentle Cleanser",    brand: "CeraVe" },
  { done: true,  name: "Niacinamide Serum",  brand: "The Ordinary" },
  { done: false, name: "SPF 50 Sunscreen",   brand: "La Roche-Posay" },
];

function RoutineMockup() {
  return (
    <div className="relative w-full max-w-[320px] mx-auto select-none">
      {/* App card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(59,125,216,0.22)] border border-blue-100 overflow-hidden"
      >
        {/* Card header */}
        <div className="bg-gradient-to-r from-accent to-accent-deep px-5 py-4">
          <p className="text-white/70 text-[10px] font-medium uppercase tracking-widest mb-0.5">
            Today&apos;s Routine
          </p>
          <p className="text-white text-base font-semibold">Good morning ✨</p>
        </div>

        {/* AM steps */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">☀️</span>
            <p className="text-xs font-semibold text-accent-ink uppercase tracking-widest">
              Morning
            </p>
            <span className="ml-auto text-[10px] text-muted bg-accent/8 px-2 py-0.5 rounded-full">
              2 / 3 done
            </span>
          </div>

          <div className="space-y-0">
            {AM_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className={`flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 ${
                  step.done ? "opacity-50" : ""
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    step.done
                      ? "bg-accent border-accent"
                      : "border-slate-200"
                  }`}
                >
                  {step.done && <Check size={9} className="text-white" strokeWidth={3} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{step.name}</p>
                  <p className="text-[10px] text-muted">{step.brand}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* PM row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-2.5 px-5 py-3 bg-accent/[0.04] border-t border-accent/10"
        >
          <span className="text-sm">🌙</span>
          <p className="text-xs font-medium text-accent-deep">Evening · 4 steps</p>
          <ChevronRight size={13} className="ml-auto text-muted" />
        </motion.div>
      </motion.div>

      {/* Floating chip — skin type */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute -left-6 top-14 bg-white rounded-2xl px-3 py-2 shadow-[0_8px_24px_-6px_rgba(59,125,216,0.2)] border border-blue-100"
      >
        <p className="text-[9px] text-muted uppercase tracking-widest">Skin type</p>
        <p className="text-xs font-semibold text-accent-ink">Combination</p>
      </motion.div>

      {/* Floating chip — products */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="absolute -right-6 bottom-14 bg-white rounded-2xl px-3 py-2 shadow-[0_8px_24px_-6px_rgba(59,125,216,0.2)] border border-blue-100"
      >
        <p className="text-[9px] text-muted uppercase tracking-widest">Products saved</p>
        <p className="text-xs font-semibold text-accent-ink">14 total</p>
      </motion.div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-white">
      {/* Subtle blue radial wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(59,125,216,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 py-16 sm:py-0 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Left: text */}
        <div className="text-center md:text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/8 border border-accent/15 mb-6"
          >
            <Sparkles size={13} className="text-accent" />
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-accent font-medium">
              AI beauty advisor
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-[family-name:var(--font-script)] text-display sm:text-display-xl font-bold text-accent-ink leading-[1.05] mb-2"
          >
            Meet Suki.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg sm:text-xl font-medium text-accent-deep mb-8"
          >
            Your personal AI beauty advisor.
          </motion.p>

          {/* Two-user value props */}
          <div className="space-y-3 mb-10 text-left max-w-md mx-auto md:mx-0">
            {[
              {
                label: "Just starting out?",
                desc: "Build a routine made for your skin, hair, and makeup.",
              },
              {
                label: "Already have everything?",
                desc: "Finally understand what to use, when, and in what order.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                className="flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={10} className="text-accent" strokeWidth={3} />
                </div>
                <p className="text-sm sm:text-base text-foreground/80 leading-snug">
                  <span className="font-semibold text-accent-deep">{item.label}</span>{" "}
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
          >
            <Link href="/onboard">
              <GhostButton
                as="span"
                variant="filled"
                size="lg"
                className="group w-full sm:w-auto whitespace-nowrap"
              >
                <Sparkles
                  size={16}
                  className="transition-transform duration-500 group-hover:rotate-180"
                />
                Build my routine
              </GhostButton>
            </Link>
            <Link href="/auth">
              <GhostButton
                as="span"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto whitespace-nowrap"
              >
                Sign in
              </GhostButton>
            </Link>
          </motion.div>
        </div>

        {/* Right: routine mockup */}
        <FadeIn delay={0.3} className="flex items-center justify-center px-8 md:px-4">
          <RoutineMockup />
        </FadeIn>
      </div>
    </section>
  );
}
