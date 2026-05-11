/**
 * Skipped scaffold for PATCH /api/profile/face-photo.
 *
 * Source not readable on this machine — see /tmp/agentD-handoff.md.
 *
 * Expected behaviour (from Agent C's handoff):
 *   - PATCH body: { path: string }
 *     where `path` is an object key in the `face-photos` bucket.
 *   - For non-admin users the owner folder MUST equal the caller's userId:
 *     `path = "<userId>/<file>"` — otherwise 403.
 *   - Path must match a strict regex (no slashes / `..` traversal) → 400.
 *   - On success: invalidate cached `skin_analysis_json`, best-effort
 *     remove the previous object, return 200.
 *   - Best-effort delete failures must NOT cause a non-200 response
 *     (Agent C: "tests should not assert on it").
 */
import { describe, it } from "vitest";

describe.skip("PATCH /api/profile/face-photo (TODO — needs route source)", () => {
  it("owner-folder enforcement: path under another user → 403", () => undefined);
  it("malformed path (no slash) → 400", () => undefined);
  it("malicious path with '../' traversal → 400", () => undefined);
  it("happy path: cache (skin_analysis_json) invalidated, old object delete attempted", () => undefined);
  it("happy path: succeeds even when the previous object delete fails", () => undefined);
  it("admin cookie bypass: can patch any owner-folder", () => undefined);
});
