"use client";

import { ExternalLink } from "lucide-react";
import {
  wrapAffiliate,
  searchUrlFor,
  detectMerchant,
  merchantLabel,
} from "@/lib/affiliate";

interface BuyButtonProps {
  name: string;
  brand?: string;
  directUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function BuyButton({
  name,
  brand,
  directUrl,
  size = "sm",
  className = "",
}: BuyButtonProps) {
  const wrapped = wrapAffiliate(directUrl) ?? searchUrlFor(name, brand);
  const merchant = detectMerchant(wrapped);
  const label = directUrl ? `Buy at ${merchantLabel(merchant)}` : "Shop";

  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <a
      href={wrapped}
      target="_blank"
      rel="nofollow sponsored noopener"
      aria-label={`${label} ${name}`}
      className={`inline-flex items-center gap-1 rounded-full bg-accent text-white font-medium hover:bg-accent-deep transition-colors ${pad} ${className}`}
    >
      <span>{label}</span>
      <ExternalLink size={size === "sm" ? 12 : 14} />
    </a>
  );
}
