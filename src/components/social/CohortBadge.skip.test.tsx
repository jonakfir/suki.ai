/**
 * Skipped scaffold for the CohortBadge component.
 *
 * Source not readable on this machine — see /tmp/agentD-handoff.md.
 *
 * Expected props (from Agent B's handoff: "loading-skeleton-aware pill"):
 *   - cohort: CohortInfo | null | undefined
 *     - undefined → loading skeleton
 *     - null      → renders nothing
 *     - strict cohort (is_fallback=false) → "<pct>% positive · <n> reviews"
 *       plus a tag string from outcomeToTag(top_outcome).
 *     - fallback cohort (is_fallback=true) → "based on all suki users"
 */
import { describe, it } from "vitest";

describe.skip("<CohortBadge /> (TODO — needs component source)", () => {
  it("cohort=undefined → renders a skeleton", () => undefined);
  it("cohort=null → renders nothing (returns null)", () => undefined);
  it("strict cohort → '84% positive · 23 reviews' and tag visible", () => undefined);
  it("fallback cohort → 'based on all suki users'", () => undefined);
});
