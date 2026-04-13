"use client";

import { Logo } from "./Logo";
import { ShimmerLine } from "./SkincareElements";

export function Footer() {
  return (
    <footer className="relative py-8 sm:py-12 mt-auto">
      <ShimmerLine />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
        <Logo size="md" />
        <p className="text-xs sm:text-sm text-muted font-[family-name:var(--font-body)]">
          Skincare that knows your skin. &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
