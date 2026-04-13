"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { AmbientOrbs, ShimmerLine } from "@/components/ui/SkincareElements";
import { motion } from "framer-motion";

const ingredients = [
  { name: "Hyaluronic Acid", benefit: "Deep hydration", abbr: "HA", color: "accent" },
  { name: "Niacinamide", benefit: "Pore refinement", abbr: "B3", color: "lavender" },
  { name: "Retinol", benefit: "Anti-aging", abbr: "Rt", color: "rose" },
  { name: "Vitamin C", benefit: "Brightening", abbr: "C", color: "gold" },
  { name: "Ceramides", benefit: "Barrier repair", abbr: "Ce", color: "accent" },
  { name: "Salicylic Acid", benefit: "Exfoliation", abbr: "SA", color: "lavender" },
  { name: "Peptides", benefit: "Firming", abbr: "Pp", color: "rose" },
  { name: "SPF", benefit: "UV protection", abbr: "UV", color: "gold" },
];

const colorStyles: Record<string, string> = {
  accent: "border-accent/20 bg-accent/5 hover:bg-accent/10 hover:shadow-[0_0_30px_rgba(91,155,213,0.15)]",
  rose: "border-rose/20 bg-rose/5 hover:bg-rose/10 hover:shadow-[0_0_30px_rgba(232,160,191,0.15)]",
  lavender: "border-lavender/20 bg-lavender/5 hover:bg-lavender/10 hover:shadow-[0_0_30px_rgba(184,169,232,0.15)]",
  gold: "border-gold/20 bg-gold/5 hover:bg-gold/10 hover:shadow-[0_0_30px_rgba(212,167,106,0.15)]",
};

export function Ingredients() {
  return (
    <section className="relative py-16 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/50 backdrop-blur-[2px]">
      <AmbientOrbs variant="lavender" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <FadeIn className="text-center mb-4">
          <span className="font-[family-name:var(--font-script)] text-lavender text-lg">
            Ingredient intelligence
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-6">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium italic mb-4 px-2">
            suki. speaks{" "}
            <span className="font-[family-name:var(--font-script)] gradient-text-gold text-3xl sm:text-6xl">
              fluent skincare.
            </span>
          </h2>
        </FadeIn>
        <FadeIn className="text-center mb-10 sm:mb-16">
          <p className="text-sm sm:text-base text-muted max-w-lg mx-auto font-[family-name:var(--font-body)]">
            We don&apos;t just match products — we understand what&apos;s inside them
            and how each ingredient interacts with your skin.
          </p>
        </FadeIn>

        <ShimmerLine className="max-w-xs mx-auto mb-10 sm:mb-16" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {ingredients.map((ing, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <motion.div
                className={`relative p-4 sm:p-5 rounded-2xl border backdrop-blur-sm transition-all duration-500 cursor-pointer ${colorStyles[ing.color]}`}
                whileHover={{ y: -4, scale: 1.03 }}
                transition={{ duration: 0.3 }}
              >
                <motion.span
                  className="text-lg font-[family-name:var(--font-script)] font-bold block mb-3 opacity-40"
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 3,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {ing.abbr}
                </motion.span>
                <h4 className="text-sm font-medium mb-0.5">{ing.name}</h4>
                <p className="text-xs text-muted font-[family-name:var(--font-body)]">
                  {ing.benefit}
                </p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
