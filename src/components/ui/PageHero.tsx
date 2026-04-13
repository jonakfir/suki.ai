"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ShimmerLine } from "@/components/ui/SkincareElements";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  titleAccent?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  actions,
  children,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-background/30 backdrop-blur-[2px] border-b border-card-border/40">
      {/* Halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(ellipse, rgba(90,154,232,0.45), rgba(168,152,224,0.25) 45%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-[family-name:var(--font-script)] text-accent text-sm sm:text-base mb-1"
          >
            {eyebrow}
          </motion.div>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="font-[family-name:var(--font-script)] text-3xl sm:text-4xl font-bold text-accent-ink leading-[1.05] mb-2"
        >
          {title}
          {titleAccent && (
            <>
              {" "}
              <span className="gradient-text">{titleAccent}</span>
            </>
          )}
        </motion.h1>
        <ShimmerLine className="max-w-xs mb-3" />
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted text-sm sm:text-base max-w-2xl"
          >
            {subtitle}
          </motion.p>
        )}
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-5 flex flex-wrap gap-3"
          >
            {actions}
          </motion.div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
