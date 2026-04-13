"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import { GlowCard } from "@/components/ui/Card";
import { AmbientOrbs, ShimmerLine } from "@/components/ui/SkincareElements";
import {
  Brain,
  Shield,
  TrendingUp,
  Wallet,
  Clock,
  Heart,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI that gets ingredients",
    description:
      "Not just product names — suki. understands what's inside and how it interacts with your skin.",
    color: "accent" as const,
  },
  {
    icon: Shield,
    title: "Allergy-aware",
    description:
      "Flag your sensitivities once. Every recommendation respects them, always.",
    color: "rose" as const,
  },
  {
    icon: TrendingUp,
    title: "Learns from your history",
    description:
      "The more you log, the smarter suki. gets. Bad reactions become guardrails.",
    color: "lavender" as const,
  },
  {
    icon: Wallet,
    title: "Budget-friendly options",
    description:
      "From drugstore to luxury — get recommendations that match what you want to spend.",
    color: "gold" as const,
  },
  {
    icon: Clock,
    title: "Routine complexity control",
    description:
      "Want a 3-step routine? Or a full 10-step ritual? suki. adapts to your lifestyle.",
    color: "accent" as const,
  },
  {
    icon: Heart,
    title: "Your skin diary",
    description:
      "Track everything that touches your face. Build a history your future skin will thank you for.",
    color: "rose" as const,
  },
];

const iconColorMap = {
  accent: "bg-accent/15 text-accent",
  rose: "bg-rose/15 text-rose",
  lavender: "bg-lavender/15 text-lavender",
  gold: "bg-gold/15 text-gold",
};

export function Features() {
  return (
    <section className="relative py-16 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/30 backdrop-blur-[2px]">
      <AmbientOrbs variant="rose" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <FadeIn className="text-center mb-4">
          <span className="font-[family-name:var(--font-script)] text-rose text-lg">
            Features
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-6">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-medium italic mb-4 px-2">
            Everything your skin{" "}
            <span className="gradient-text">deserves.</span>
          </h2>
        </FadeIn>
        <FadeIn className="text-center mb-10 sm:mb-16">
          <p className="text-sm sm:text-base text-muted max-w-lg mx-auto font-[family-name:var(--font-body)]">
            Thoughtful tools designed around how skincare actually works.
          </p>
        </FadeIn>

        <ShimmerLine className="max-w-xs mx-auto mb-10 sm:mb-16" />

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, i) => (
            <StaggerItem key={i}>
              <GlowCard color={feature.color} className="h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${iconColorMap[feature.color]} flex items-center justify-center flex-shrink-0`}
                  >
                    <feature.icon size={20} />
                  </div>
                </div>
                <h3 className="text-lg font-medium italic mb-2">{feature.title}</h3>
                <p className="text-sm text-muted font-[family-name:var(--font-body)] leading-relaxed">
                  {feature.description}
                </p>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
