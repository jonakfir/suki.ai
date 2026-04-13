"use client";

import { ButtonHTMLAttributes, ReactNode, ElementType } from "react";

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "outline" | "filled" | "ghost" | "primary";
  size?: "sm" | "md" | "lg";
  as?: ElementType;
}

export function GhostButton({
  children,
  variant = "outline",
  size = "md",
  className = "",
  as: Component = "button",
  ...props
}: GhostButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-[family-name:var(--font-body)] font-medium transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:saturate-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-accent/50";

  const sizes = {
    sm: "text-sm px-4 py-1.5",
    md: "text-sm px-5 sm:px-6 py-2.5",
    lg: "text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3",
  };

  const variants = {
    outline:
      "border-2 border-accent/50 text-accent font-semibold hover:bg-accent/10 hover:border-accent hover:shadow-[0_0_30px_rgba(59,125,216,0.2)]",
    filled:
      "bg-gradient-to-r from-accent to-accent-glow text-white font-semibold shadow-[0_10px_30px_-12px_rgba(59,125,216,0.45)] hover:shadow-[0_12px_36px_-10px_rgba(59,125,216,0.55)] hover:scale-[1.03]",
    ghost: "text-muted hover:text-foreground hover:bg-card/50",
    primary:
      "bg-accent text-white font-semibold shadow-[0_10px_30px_-12px_rgba(59,125,216,0.45)] hover:bg-accent-deep hover:shadow-[0_12px_36px_-10px_rgba(59,125,216,0.55)] focus-visible:ring-accent-deep disabled:hover:bg-accent",
  };

  return (
    <Component
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
