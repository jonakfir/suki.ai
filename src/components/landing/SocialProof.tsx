"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import { AmbientOrbs, ShimmerLine } from "@/components/ui/SkincareElements";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Finally, recommendations that actually work for my sensitive skin. No more guessing.",
    name: "Aria M.",
    skin: "Sensitive, dry",
    avatar: "AM",
  },
  {
    quote: "I went from a 12-step routine to 5 products that do more. suki. is magic.",
    name: "Priya K.",
    skin: "Combination",
    avatar: "PK",
  },
  {
    quote: "It remembered my niacinamide sensitivity and never recommended it again. Love that.",
    name: "Sofia L.",
    skin: "Oily, acne-prone",
    avatar: "SL",
  },
];

const stats = [
  { value: 10, suffix: "K+", label: "Skin profiles" },
  { value: 50, suffix: "K+", label: "Products logged" },
  { value: 98, suffix: "%", label: "Recommendation accuracy" },
  { value: 4.9, suffix: "★", label: "Average rating" },
];

export function SocialProof() {
  return (
    <section className="relative py-16 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/50 backdrop-blur-[2px]">
      <AmbientOrbs variant="rose" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <FadeIn className="text-center mb-4">
          <span className="font-[family-name:var(--font-script)] text-gold text-lg">
            Loved by skin obsessives
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium italic px-2">
            Real skin, real{" "}
            <span className="font-[family-name:var(--font-script)] gradient-text-gold text-3xl sm:text-6xl">
              results.
            </span>
          </h2>
        </FadeIn>

        {/* Stats bar */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-16">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className="text-center p-4 sm:p-5 rounded-2xl glass"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-2xl sm:text-3xl font-[family-name:var(--font-script)] font-bold gradient-text">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-muted font-[family-name:var(--font-body)] mt-1">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </FadeIn>

        <ShimmerLine className="max-w-xs mx-auto mb-10 sm:mb-16" />

        {/* Testimonials */}
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <StaggerItem key={i}>
              <motion.div
                className="p-5 sm:p-6 rounded-2xl glass border border-card-border/40 transition-all duration-500"
                whileHover={{
                  y: -6,
                  boxShadow: "0 20px 60px rgba(232, 160, 191, 0.12)",
                }}
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className="text-gold fill-gold"
                    />
                  ))}
                </div>

                <p className="text-sm italic leading-relaxed mb-5 text-foreground/80">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted font-[family-name:var(--font-body)]">
                      {t.skin}
                    </p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
