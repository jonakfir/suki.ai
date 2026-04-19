"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { ShimmerLine } from "./SkincareElements";

// App shell pages use the bottom tab nav on mobile — the marketing footer
// would just get in the way. Keep the footer for public / marketing routes.
const APP_PATHS = [
  "/today",
  "/skin",
  "/hair",
  "/makeup",
  "/me",
  "/compare",
  "/progress",
  "/products",
  "/recommendations",
  "/routine",
  "/profile",
];

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function Footer() {
  const pathname = usePathname();
  const [hideForNative, setHideForNative] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const override = new URLSearchParams(window.location.search).get("native");
    let next: boolean;
    if (override === "1") {
      next = true;
    } else if (override === "0") {
      next = false;
    } else {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      next = !!cap?.isNativePlatform?.();
    }
    setHideForNative(next);
  }, []);

  if (isAppPath(pathname)) return null;
  // Native app landing ships its own full-bleed layout — no marketing footer.
  if (hideForNative && pathname === "/") return null;

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
