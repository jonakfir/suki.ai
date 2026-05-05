"use client";

import type { UserProduct } from "@/lib/store";
import { Modal } from "@/components/ui/Modal";

export function ProductDetail({
  product,
  open,
  onClose,
}: {
  product: UserProduct | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={product?.product_name ?? "Product"}>
      {!product ? null : (
        <div className="space-y-3 text-sm">
          <div className="text-muted">{product.brand}</div>
          <div className="text-xs">
            <span className="uppercase tracking-wider text-muted">Category:</span>{" "}
            {product.category}
          </div>
          <div className="text-xs">
            <span className="uppercase tracking-wider text-muted">Rating:</span>{" "}
            {product.rating}
          </div>
          {product.notes && (
            <div className="text-sm">
              <div className="uppercase tracking-wider text-muted text-xs mb-1">Notes</div>
              <p>{product.notes}</p>
            </div>
          )}
          {product.ingredients && product.ingredients.length > 0 && (
            <div>
              <div className="uppercase tracking-wider text-muted text-xs mb-1">Ingredients</div>
              <p className="text-xs">{product.ingredients.join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
