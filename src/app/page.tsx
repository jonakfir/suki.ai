import { GlobalReveal } from "@/components/landing/GlobalReveal";
import { ParticleField } from "@/components/landing/ParticleField";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Ingredients } from "@/components/landing/Ingredients";
import { SocialProof } from "@/components/landing/SocialProof";
import { CTA } from "@/components/landing/CTA";
import { FloatingBubbles } from "@/components/ui/SkincareElements";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Layer 0: Scroll-driven frame sequence (fixed canvas) */}
      <GlobalReveal />

      {/* Layer 1: Three.js particle field (fixed canvas) */}
      <ParticleField />

      {/* Layer 2: Floating CSS bubbles */}
      <FloatingBubbles />

      {/* Layer 3: Page content (z-10) */}
      <div className="relative z-10">
        <Hero />
        <HowItWorks />
        <Features />
        <Ingredients />
        <SocialProof />
        <CTA />
      </div>
    </div>
  );
}
