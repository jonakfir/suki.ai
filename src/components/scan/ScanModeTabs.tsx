"use client";

import { motion } from "framer-motion";
import { Camera, ScanLine } from "lucide-react";

export type ScanMode = "photo" | "barcode";

interface ScanModeTabsProps {
  mode: ScanMode;
  onChange: (mode: ScanMode) => void;
  className?: string;
}

const TABS: Array<{
  value: ScanMode;
  label: string;
  Icon: typeof Camera;
}> = [
  { value: "photo", label: "Photo", Icon: Camera },
  { value: "barcode", label: "Barcode", Icon: ScanLine },
];

/**
 * 2-tab segmented control with a `layoutId` pill that slides between
 * options. Selected mode is owned by the parent — no URL or storage.
 */
export function ScanModeTabs({ mode, onChange, className = "" }: ScanModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Scan mode"
      className={`relative inline-flex p-1 rounded-full bg-background/40 border border-card-border/60 ${className}`}
    >
      {TABS.map(({ value, label, Icon }) => {
        const selected = value === mode;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(value)}
            className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selected ? "text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="scan-mode-pill"
                className="absolute inset-0 rounded-full bg-accent shadow-[0_8px_24px_-10px_rgba(59,125,216,0.6)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Icon size={13} />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
