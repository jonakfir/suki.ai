import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callClaude, isClaudeConfigured } from "@/lib/claude-client";
import {
  parseSkinAnalysis,
  validateSkinAnalysis,
} from "@/lib/skin-analysis-schema";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/skin-analysis
 *
 * Body: { force?: boolean }
 *   - force=true  → re-run the analysis even if a fresh cached row exists
 *   - force=false → return the cached row when < 30 days old
 *
 * The model never sees the raw selfie URL — we download from the
 * `face-photos` bucket using the service-role client (RLS would
 * otherwise block server-side reads) and pass a base64 image to Claude.
 *
 * Cache is keyed off `users_profile.skin_analysis_generated_at`.
 * Schema is owned by `src/lib/skin-analysis-schema.ts` (SkinAnalysisV1).
 */

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day
const RATE_LIMIT_PER_DAY = 5;

const SYSTEM_PROMPT =
  "You are a careful AI assistant that helps users visualize observations about their skin from a self-uploaded selfie. You are NOT a dermatologist and your output is NOT a medical diagnosis. Frame every observation as a likely/visible pattern, never a clinical finding. Be conservative — when lighting, angle, or makeup make a feature ambiguous, lower the confidence and say so in the disclaimer. Return ONLY valid JSON matching the requested schema. No markdown, no preamble.";

const JSON_SCHEMA_BLOCK = `\`\`\`json
{
  "schema_version": 1,
  "skin_type": "oily" | "dry" | "combination" | "normal" | "sensitive",
  "skin_type_confidence": "low" | "medium" | "high",
  "concerns": [
    {
      "label": "short noun phrase (e.g. \\"post-acne marks\\")",
      "severity": "mild" | "moderate" | "noticeable" | "marked" | "severe",
      "zones": ["forehead", "left cheek", "nose", "right cheek", "chin", "around mouth", "jawline", "under eyes"]
    }
  ],
  "hydration":  { "score": 0-100, "note": "one short clause" },
  "texture":    { "score": 0-100, "note": "one short clause" },
  "pores":      { "score": 0-100, "note": "one short clause" },
  "undertone":  "warm" | "cool" | "neutral" | "olive",
  "barrier_status": {
    "state": "healthy" | "compromised" | "uncertain",
    "note": "one short clause"
  },
  "recommendations": {
    "cleanser":    [{ "label": "1-3 words", "why": "one short clause", "avoid": false }],
    "moisturizer": [{ "label": "1-3 words", "why": "one short clause", "avoid": false }],
    "sunscreen":   [{ "label": "1-3 words", "why": "one short clause", "avoid": false }],
    "serum":       [{ "label": "1-3 words", "why": "one short clause", "avoid": false }],
    "ingredients": [{ "label": "ingredient name", "why": "one short clause", "avoid": false }]
  },
  "confidence": "low" | "medium" | "high",
  "disclaimer": "1-3 sentence caveat about photo quality / known limitations"
}
\`\`\``;

function mediaTypeForPath(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  // jpeg / jpg / unknown → jpeg
  return "image/jpeg";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // Node Buffer is fastest; Buffer.from accepts ArrayBuffer in Node 18+.
  return Buffer.from(buf).toString("base64");
}

