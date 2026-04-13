"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";

interface Bubble {
  id: number;
  size: number;
  left: number;
  delay: number;
  duration: number;
  opacity: number;
}

// Bubble positions are random but only need to be generated once for the
// app's lifetime. Computing them lazily at module scope keeps the
// randomness out of render (purity-safe) and makes the set stable across
// re-renders.
let cachedBubbles: Bubble[] | null = null;
function getBubbles(): Bubble[] {
  if (cachedBubbles) return cachedBubbles;
  cachedBubbles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 6 + Math.random() * 20,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 12 + Math.random() * 18,
    opacity: 0.08 + Math.random() * 0.15,
  }));
  return cachedBubbles;
}

// External-store signal: true only after hydration. Using this to gate
// rendering avoids both hydration mismatches (server sees no bubbles) and
// the set-state-in-effect anti-pattern.
const subscribeClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Floating skincare bubbles that rise up the page
export function FloatingBubbles() {
  const isClient = useSyncExternalStore(
    subscribeClient,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!isClient) return null;
  const bubbles = getBubbles();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            bottom: "-5%",
            background: `radial-gradient(circle at 30% 30%, rgba(168, 212, 255, ${b.opacity * 2}), rgba(91, 155, 213, ${b.opacity}))`,
            boxShadow: `0 0 ${b.size}px rgba(91, 155, 213, ${b.opacity * 0.5})`,
            animation: `bubble-rise ${b.duration}s ${b.delay}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

// Floating dot decorations
export function FloatingPetals() {
  const dots = [
    { x: 8, y: 15, size: 6, delay: 0, duration: 6, opacity: 0.12 },
    { x: 85, y: 25, size: 5, delay: 1.5, duration: 7, opacity: 0.10 },
    { x: 92, y: 55, size: 4, delay: 3, duration: 5.5, opacity: 0.08 },
    { x: 5, y: 70, size: 5, delay: 2, duration: 8, opacity: 0.10 },
    { x: 78, y: 80, size: 3, delay: 4, duration: 6.5, opacity: 0.07 },
    { x: 15, y: 45, size: 4, delay: 0.5, duration: 7.5, opacity: 0.09 },
    { x: 65, y: 10, size: 3, delay: 2.5, duration: 5, opacity: 0.06 },
    { x: 50, y: 90, size: 6, delay: 1, duration: 9, opacity: 0.11 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-accent/30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -15, 5, -20, 0],
            x: [0, 8, -5, 10, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Skincare ingredient labels floating in a section
export function SkincareIcons() {
  const icons = [
    { label: "Hydration", x: 10, y: 20 },
    { label: "Botanicals", x: 88, y: 15 },
    { label: "Glow", x: 75, y: 75 },
    { label: "SPF", x: 12, y: 80 },
    { label: "Gentle", x: 90, y: 50 },
    { label: "Premium", x: 5, y: 50 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center gap-1"
          style={{ left: `${icon.x}%`, top: `${icon.y}%` }}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.6 }}
        >
          <motion.span
            className="w-3 h-3 rounded-full bg-accent/20"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span className="text-[9px] uppercase tracking-[0.15em] text-muted/50 font-[family-name:var(--font-body)]">
            {icon.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// Ambient glow orbs for section backgrounds
export function AmbientOrbs({ variant = "blue" }: { variant?: "blue" | "rose" | "lavender" | "mixed" }) {
  const configs = {
    blue: [
      { color: "rgba(91, 155, 213, 0.12)", size: 400, x: -10, y: -15, duration: 20 },
      { color: "rgba(168, 212, 255, 0.08)", size: 300, x: 80, y: 60, duration: 25 },
    ],
    rose: [
      { color: "rgba(232, 160, 191, 0.10)", size: 350, x: 70, y: -10, duration: 22 },
      { color: "rgba(240, 200, 220, 0.06)", size: 280, x: -5, y: 70, duration: 28 },
    ],
    lavender: [
      { color: "rgba(184, 169, 232, 0.10)", size: 380, x: 60, y: 10, duration: 24 },
      { color: "rgba(212, 200, 240, 0.07)", size: 260, x: 10, y: 80, duration: 20 },
    ],
    mixed: [
      { color: "rgba(91, 155, 213, 0.10)", size: 400, x: -10, y: -10, duration: 22 },
      { color: "rgba(232, 160, 191, 0.08)", size: 300, x: 85, y: 30, duration: 26 },
      { color: "rgba(184, 169, 232, 0.06)", size: 250, x: 40, y: 80, duration: 20 },
    ],
  };

  const orbs = configs[variant];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            filter: "blur(40px)",
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Shimmer line decoration
export function ShimmerLine({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-px w-full overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-soft/60 to-transparent"
        style={{ width: "30%" }}
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
      />
    </div>
  );
}
