"use client";

import type { UserProduct } from "@/lib/store";

function ratingBadge(rating: string) {
  if (rating === "love") return <span className="text-xs">❤️ love</span>;
  if (rating === "bad_reaction") return <span className="text-xs">👎 bad</span>;
  return <span className="text-xs text-muted">neutral</span>;
}

export function ProductCard({
  product,
  onClick,
}: {
  product: UserProduct;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[var(--card-border)] bg-card hover:bg-card/70 transition-colors p-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{product.product_name}</div>
          <div className="text-xs text-muted truncate">{product.brand}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted mt-1">
            {product.domain ?? "skincare"}
          </div>
        </div>
        <div className="shrink-0">{ratingBadge(product.rating)}</div>
      </div>
    </button>
  );
}
