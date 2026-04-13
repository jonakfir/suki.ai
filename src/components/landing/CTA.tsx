"use client";

import Link from "next/link";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { AmbientOrbs, FloatingPetals, ShimmerLine } from "@/components/ui/SkincareElements";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden bg-background/50 backdrop-blur-[2px]">
      <AmbientOrbs variant="mixed" />
      <FloatingPetals />

      <FadeIn className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Decorative dots */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-accent/25"
              animate={{ y: [0, -10 - i * 2, 0] }}
              transition={{
                duration: 3,
                delay: i * 0.15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-6xl font-medium italic mb-3 px-2">
          Your skin is{" "}
          <span className="font-[family-name:var(--font-script)] gradient-text text-4xl sm:text-6xl md:text-7xl">
            unique.
          </span>
        </h2>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-medium italic mb-6 sm:mb-8 px-2">
          Your routine should be too.
        </h2>

        <ShimmerLine className="max-w-sm mx-auto mb-6 sm:mb-8" />

        <p className="text-sm sm:text-lg text-muted mb-8 sm:mb-10 font-[family-name:var(--font-body)] max-w-xl mx-auto leading-relaxed px-2">
          Start building your personalized skincare profile today. It&apos;s
          free, it&apos;s private, and it takes less than{" "}
          <span className="font-[family-name:var(--font-script)] text-accent text-lg sm:text-xl">
            two minutes.
          </span>
        </p>

        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.3 }}
          className="px-4 sm:px-0"
        >
          <Link href="/onboard">
            <GhostButton as="span" variant="filled" size="lg" className="group text-sm sm:text-base px-6 sm:px-10 py-3 sm:py-4 w-full sm:w-auto">
              <Sparkles size={18} />
              Start your skin profile
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </GhostButton>
          </Link>
        </motion.div>
      </FadeIn>
    </section>
  );
}
