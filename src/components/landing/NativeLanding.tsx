"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";

// Six bottles floating around the center logo/CTA stack.
// Positions are tuned for a ~430px-wide iPhone viewport.
const BOTTLES = [
  {
    src: "https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=360",
    style: { top: "6%",  left: "-14%" }, size: 150, dur: 14, delay: 0,   rotate: [-10, 6]  as [number, number], drift: [-8, 12]  as [number, number],
  },
  {
    src: "https://images.pexels.com/photos/31812004/pexels-photo-31812004/free-photo-of-lancome-advanced-genifique-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=360",
    style: { top: "4%",  right: "-18%" }, size: 170, dur: 18, delay: 1.2, rotate: [8, -10]  as [number, number], drift: [10, -8]  as [number, number],
  },
  {
    src: "https://images.pexels.com/photos/32282462/pexels-photo-32282462/free-photo-of-precision-beauty-niacinamide-serum-product-shot.jpeg?auto=compress&cs=tinysrgb&w=360",
    style: { top: "38%", left: "-22%" }, size: 140, dur: 22, delay: 2,    rotate: [-6, 10]  as [number, number], drift: [8, -10]  as [number, number],
  },
  {
    src: "https://images.pexels.com/photos/16233812/pexels-photo-16233812/free-photo-of-vials-of-cosmetics.jpeg?auto=compress&cs=tinysrgb&w=360",
    style: { top: "34%", right: "-22%" }, size: 160, dur: 20, delay: 2.6, rotate: [10, -8]  as [number, number], drift: [-12, 10] as [number, number],
  },
  {
    src: "https://images.pexels.com/photos/3762881/pexels-photo-3762881.jpeg?auto=compress&cs=tinysrgb&w=360",
    style: { bottom: "22%", left: "-18%" }, size: 150, dur: 19, delay: 0.8, rotate: [-8, 10]  as [number, number], drift: [10, -10] as [number, number],
  },
  {
    src: "https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=360",
    style: { bottom: "26%", right: "-16%" }, size: 140, dur: 24, delay: 1.8, rotate: [6, -10]  as [number, number], drift: [-10, 14] as [number, number],
  },
];

export function NativeLanding() {
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #E7F0FB 0%, #CFDFF3 55%, #B8CFEA 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Soft aurora blobs drifting behind everything */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 w-[130vw] h-[60vh] rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle, rgba(123,178,240,0.55), transparent 60%)" }}
        animate={{ x: [0, 24, 0], y: [0, 12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 w-[130vw] h-[60vh] rounded-full blur-3xl opacity-55"
        style={{ background: "radial-gradient(circle, rgba(212,114,154,0.45), transparent 65%)" }}
        animate={{ x: [0, -20, 0], y: [0, -12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating bottles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {BOTTLES.map((b, i) => (
          <motion.div
            key={i}
            className="absolute rounded-3xl overflow-hidden shadow-[0_18px_50px_-18px_rgba(30,91,184,0.45)]"
            style={{
              ...b.style,
              width: b.size,
              height: b.size * 1.2,
            }}
            initial={{ opacity: 0, scale: 0.85, rotate: b.rotate[0] }}
            animate={{
              opacity: 0.6,
              scale: 1,
              y: [0, b.drift[1], 0],
              x: [0, b.drift[0], 0],
              rotate: [b.rotate[0], b.rotate[1], b.rotate[0]],
            }}
            transition={{
              opacity: { duration: 1.2, delay: b.delay },
              scale: { duration: 1.2, delay: b.delay },
              y: { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay },
              x: { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay },
              rotate: { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay },
            }}
          >
            <Image src={b.src} alt="" fill sizes={`${b.size}px`} className="object-cover" />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, transparent 55%, rgba(220,232,247,0.9) 95%)",
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Center stack: logo + tagline, vertically centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <Logo size="lg" className="text-[3.5rem] sm:text-[4.5rem]" />
        </motion.div>

        <motion.p
          className="mt-4 text-sm tracking-widest uppercase text-muted"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Skincare that knows your skin
        </motion.p>
      </div>

      {/* CTAs pinned to the bottom */}
      <motion.div
        className="relative z-10 px-6 pb-10 flex flex-col gap-3"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <Link
          href="/onboard"
          className="w-full py-4 rounded-full bg-gradient-to-r from-accent to-accent-glow text-white font-semibold text-[17px] text-center shadow-[0_12px_40px_-10px_rgba(59,125,216,0.6)] active:scale-[0.98] transition-transform"
        >
          Create account
        </Link>
        <Link
          href="/auth"
          className="w-full py-3.5 rounded-full border border-accent/40 text-accent-deep font-medium text-[15px] text-center bg-card/40 backdrop-blur active:scale-[0.98] transition-transform"
        >
          Sign in
        </Link>
      </motion.div>
    </div>
  );
}
