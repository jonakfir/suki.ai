/**
 * Skipped: migration replay sanity for 010 + 011.
 *
 * Agent C's plan called for applying 010 + 011 against a fresh schema and
 * replaying them to confirm idempotency. The test is skipped here because
 * no local Postgres / Supabase instance is wired into this sandbox.
 *
 * To run locally:
 *   1. Start a fresh Supabase project (or `supabase db reset`).
 *   2. Set `SUPABASE_DB_URL` to the test database.
 *   3. Remove `.skip` and run: `bun run test tests/migrations.skip.test.ts`
 *      (or rename the file to drop `.skip`).
 *
 * Coverage goals:
 *   - `010_product_outcomes.sql` applies cleanly on an empty schema.
 *   - `010` is idempotent: re-running emits no errors.
 *   - `011_skin_analysis.sql` applies cleanly on top of 010.
 *   - `011` is idempotent.
 *   - The ratings → outcomes backfill in 010 produces sane row counts.
 *   - `get_product_cohort_stats('<key>', NULL)` returns the global-fallback
 *     tier when no cohort filters are supplied.
 *   - `adjacent_age_ranges('20s')` returns {teens, 20s, 30s} (matches the
 *     TS helper in `src/lib/cohort.ts`).
 */
import { describe, it } from "vitest";

describe.skip("migrations 010 + 011 replay (TODO — needs local Postgres)", () => {
  it("apply 010 on a fresh schema (no errors)", () => undefined);
  it("re-apply 010 (idempotent)", () => undefined);
  it("apply 011 on top of 010 (no errors)", () => undefined);
  it("re-apply 011 (idempotent)", () => undefined);
  it("get_product_cohort_stats fallback tier responds for unknown product_key", () => undefined);
  it("adjacent_age_ranges('20s') = {teens, 20s, 30s}", () => undefined);
});
