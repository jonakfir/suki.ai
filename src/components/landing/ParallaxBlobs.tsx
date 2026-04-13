"use client";

import { useEffect, useRef } from "react";

export function ParallaxBlobs() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--px", cx.toFixed(3));
      el.style.setProperty("--py", cy.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ ["--px" as string]: "0", ["--py" as string]: "0" }}
    >
      <div
        className="absolute -top-32 -left-20 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(90,154,232,0.55), transparent 65%)",
          transform: "translate3d(calc(var(--px) * 40px), calc(var(--py) * 40px), 0)",
          transition: "transform 0.1s linear",
        }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[38rem] h-[38rem] rounded-full blur-3xl opacity-50"
        style={{
          background: "radial-gradient(circle, rgba(139,190,245,0.6), transparent 65%)",
          transform: "translate3d(calc(var(--px) * -60px), calc(var(--py) * -30px), 0)",
          transition: "transform 0.1s linear",
        }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(168,152,224,0.5), transparent 65%)",
          transform: "translate3d(calc(var(--px) * 30px), calc(var(--py) * -50px), 0)",
          transition: "transform 0.1s linear",
        }}
      />
    </div>
  );
}
