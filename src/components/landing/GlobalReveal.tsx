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

  // Probe frame_0001 to check if frames exist
  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setEnabled(true);
    probe.onerror = () => setMissing(true);
    probe.src = FRAME_PATH(1);
  }, []);

  // Preload all frames
  useEffect(() => {
    if (!enabled) return;
    framesRef.current = new Array(TOTAL_FRAMES).fill(null);
    let cancelled = false;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = () => {
        if (cancelled) return;
        framesRef.current[i - 1] = img;
        setLoadedCount((n) => n + 1);
        // Draw first frame immediately
        if (i === 1) drawFrame(0);
      };
      img.onerror = () => {
        if (cancelled) return;
        setLoadedCount((n) => n + 1);
      };
    }
    return () => {
      cancelled = true;
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

  // Graceful fallback: if no frames exist, render nothing
  if (missing) return null;

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
