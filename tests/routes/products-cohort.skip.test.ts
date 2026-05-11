/**
 * Skipped scaffold for POST /api/products/cohort.
 *
 * Agent D could not read the route source due to a TCC lock on this
 * machine's Desktop folder (see /tmp/agentD-handoff.md). The shape below
 * mirrors Agent B's handoff:
 *
 *   - POST body: { products: Array<{ name, brand, domain? }> }
 *   - Internally calls supabase.rpc('get_product_cohort_stats', ...)
 *     once per product (or once with the full key array).
 *   - Returns: { cohorts: Record<productKey, CohortInfo | null> }
 *
 * Un-skip when running locally with the file readable. The skeleton is
 * left here so the test file count and `vitest` discovery are stable.
 */
import { describe, it } from "vitest";

describe.skip("POST /api/products/cohort (TODO — needs route source)", () => {
  it("happy path: 3 products → mixed cohorts (1 strict, 1 fallback, 1 null)", () => {
    // 1. Mock cookies + supabase auth → user-1.
    // 2. Mock supabase.rpc('get_product_cohort_stats', ...) to return three
    //    rows, one of each kind. Verify route normalises to the expected
    //    Record<productKey, CohortInfo | null> response shape.
  });

  it("empty `products` → 400", () => {
    // POST { products: [] } → 400 "missing products"
  });

  it("unauthenticated → 401", () => {
    // No cookie, getUser → null user → 401
  });

  it("respects ProductDomain default (skincare) when omitted in body", () => {
    // Body item without `domain` should be looked up as productKey(name,
    // brand, 'skincare') — same as `src/lib/cohort.ts#productKey` default.
  });

  it("forwards user age + skin_type/concerns from profile to rpc call", () => {
    // Verify the RPC args include the caller's profile bits — that's how
    // adjacent_age_ranges() narrows the strict cohort.
  });
});
