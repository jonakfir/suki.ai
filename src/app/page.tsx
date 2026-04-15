import { GlobalReveal } from "@/components/landing/GlobalReveal";
import { ParticleField } from "@/components/landing/ParticleField";
import { Hero } from "@/components/landing/Hero";
import { StreamingChat } from "@/components/landing/StreamingChat";
import { RoutineTimeline } from "@/components/landing/RoutineTimeline";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { Features } from "@/components/landing/Features";
import { SocialProof } from "@/components/landing/SocialProof";
import { CTA } from "@/components/landing/CTA";
import { FloatingBubbles } from "@/components/ui/SkincareElements";
import { FloatingProducts } from "@/components/ui/FloatingProducts";
import { ParallaxBlobs } from "@/components/landing/ParallaxBlobs";

export default function LandingPage() {
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
