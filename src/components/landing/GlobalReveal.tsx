"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-driven frame sequence background.
 *
 * 192 pre-rendered JPEG frames in /public/hero-frames/frame_0001.jpg
 * through frame_0192.jpg. As the user scrolls from top to bottom of
 * the entire page, the frames advance like a video.
 *
 * Generate frames with an AI video tool (Veo / Runway / Kling):
 *   "Skincare products — serums, bottles, droplets, flower petals —
 *    arranged on a soft blue surface, slowly exploding outward into
 *    particles with soft pink and blue lighting, cinematic, luxury
 *    beauty aesthetic, 192 frames, 1920x1080"
 *
 * Then extract with: scripts/extract-frames.sh <video.mp4>
 *
 * If frames are missing, the component returns null (graceful fallback).
 */

const TOTAL_FRAMES = 168;
const FRAME_PATH = (i: number) =>
  `/hero-frames/frame_${String(i).padStart(4, "0")}.jpg`;

export function GlobalReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [missing, setMissing] = useState(false);

  function drawFrame(index: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Find the closest loaded frame (backward fallback to prevent flicker)
    let img: HTMLImageElement | null = null;
    for (let i = index; i >= 0; i--) {
      if (framesRef.current[i]) {
        img = framesRef.current[i];
        break;
      }
    }
    if (!img) return;

    const rect = canvas.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    ctx.clearRect(0, 0, cw, ch);

    // object-fit: cover scaling
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // Probe frame_0001 to check if frames exist (retry with exponential backoff)
  useEffect(() => {
    const delays = [300, 900, 2700];
    let attempt = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryProbe = () => {
      if (cancelled) return;
      const probe = new Image();
      probe.onload = () => {
        if (!cancelled) setEnabled(true);
      };
      probe.onerror = () => {
        if (cancelled) return;
        if (attempt < delays.length) {
          timer = setTimeout(tryProbe, delays[attempt]);
          attempt += 1;
        } else {
          setMissing(true);
        }
      };
      probe.src = FRAME_PATH(1) + `?probe=${attempt}`;
    };

    tryProbe();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Preload all frames in chunks: first 24 immediately (LCP), then the
  // remaining 144 in chunks of 24 scheduled via requestIdleCallback.
  useEffect(() => {
    if (!enabled) return;
    framesRef.current = new Array(TOTAL_FRAMES).fill(null);
    let cancelled = false;
    const CHUNK_SIZE = 24;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const idleHandles: number[] = [];

    const loadFrame = (i: number) => {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => {
        if (cancelled) return;
        framesRef.current[i - 1] = img;
        setLoadedCount((n) => n + 1);
        if (i === 1) drawFrame(0);
      };
      img.onerror = () => {
        if (cancelled) return;
        setLoadedCount((n) => n + 1);
      };
    };

    const loadChunk = (start: number) => {
      if (cancelled) return;
      const end = Math.min(start + CHUNK_SIZE - 1, TOTAL_FRAMES);
      for (let i = start; i <= end; i++) loadFrame(i);
    };

    // Chunk 1: immediate
    loadChunk(1);

    // Remaining chunks via requestIdleCallback (fallback setTimeout)
    type IdleWindow = typeof window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const w = window as IdleWindow;
    const schedule = (fn: () => void) => {
      if (typeof w.requestIdleCallback === "function") {
        idleHandles.push(w.requestIdleCallback(fn));
      } else {
        timers.push(setTimeout(fn, 100));
      }
    };

    for (let start = CHUNK_SIZE + 1; start <= TOTAL_FRAMES; start += CHUNK_SIZE) {
      const s = start;
      schedule(() => loadChunk(s));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (typeof w.cancelIdleCallback === "function") {
        idleHandles.forEach((h) => w.cancelIdleCallback!(h));
      }
    };
  }, [enabled]);

  // Resize canvas
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(currentFrameRef.current);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [enabled]);

  // Global scroll → frame index mapping
  useEffect(() => {
    if (!enabled) return;

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        const progress =
          scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
        const frameIndex = Math.min(
          TOTAL_FRAMES - 1,
          Math.floor(progress * (TOTAL_FRAMES - 1))
        );
        if (frameIndex !== currentFrameRef.current) {
          currentFrameRef.current = frameIndex;
          drawFrame(frameIndex);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  // Graceful fallback: if no frames exist after retries, render a static
  // branded background instead of a black canvas.
  if (missing) {
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-accent/15 via-lavender/10 to-rose/15"
        aria-hidden="true"
      />
    );
  }

  // Wait until ~15% of frames are loaded before showing
  const ready = loadedCount >= Math.max(8, Math.floor(TOTAL_FRAMES * 0.15));

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          opacity: ready ? 1 : 0,
          transition: "opacity 900ms ease-out",
        }}
      />
    </div>
  );
}
