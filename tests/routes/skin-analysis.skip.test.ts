/**
 * Skipped scaffold for POST /api/skin-analysis.
 *
 * Source not readable on this machine — see /tmp/agentD-handoff.md.
 *
 * Expected behaviour (from Agent C's handoff):
 *   - Auth via `resolveAuth` (admin cookie OR supabase.auth.getUser).
 *   - 503 if `ANTHROPIC_API_KEY` (or whatever claude-client gates on) is
 *     missing.
 *   - 5/day per-user rate limit (in-memory).
 *   - 30-day cache on `users_profile.skin_analysis_json`; force: true
 *     bypasses.
 *   - Admin storage client to read `face-photos/<userId>/<file>`.
 *   - One JSON retry on Claude → 502 on second failure.
 *   - opus-4-7 @ 2500 tokens (model literal is in the route).
 *
 * Critical mocks:
 *   - `@anthropic-ai/sdk` Anthropic.messages.create
 *   - Supabase storage.download (face-photo bucket)
 *   - Supabase from('users_profile').update / select.single
 *   - `@/lib/claude-client` (text-only proxy guard — image path must hit SDK)
 *   - `@/lib/rate-limit`
 */
import { describe, it } from "vitest";

describe.skip("POST /api/skin-analysis (TODO — needs route source)", () => {
  it("unauthorized → 401", () => undefined);
  it("Claude not configured (env missing) → 503", () => undefined);
  it("no face photo on profile → 400", () => undefined);
  it("profile missing entirely → 400", () => undefined);
  it("cache hit + force=false + recent → returns { cached: true } without calling Claude", () => undefined);
  it("cache hit + force=true → calls Claude, persists, returns cached: false", () => undefined);
  it("Claude returns valid JSON → response analysis + upsert called", () => undefined);
  it("Claude returns garbage twice → 502", () => undefined);
  it("rate-limit exceeded (>5 calls in 24h for the same user) → 429", () => undefined);
  it("cached row that fails validateSkinAnalysis is silently regenerated", () => undefined);
});
