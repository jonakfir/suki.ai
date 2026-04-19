"use client";

import { useEffect, useState } from "react";
import { NativeLanding } from "./NativeLanding";
import { GlobalReveal } from "./GlobalReveal";
import { ParticleField } from "./ParticleField";
import { Hero } from "./Hero";
import { StreamingChat } from "./StreamingChat";
import { RoutineTimeline } from "./RoutineTimeline";
import { BeforeAfter } from "./BeforeAfter";
import { Features } from "./Features";
import { SocialProof } from "./SocialProof";
import { CTA } from "./CTA";
import { FloatingBubbles } from "@/components/ui/SkincareElements";
import { FloatingProducts } from "@/components/ui/FloatingProducts";
import { ParallaxBlobs } from "./ParallaxBlobs";

// Shows the app-native landing when running in Capacitor, the marketing
// landing when visiting from a browser.
export function LandingGate() {
  const [mode, setMode] = useState<"web" | "native" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Preview override: ?native=1 forces the native layout in any browser,
    // ?native=0 forces the web layout. Useful for dev + screen recordings.
    const override = new URLSearchParams(window.location.search).get("native");
    let next: "native" | "web";
    if (override === "1") {
      next = "native";
    } else if (override === "0") {
      next = "web";
    } else {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      next = cap?.isNativePlatform?.() ? "native" : "web";
    }
    setMode(next);
  }, []);

  // Avoid a flash of the wrong variant before detection completes.
  if (mode === null) {
    return <div className="min-h-screen" />;
  }

  if (mode === "native") {
    return <NativeLanding />;
  }

  return (
    <div className="relative min-h-screen">
      <ParallaxBlobs />
      <FloatingProducts />
      <GlobalReveal />
      <ParticleField />
      <FloatingBubbles />

      <div className="relative z-10">
        <Hero />
        <StreamingChat />
        <SocialProof />
        <RoutineTimeline />
        <Features />
        <BeforeAfter />
        <CTA />
      </div>
    </div>
  );
}
