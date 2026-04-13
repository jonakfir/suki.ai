"use client";

import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}

// External-store hook: returns true once we're running on the client (post-hydration).
// Using useSyncExternalStore keeps React from flagging a state transition
// as a "set state in effect" anti-pattern — the transition is treated as
// synchronization with an external signal (the browser environment).
const subscribeClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
function useIsClient(): boolean {
  return useSyncExternalStore(subscribeClient, getClientSnapshot, getServerSnapshot);
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: "50px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const transforms = {
    up: "translateY(24px)",
    down: "translateY(-24px)",
    left: "translateX(24px)",
    right: "translateX(-24px)",
    none: "none",
  };

  // Server (and no-JS): no inline style — fully visible.
  // Client, pre-intersection: hidden, offset.
  // Client, post-intersection: animate in.
  const style = !isClient
    ? {}
    : visible
      ? {
          opacity: 1,
          transform: "none",
          transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
        }
      : { opacity: 0, transform: transforms[direction] };

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
  const isClient = useIsClient();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: "50px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const stateClass = !isClient ? "" : visible ? "stagger-visible" : "stagger-ready";

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
