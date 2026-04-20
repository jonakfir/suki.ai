"use client";

import { useEffect, useState } from "react";
import { NativeLanding } from "./NativeLanding";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { StreamingChat } from "./StreamingChat";
import { RoutineTimeline } from "./RoutineTimeline";
import { SocialProof } from "./SocialProof";
import { CTA } from "./CTA";

// Shows the app-native landing when running in Capacitor, the marketing
// landing when visiting from a browser.
export function LandingGate() {
  const [mode, setMode] = useState<"web" | "native" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(id);
  }, []);

  if (mode === null) {
    return <div className="min-h-screen bg-white" />;
  }

  if (mode === "native") {
    return <NativeLanding />;
  }

  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <StreamingChat />
      <RoutineTimeline />
      <SocialProof />
      <CTA />
    </div>
  );
}
