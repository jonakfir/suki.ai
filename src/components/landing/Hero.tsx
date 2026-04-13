"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { AmbientOrbs, FloatingPetals, ShimmerLine } from "@/components/ui/SkincareElements";
import { Sparkles } from "lucide-react";

const ROTATING_WORDS = ["glow", "clarity", "balance", "radiance", "confidence"];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % ROTATING_WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block align-baseline">
      <motion.span
        key={i}
        initial={{ y: "0.6em", opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: "-0.6em", opacity: 0, filter: "blur(8px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block gradient-text font-[family-name:var(--font-script)]"
      >
        {ROTATING_WORDS[i]}
      </motion.span>
    </span>
  );
}

function SplitLetters({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-block">
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          initial={{ y: "1em", opacity: 0, filter: "blur(10px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{
            duration: 0.8,
            delay: delay + i * 0.035,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block whitespace-pre"
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-background/30 backdrop-blur-[2px]">
      <AmbientOrbs variant="mixed" />
      <FloatingPetals />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,var(--color-accent-soft)_0%,transparent_60%)] opacity-25"
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-0 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Left: text */}
        <div className="text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 rounded-full glass mb-6 sm:mb-8"
          >
            <Sparkles size={14} className="text-accent" />
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted">
              AI-powered skincare
            </span>
          </motion.div>

          <h1 className="mb-3 font-[family-name:var(--font-script)] text-display sm:text-display-xl font-bold text-accent-ink leading-[1.05]">
            <SplitLetters text="Skincare that" delay={0.15} />
            <br />
            <SplitLetters text="unlocks your " delay={0.6} />
            <RotatingWord />
            <SplitLetters text="." delay={1.0} />
          </h1>

          <ShimmerLine className="max-w-md mx-auto md:mx-0 mb-6 sm:mb-8" />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="text-sm sm:text-lg text-muted max-w-xl mx-auto md:mx-0 mb-8 sm:mb-10 leading-relaxed"
          >
            Build your skin profile. Log what works and what doesn&apos;t. Get
            personalized recommendations tailored to{" "}
            <span className="font-[family-name:var(--font-script)] text-accent text-lg sm:text-xl font-semibold">
              your unique skin
            </span>{" "}
            — powered by AI that understands ingredients, not hype.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.3 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start items-stretch sm:items-center"
          >
            <Link href="/onboard" className="w-full sm:w-auto">
              <GhostButton as="span" variant="filled" size="lg" className="group w-full sm:w-auto whitespace-nowrap">
                <Sparkles size={16} className="transition-transform duration-500 group-hover:rotate-180" />
                Start your skin profile
              </GhostButton>
            </Link>
            <Link href="/auth" className="w-full sm:w-auto">
              <GhostButton as="span" variant="outline" size="lg" className="w-full sm:w-auto whitespace-nowrap">
                Sign in
              </GhostButton>
            </Link>
          </motion.div>
        </div>

        {/* Right: hero product image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md aspect-[4/5] md:aspect-[5/6]"
        >
          {/* Halo behind image */}
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[2rem] blur-3xl opacity-70"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(90,154,232,0.55), rgba(168,152,224,0.35) 40%, transparent 70%)",
            }}
          />
          {/* Card frame */}
          <div className="relative h-full w-full rounded-[2rem] overflow-hidden border border-white/40 shadow-[0_30px_80px_-30px_rgba(30,91,184,0.5)] backdrop-blur-sm">
            <Image
              src="https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Skincare serum bottle"
              fill
              priority
              sizes="(min-width: 768px) 28rem, 90vw"
              className="object-cover"
            />
            {/* Sheen sweep */}
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              initial={{ x: "-120%" }}
              animate={{ x: "120%" }}
              transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
              style={{
                background:
                  "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)",
                mixBlendMode: "overlay",
              }}
            />
          </div>

          {/* Floating stat chip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="absolute -left-4 md:-left-10 bottom-10 glass rounded-2xl px-4 py-3 shadow-lg"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Match score</div>
            <div className="text-2xl font-semibold text-accent-ink">96%</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.7 }}
            className="absolute -right-4 md:-right-8 top-8 glass rounded-2xl px-4 py-3 shadow-lg"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Ingredients scanned</div>
            <div className="text-2xl font-semibold text-accent-ink">28</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
