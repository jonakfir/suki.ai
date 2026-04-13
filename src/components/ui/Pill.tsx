import { ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Pill({
  children,
  active = false,
  onClick,
  className = "",
}: PillProps) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all duration-200";
  const style = active
    ? "bg-accent/15 text-accent border border-accent/30"
    : "bg-card text-muted border border-card-border hover:border-accent/30 hover:text-accent";

  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} ${style} cursor-pointer ${className}`}>
        {children}
      </button>
    );
  }

  return (
    <span className={`${base} ${style} ${className}`}>{children}</span>
  );
}
