"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import { ShimmerLine } from "@/components/ui/SkincareElements";
import { Sparkles } from "lucide-react";

const PROMPT =
  "I have combination skin with occasional breakouts on my chin and dullness around my cheeks. Budget is mid-range. What should my evening routine look like?";

const RESPONSE = `Reading your profile — combination skin, chin breakouts, mid-range budget.

Here's what I'd build for your PM:

• Oil cleanser → water cleanser (double cleanse 3× / week)
• 2% salicylic acid on chin only (Mon / Wed / Fri)
• Niacinamide 5% across the cheeks for dullness
• 0.3% retinoid, low and slow — 2 nights / week to start
• Ceramide cream to seal everything in

Why this order: treat the active area without flaring the rest. The retinoid works long-term on cell turnover; niacinamide handles the immediate glow. Barrier-safe, no overlap with your known sensitivities.`;

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export function StreamingChat() {
  const { ref, visible } = useReveal();
  const [typed, setTyped] = useState("");
  const [thinking, setThinking] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const thinkTimer = setTimeout(() => setThinking(false), 900);
    return () => clearTimeout(thinkTimer);
  }, [visible]);

  useEffect(() => {
    if (thinking || !visible) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(RESPONSE.slice(0, i));
      if (i >= RESPONSE.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [thinking, visible]);

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/30 backdrop-blur-[2px]">
      <div className="relative z-10 max-w-4xl mx-auto">
        <FadeIn className="text-center mb-3">
          <span className="font-[family-name:var(--font-script)] text-accent text-lg">
            Watch it think
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-4">
          <h2 className="text-3xl sm:text-5xl font-medium italic">
            AI that <span className="gradient-text">actually listens.</span>
          </h2>
        </FadeIn>
        <FadeIn className="text-center mb-10 sm:mb-12">
          <p className="text-muted max-w-xl mx-auto">
            A real prompt. A real reasoning chain. Every recommendation explains itself.
          </p>
        </FadeIn>
        <ShimmerLine className="max-w-xs mx-auto mb-10" />

        <div className="relative rounded-3xl border border-card-border/50 bg-card/85 backdrop-blur-sm shadow-[0_30px_80px_-40px_rgba(30,91,184,0.45)] p-5 sm:p-8 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-3xl opacity-60"
            style={{
              background:
                "conic-gradient(from 120deg at 50% 50%, rgba(90,154,232,0.25), rgba(168,152,224,0.25), rgba(232,160,191,0.2), rgba(90,154,232,0.25))",
              filter: "blur(40px)",
              zIndex: -1,
            }}
          />

          {/* User message */}
          <div className="flex justify-end mb-5">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent/12 border border-accent/25 px-4 py-3 text-sm">
              {PROMPT}
            </div>
          </div>

          {/* AI response */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-lavender flex items-center justify-center shadow-[0_0_20px_rgba(90,154,232,0.6)] shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {thinking ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-muted"
                >
                  <span>Reading your profile</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </span>
                </motion.div>
              ) : (
                <pre className="whitespace-pre-wrap font-[family-name:var(--font-body)] text-sm leading-relaxed text-foreground">
                  {typed}
                  {typed.length < RESPONSE.length && (
                    <motion.span
                      className="inline-block w-[2px] h-4 bg-accent align-middle ml-0.5"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
