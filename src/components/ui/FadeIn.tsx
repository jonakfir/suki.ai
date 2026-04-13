"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "visible">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // First mark as ready (hides content for animation)
    setState("ready");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          observer.unobserve(el);
        }
      },
      { rootMargin: "50px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const transforms = {
    up: "translateY(24px)",
    down: "translateY(-24px)",
    left: "translateX(24px)",
    right: "translateX(-24px)",
    none: "none",
  };

  // Before JS loads: fully visible (no inline style)
  // After JS, before in view: hidden
  // After in view: animated in
  const style =
    state === "idle"
      ? {}
      : state === "ready"
        ? { opacity: 0, transform: transforms[direction] }
        : {
            opacity: 1,
            transform: "none",
            transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
          };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

export function StaggerChildren({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "visible">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    setState("ready");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          observer.unobserve(el);
        }
      },
      { rootMargin: "50px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stateClass =
    state === "idle" ? "" : state === "ready" ? "stagger-ready" : "stagger-visible";

  return (
    <div ref={ref} className={`${className} ${stateClass}`}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`stagger-item ${className}`}>
      {children}
    </div>
  );
}
