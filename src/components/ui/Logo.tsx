export function Logo({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };

  return (
    <span className={`inline-flex items-baseline ${sizes[size]} ${className}`}>
      <span className="font-[family-name:var(--font-script)] text-foreground font-semibold tracking-tight">
        suki
      </span>
      <span className="font-[family-name:var(--font-script)] text-accent font-semibold">
        .ai
      </span>
    </span>
  );
}
