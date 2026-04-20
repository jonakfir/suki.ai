"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/FadeIn";
import { Camera, Sparkles, Clock, BarChart2, Bell, Users, ArrowUpDown, Sun, RefreshCw } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "Scan your products",
    description:
      "Take a photo of your shelf. Suki identifies everything and sorts it into skincare, hair, and makeup.",
    accent: "blue" as const,
  },
  {
    icon: Sparkles,
    title: "Your personalized routine",
    description:
      "Get a step-by-step AM and PM routine built around your skin type, concerns, and lifestyle.",
    accent: "indigo" as const,
  },
  {
    icon: Clock,
    title: "Know exactly when and how",
    description:
      "How often? Morning or night? Suki tells you exactly how to use each product.",
    accent: "blue" as const,
  },
  {
    icon: BarChart2,
    title: "Compare products",
    description:
      "See how a new product compares to what you already own — ingredient by ingredient.",
    accent: "indigo" as const,
  },
  {
    icon: Bell,
    title: "Daily reminders",
    description:
      "Set reminders for your routine so you never skip a step.",
    accent: "blue" as const,
  },
  {
    icon: Users,
    title: "Friend recommendations",
    description:
      "Coming soon: discover products your friends love.",
    accent: "indigo" as const,
    soon: true,
  },
];

const science = [
  {
    icon: ArrowUpDown,
    title: "Why layering order matters",
    body: "Skincare absorbs best when applied thinnest to thickest — water-based serums before oils, actives before moisturizers. Apply in the wrong order and you're blocking absorption before it starts.",
  },
  {
    icon: Sun,
    title: "Why AM and PM routines differ",
    body: "Your skin repairs itself at night, so that's when retinoids and heavier treatments work best. SPF only belongs in the morning — it degrades under light and has no role in your evening routine.",
  },
  {
    icon: RefreshCw,
    title: "Why consistency beats products",
    body: "Skin cell turnover takes roughly 28 days. Most actives need 6–8 weeks of daily use to show results. The most expensive serum in the world won't work if you use it twice.",
  },
];

const accentStyles = {
  blue: {
    icon: "bg-accent/10 text-accent",
    border: "border-accent/20 hover:border-accent/40",
    glow: "hover:shadow-[0_8px_32px_-8px_rgba(59,125,216,0.18)]",
  },
  indigo: {
    icon: "bg-accent-deep/10 text-accent-deep",
    border: "border-accent-deep/15 hover:border-accent-deep/35",
    glow: "hover:shadow-[0_8px_32px_-8px_rgba(30,91,184,0.15)]",
  },
};

export function Features() {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-8 bg-[#f0f5ff] overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-20">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium mb-4">
            Features
          </p>
          <h2 className="text-2xl sm:text-4xl md:text-[2.6rem] font-semibold text-accent-ink leading-tight mb-4">
            Everything Suki does for you.
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-md mx-auto leading-relaxed">
            From beginner to beauty enthusiast — tools that actually make sense of your collection.
          </p>
        </FadeIn>

        {/* Feature cards */}
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-20 sm:mb-28">
          {features.map((f, i) => {
            const s = accentStyles[f.accent];
            return (
              <StaggerItem key={i}>
                <div
                  className={`relative h-full bg-white border rounded-2xl p-5 sm:p-6 transition-all duration-300 ${s.border} ${s.glow}`}
                >
                  {f.soon && (
                    <span className="absolute top-4 right-4 text-[9px] uppercase tracking-widest font-semibold text-accent-deep bg-accent/8 border border-accent/15 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-xl ${s.icon} flex items-center justify-center mb-4`}>
                    <f.icon size={19} />
                  </div>
                  <h3 className="text-base font-semibold text-accent-ink mb-2">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.description}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {/* Science section */}
        <FadeIn className="text-center mb-10 sm:mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium mb-3">
            The science behind it
          </p>
          <h3 className="text-xl sm:text-3xl font-semibold text-accent-ink leading-tight mb-3">
            There&apos;s a reason order matters.
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            Skincare isn&apos;t just about what you use — it&apos;s about how, when, and in what sequence.
          </p>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {science.map((s, i) => (
            <StaggerItem key={i}>
              <div className="bg-white border border-accent/15 rounded-2xl p-5 sm:p-6 h-full">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <s.icon size={19} />
                </div>
                <h4 className="text-sm font-semibold text-accent-ink mb-2 leading-snug">
                  {s.title}
                </h4>
                <p className="text-sm text-muted leading-relaxed">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
