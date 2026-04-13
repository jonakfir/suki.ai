"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import { ShimmerLine } from "@/components/ui/SkincareElements";

const BEFORE = "https://images.pexels.com/photos/9038626/pexels-photo-9038626.jpeg?auto=compress&cs=tinysrgb&w=1200";
const AFTER = "https://images.pexels.com/photos/3373716/pexels-photo-3373716.jpeg?auto=compress&cs=tinysrgb&w=1200";

export function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      updateFromClientX(x);
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateFromClientX]);

  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden bg-background/30 backdrop-blur-[2px]">
      <div className="relative z-10 max-w-5xl mx-auto">
        <FadeIn className="text-center mb-3">
          <span className="font-[family-name:var(--font-script)] text-accent text-lg">
            Real results
          </span>
        </FadeIn>
        <FadeIn className="text-center mb-4">
          <h2 className="text-3xl sm:text-5xl font-medium italic">
            See the <span className="gradient-text">shift.</span>
          </h2>
        </FadeIn>
        <FadeIn className="text-center mb-10 sm:mb-14">
          <p className="text-muted max-w-xl mx-auto">
            Drag the slider — 8 weeks of a routine built for her skin.
          </p>
        </FadeIn>
        <ShimmerLine className="max-w-xs mx-auto mb-12" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          ref={wrapRef}
          onMouseDown={(e) => {
            dragging.current = true;
            updateFromClientX(e.clientX);
          }}
          onTouchStart={(e) => {
            dragging.current = true;
            updateFromClientX(e.touches[0].clientX);
          }}
          className="relative mx-auto w-full max-w-3xl aspect-[4/5] sm:aspect-[4/3] rounded-3xl overflow-hidden border border-white/40 shadow-[0_30px_80px_-30px_rgba(30,91,184,0.45)] cursor-ew-resize select-none"
        >
          {/* After (base) */}
          <Image
            src={AFTER}
            alt="After skincare routine"
            fill
            sizes="(min-width: 1024px) 768px, 90vw"
            className="object-cover"
          />
          <div className="absolute top-4 right-4 glass rounded-full px-3 py-1 text-xs uppercase tracking-wider">
            After
          </div>

          {/* Before (clipped) */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <Image
              src={BEFORE}
              alt="Before skincare routine"
              fill
              sizes="(min-width: 1024px) 768px, 90vw"
              className="object-cover"
              style={{ filter: "saturate(0.85) brightness(0.92) contrast(0.95)" }}
            />
            <div className="absolute top-4 left-4 glass rounded-full px-3 py-1 text-xs uppercase tracking-wider">
              Before
            </div>
          </div>

          {/* Divider */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.8)]"
            style={{ left: `${pos}%`, transform: "translateX(-1px)" }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white/95 border border-accent/30 shadow-[0_8px_24px_rgba(30,91,184,0.35)] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-ink">
                <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
