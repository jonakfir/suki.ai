"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "accent" | "rose" | "lavender" | "none";
}

export function Card({
  children,
  className = "",
  hover = false,
  glow = "none",
}: CardProps) {
  const glowColors = {
    accent: "hover:shadow-[0_8px_40px_rgba(91,155,213,0.2),0_0_80px_rgba(91,155,213,0.08)]",
    rose: "hover:shadow-[0_8px_40px_rgba(232,160,191,0.2),0_0_80px_rgba(232,160,191,0.08)]",
    lavender: "hover:shadow-[0_8px_40px_rgba(184,169,232,0.2),0_0_80px_rgba(184,169,232,0.08)]",
    none: "hover:shadow-[0_8px_30px_rgba(91,155,213,0.15)]",
  };

  return (
    <div
      className={`paper-grain bg-card/80 backdrop-blur-sm border border-card-border/60 rounded-2xl p-4 sm:p-6 shadow-[0_8px_28px_-18px_rgba(59,125,216,0.35)] ${
        hover
          ? `transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_-14px_rgba(59,125,216,0.45)] ${glowColors[glow]} cursor-pointer`
          : ""
      } ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Premium GlowCard with border gradient effect
export function GlowCard({
  children,
  className = "",
  color = "accent",
}: {
  children: ReactNode;
  className?: string;
  color?: "accent" | "rose" | "lavender" | "gold";
}) {
  const gradients = {
    accent: "from-accent/30 via-transparent to-accent-soft/20",
    rose: "from-rose/30 via-transparent to-rose-soft/20",
    lavender: "from-lavender/30 via-transparent to-lavender-soft/20",
    gold: "from-gold/30 via-transparent to-gold-soft/20",
  };

  const glows = {
    accent: "group-hover:shadow-[0_0_60px_rgba(91,155,213,0.15)]",
    rose: "group-hover:shadow-[0_0_60px_rgba(232,160,191,0.15)]",
    lavender: "group-hover:shadow-[0_0_60px_rgba(184,169,232,0.15)]",
    gold: "group-hover:shadow-[0_0_60px_rgba(212,167,106,0.15)]",
  };

  return (
    <motion.div
      className={`group relative rounded-2xl ${className}`}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Border glow layer */}
      <div
        className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${gradients[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      {/* Inner content */}
      <div
        className={`relative bg-card/90 backdrop-blur-sm border border-card-border/40 rounded-2xl p-4 sm:p-6 transition-shadow duration-500 ${glows[color]}`}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  );
}