function buildUserPrompt(profile: {
  skin_type: string | null;
  skin_concerns: string[] | null;
  age_range: string | null;
  race: string | null;
  known_allergies: string[] | null;
}): string {
  const allergies =
    (profile.known_allergies ?? []).filter(Boolean).join(", ") || "none";
  const stated_concerns =
    (profile.skin_concerns ?? []).filter(Boolean).join(", ") || "none stated";

  return `Analyze this user-submitted selfie and produce a JSON skin profile.

For every field:
  • Frame observations as visible patterns, not diagnoses.
  • "skin_type" is your best read of the user's *current* type from the photo.
    Cross-check against their stated type (below) — if you disagree, lower
    skin_type_confidence and explain in the disclaimer.
  • "concerns" lists up to 6 visible concerns. Use natural zone names like
    "forehead", "left cheek", "right cheek", "nose", "chin", "around mouth",
    "jawline", "under eyes". Every concern must have at least one zone.
  • Hydration / texture / pores scores: 100 = optimal (well-hydrated / smooth /
    refined pores), 0 = highly compromised. Be generous when the photo is
    clearly limiting (poor lighting, makeup, low resolution) and explain.
  • "undertone": cool / warm / neutral / olive — your best read.
  • "barrier_status": "healthy" when no visible irritation/redness/flaking,
    "compromised" when present, "uncertain" when you can't tell from the photo.
  • Recommendations: 2-4 items per category. Each item: 1-3 word label
    (e.g. "gel cleanser") + one short "why" clause. Use "avoid": true for
    items the user should AVOID. The "ingredients" category covers actives
    (e.g. niacinamide, ceramides) — use "avoid": true when an ingredient
    should be steered clear of (e.g. fragrance for sensitive skin).
  • "confidence" is your overall read of the analysis, given photo quality.
  • "disclaimer" must call out specific limitations of the photo
    (lighting / angle / makeup / resolution) and remind the user this is
    AI observation, not medical advice.

User profile (cross-check against the photo, do NOT just repeat):
  • Stated skin type: ${profile.skin_type ?? "not provided"}
  • Stated concerns: ${stated_concerns}
  • Age range: ${profile.age_range ?? "not provided"}
  • Ethnicity / race (self-reported, may inform pigmentation / undertone guess): ${profile.race ?? "not provided"}
  • Known allergies / sensitivities — DO NOT recommend these as ingredients,
    use "avoid": true if relevant: ${allergies}

Return ONLY valid JSON matching this schema (no markdown, no preamble, no code fences):

${JSON_SCHEMA_BLOCK}`;
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuth();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    if (!isClaudeConfigured()) {
      return NextResponse.json(
        {
          error:
            "AI not configured. Set SUKI_PROXY_URL + SUKI_PROXY_SECRET or ANTHROPIC_API_KEY.",
        },
        { status: 503 }
      );
    }

    // Rate limit: 5 analyses / user / day. The body is small enough that
    // we limit per *user* not per *IP*.
    const rl = rateLimit({
      key: `skin-analysis:${userId}`,
      limit: RATE_LIMIT_PER_DAY,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: rl.retryAfterSeconds
            ? { "Retry-After": String(rl.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    let body: { force?: unknown } = {};
    try {
      body = (await request.json()) as { force?: unknown };
    } catch {
      // Empty body is fine — defaults apply.
    }
    const force = body.force === true;

    // Pull the user's existing profile + the storage path. We always use
    // the request's resolved supabase client (RLS-aware) for the read,
    // but downloads from the bucket need the admin client.
    const { data: profile, error: profileErr } = await auth.supabase
      .from("users_profile")
      .select(
        "face_photo_storage_path, skin_type, skin_concerns, skin_tone, age_range, race, known_allergies, skin_analysis_json, skin_analysis_generated_at"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json(
        { error: "Failed to load profile." },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 400 }
      );
    }

    const storagePath = profile.face_photo_storage_path as string | null;
    if (!storagePath) {
      return NextResponse.json(
        {
          error:
            "No selfie on file. Upload a photo in onboarding or from the skin profile page first.",
        },
        { status: 400 }
      );
    }

    // Cache hit?
    if (!force && profile.skin_analysis_json && profile.skin_analysis_generated_at) {
      const generatedAt = Date.parse(
        profile.skin_analysis_generated_at as string
      );
      if (
        Number.isFinite(generatedAt) &&
        Date.now() - generatedAt < CACHE_TTL_MS
      ) {
        const cachedRaw = profile.skin_analysis_json;
        const v = validateSkinAnalysis(cachedRaw);
        if (v.ok) {
          return NextResponse.json({
            analysis: v.data,
            cached: true,
            generated_at: profile.skin_analysis_generated_at,
          });
        }
        // Cached row is corrupt or from an older schema; fall through and
        // regenerate. Don't error out on the user.
      }
    }

    // Download the selfie. Service-role client bypasses RLS — required for
    // server-side reads from the `face-photos` bucket.
    const admin = createAdminClient();
    const dl = await admin.storage.from("face-photos").download(storagePath);
    if (dl.error || !dl.data) {
      console.error("[skin-analysis] storage download failed:", dl.error);
      return NextResponse.json(
        { error: "Could not load your selfie. Try re-uploading it." },
        { status: 500 }
      );
    }
    const base64 = await blobToBase64(dl.data);
    const mediaType = mediaTypeForPath(storagePath);

    const userPrompt = buildUserPrompt({
      skin_type: (profile.skin_type as string | null) ?? null,
      skin_concerns: (profile.skin_concerns as string[] | null) ?? null,
      age_range: (profile.age_range as string | null) ?? null,
      race: (profile.race as string | null) ?? null,
      known_allergies:
        (profile.known_allergies as string[] | null) ?? null,
    });

    // Single retry with an explicit nudge if the first pass isn't valid JSON.
    let analysis: ReturnType<typeof validateSkinAnalysis> | null = null;
    let retryPrompt = userPrompt;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await callClaude({
        image: { base64, mediaType },
        system: SYSTEM_PROMPT,
        prompt: retryPrompt,
        model: "claude-opus-4-7",
        maxTokens: 2500,
      });

      let parsed: unknown;
      try {
        parsed = parseSkinAnalysis(result.text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt === 0) {
          retryPrompt =
            userPrompt +
            "\n\nYour previous reply was not valid JSON. Return only valid JSON matching the schema.";
          continue;
        }
        console.error("[skin-analysis] JSON parse failed twice:", msg);
        return NextResponse.json(
          { error: "AI returned unparsable output. Please try again." },
          { status: 502 }
        );
      }

      const validated = validateSkinAnalysis(parsed);
      if (validated.ok) {
        analysis = validated;
        break;
      }
      if (attempt === 0) {
        retryPrompt =
          userPrompt +
          `\n\nYour previous reply was not valid JSON matching the schema: ${validated.reason}. Return only valid JSON matching the schema.`;
        continue;
      }
      console.error(
        "[skin-analysis] validation failed twice:",
        validated.reason
      );
      return NextResponse.json(
        {
          error: "AI returned data that didn't match the schema.",
          detail: validated.reason,
        },
        { status: 502 }
      );
    }

    if (!analysis || !analysis.ok) {
      // Defensive — the loop above always returns or assigns.
      return NextResponse.json(
        { error: "AI returned unparsable output." },
        { status: 502 }
      );
    }

    const generatedAt = new Date().toISOString();
    const { error: upsertErr } = await admin
      .from("users_profile")
      .upsert(
        {
          user_id: userId,
          skin_analysis_json: analysis.data,
          skin_analysis_generated_at: generatedAt,
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("[skin-analysis] upsert failed:", upsertErr);
      // Still return the analysis — losing the cache is better than a 500
      // when we already paid for the model call.
      return NextResponse.json({
        analysis: analysis.data,
        cached: false,
        generated_at: generatedAt,
        warning: "Analysis was generated but could not be cached.",
      });
    }

    return NextResponse.json({
      analysis: analysis.data,
      cached: false,
      generated_at: generatedAt,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[skin-analysis] unhandled error:", msg);
    return NextResponse.json(
      { error: "Failed to generate skin analysis.", detail: msg },
      { status: 500 }
    );
  }
}
