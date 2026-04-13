"use client";

import { ReactNode, useRef, MouseEvent } from "react";
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
    accent: "hover:shadow-[0_8px_40px_rgba(91,155,213,0.22),0_0_80px_rgba(91,155,213,0.1)]",
    rose: "hover:shadow-[0_8px_40px_rgba(232,160,191,0.22),0_0_80px_rgba(232,160,191,0.1)]",
    lavender: "hover:shadow-[0_8px_40px_rgba(184,169,232,0.22),0_0_80px_rgba(184,169,232,0.1)]",
    none: "hover:shadow-[0_8px_30px_rgba(91,155,213,0.18)]",
  };

  const ref = useRef<HTMLDivElement | null>(null);
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "50%" }}
      className={`group paper-grain relative bg-card/80 backdrop-blur-sm border border-card-border/60 rounded-2xl p-4 sm:p-6 shadow-[0_8px_28px_-18px_rgba(59,125,216,0.35)] overflow-hidden ${
        hover
          ? `transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_-14px_rgba(59,125,216,0.45)] ${glowColors[glow]} cursor-pointer`
          : ""
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(260px circle at var(--mx) var(--my), rgba(90,154,232,0.18), transparent 60%)",
        }}
      />
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

  const spotlightColors = {
    accent: "rgba(90,154,232,0.35)",
    rose: "rgba(232,160,191,0.3)",
    lavender: "rgba(168,152,224,0.3)",
    gold: "rgba(212,167,106,0.3)",
  };

  const cardRef = useRef<HTMLDivElement | null>(null);
  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      className={`group relative rounded-2xl ${className}`}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "50%" }}
    >
      {/* Border glow layer */}
      <div
        className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${gradients[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      {/* Cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(300px circle at var(--mx) var(--my), ${spotlightColors[color]}, transparent 60%)`,
        }}
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
