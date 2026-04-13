"use client";

import { useEffect, useRef } from "react";

const DEFAULT_PARTICLE_COUNT = 80;

function getParticleCount(): number {
  if (typeof window === "undefined") return DEFAULT_PARTICLE_COUNT;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return 0;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (cores <= 4) return 50;
  return DEFAULT_PARTICLE_COUNT;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

const colors = [
  "91, 155, 213",   // accent blue
  "168, 212, 255",  // soft blue
  "232, 160, 191",  // rose
  "184, 169, 232",  // lavender
  "212, 167, 106",  // gold
];

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    const particleCount = getParticleCount();
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2 - 0.1,
      size: 1 + Math.random() * 3,
      opacity: 0.1 + Math.random() * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let animId: number;
    let lastT = performance.now();

    const draw = (t: number) => {
      animId = requestAnimationFrame(draw);
      // Clamp delta to avoid huge jumps after tab unfocus
      const rawDelta = t - lastT;
      const delta = Math.min(rawDelta, 33);
      lastT = t;
      const step = delta / 16.6667; // normalized to ~60fps units

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx * step;
        p.y += p.vy * step;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();
      }
    };
    if (particleCount > 0) animId = requestAnimationFrame(draw);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
