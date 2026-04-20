"use client";

import Link from "next/link";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-8 overflow-hidden bg-[#f0f5ff]">
      {/* Soft blue gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(59,125,216,0.09) 0%, rgba(59,125,216,0.04) 50%, transparent 80%)",
        }}
      />
      {/* Top border line */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(59,125,216,0.3), transparent)",
        }}
      />

      <FadeIn className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Decorative icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-8 mx-auto"
        >
          <Sparkles size={24} className="text-accent" />
        </motion.div>

        <h2 className="text-2xl sm:text-4xl md:text-[2.6rem] font-semibold text-accent-ink leading-tight mb-4 px-2">
          You deserve a routine that actually works.
        </h2>

        <p className="text-sm sm:text-lg text-muted mb-10 max-w-md mx-auto leading-relaxed px-2">
          Whether you&apos;re starting from zero or starting over — Suki builds it around you.
        </p>

        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.25 }}
          className="inline-block"
        >
          <Link href="/onboard">
            <GhostButton
              as="span"
              variant="filled"
              size="lg"
              className="group px-8 sm:px-12"
            >
              <Sparkles
                size={17}
                className="transition-transform duration-500 group-hover:rotate-180"
              />
              Get started for free
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </GhostButton>
          </Link>
        </motion.div>

        <p className="mt-5 text-xs text-muted/70">
          No credit card required · Free forever
        </p>
      </FadeIn>
    </section>
  );
}
