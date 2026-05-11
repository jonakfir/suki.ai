/**
 * Unit tests for the skin-analysis schema parser/validator.
 *
 * `parseSkinAnalysis` — clean JSON / markdown-fenced JSON / garbage.
 * `validateSkinAnalysis` — happy path + every reject branch enumerated in
 * Agent C's "Surface areas to test #1".
 */
import { describe, expect, it } from "vitest";
import {
  parseSkinAnalysis,
  validateSkinAnalysis,
  type SkinAnalysisV1,
} from "./skin-analysis-schema";

// ── Fixtures ─────────────────────────────────────────────────────────────

const validAnalysis: SkinAnalysisV1 = {
  schema_version: 1,
  skin_type: "combination",
  skin_type_confidence: "medium",
  concerns: [
    {
      label: "post-acne marks",
      severity: "moderate",
      zones: ["forehead", "left cheek"],
    },
  ],
  hydration: { score: 62, note: "balanced T-zone, slight dryness on cheeks" },
  texture: { score: 78, note: "smooth with mild visible pores" },
  pores: { score: 70, note: "visible on nose, fine elsewhere" },
  undertone: "warm",
  barrier_status: { state: "healthy", note: "no visible irritation" },
  recommendations: {
    cleanser: [{ label: "gentle gel", why: "non-stripping" }],
    moisturizer: [{ label: "lightweight gel-cream", why: "supports combination skin" }],
    sunscreen: [{ label: "broad spectrum SPF 50", why: "daily protection" }],
    serum: [{ label: "niacinamide 5%", why: "reduces post-acne marks" }],
    ingredients: [
      { label: "niacinamide", why: "even tone" },
      { label: "fragrance", why: "irritation risk", avoid: true },
    ],
  },
  confidence: "medium",
  disclaimer:
    "Photo-based analysis is approximate; lighting and resolution affect accuracy.",
};

/** Helper: deep-clone the valid fixture so tests can mutate. */
function cloneValid(): SkinAnalysisV1 {
  return JSON.parse(JSON.stringify(validAnalysis)) as SkinAnalysisV1;
}

// ── parseSkinAnalysis ───────────────────────────────────────────────────

describe("parseSkinAnalysis", () => {
  it("returns the parsed object for clean JSON", () => {
    const text = JSON.stringify(validAnalysis);
    expect(parseSkinAnalysis(text)).toEqual(validAnalysis);
  });

  it("recovers from markdown-fenced JSON via regex fallback", () => {
    const fenced = "```json\n" + JSON.stringify(validAnalysis) + "\n```";
    const got = parseSkinAnalysis(fenced) as SkinAnalysisV1;
    expect(got.schema_version).toBe(1);
    expect(got.skin_type).toBe("combination");
  });

  it("recovers from JSON wrapped in prose", () => {
    const wrapped =
      "Here is the analysis you requested: " +
      JSON.stringify(validAnalysis) +
      " — let me know if you need clarification.";
    const got = parseSkinAnalysis(wrapped) as SkinAnalysisV1;
    expect(got.skin_type).toBe("combination");
  });

  it("throws when the response contains no JSON object at all", () => {
    expect(() => parseSkinAnalysis("hello world, no json here")).toThrow(
      /JSON/
    );
  });

  it("throws when the regex match is itself invalid JSON", () => {
    expect(() => parseSkinAnalysis("{ unclosed: 'value' ")).toThrow();
  });
});

// ── validateSkinAnalysis — happy path ───────────────────────────────────

describe("validateSkinAnalysis: happy path", () => {
  it("accepts a complete, well-formed fixture", () => {
    const result = validateSkinAnalysis(validAnalysis);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.skin_type).toBe("combination");
      expect(result.data.concerns).toHaveLength(1);
      expect(result.data.recommendations.ingredients).toHaveLength(2);
    }
  });

  it("clamps non-integer scores via Math.trunc", () => {
    const v = cloneValid();
    // @ts-expect-error mutate for test
    v.hydration.score = 62.9;
    const result = validateSkinAnalysis(v);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.hydration.score).toBe(62);
  });
});

// ── validateSkinAnalysis — missing top-level keys ──────────────────────

describe("validateSkinAnalysis: missing required key", () => {
  const requiredKeys: (keyof SkinAnalysisV1)[] = [
    "schema_version",
    "skin_type",
    "skin_type_confidence",
    "concerns",
    "hydration",
    "texture",
    "pores",
    "undertone",
    "barrier_status",
    "recommendations",
    "confidence",
    "disclaimer",
  ];

  it.each(requiredKeys)("rejects when '%s' is absent", (key) => {
    const v = cloneValid() as Record<string, unknown>;
    delete v[key];
    const result = validateSkinAnalysis(v);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(new RegExp(key));
  });
});

// ── validateSkinAnalysis — bad unions ──────────────────────────────────

describe("validateSkinAnalysis: bad union values", () => {
  it("rejects unknown skin_type", () => {
    const v = cloneValid();
    // @ts-expect-error invalid enum for test
    v.skin_type = "purple";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects unknown undertone", () => {
    const v = cloneValid();
    // @ts-expect-error invalid enum
    v.undertone = "magenta";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects unknown barrier_status.state", () => {
    const v = cloneValid();
    // @ts-expect-error invalid enum
    v.barrier_status.state = "exploded";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects unknown concerns[].severity", () => {
    const v = cloneValid();
    // @ts-expect-error invalid enum
    v.concerns[0].severity = "catastrophic";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects unknown confidence", () => {
    const v = cloneValid();
    // @ts-expect-error invalid enum
    v.confidence = "maybe";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects unknown skin_type_confidence", () => {
    const v = cloneValid();
    // @ts-expect-error invalid enum
    v.skin_type_confidence = "vibes";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });
});

// ── validateSkinAnalysis — out-of-range scores ─────────────────────────

describe("validateSkinAnalysis: out-of-range scores", () => {
  it("rejects negative scores", () => {
    const v = cloneValid();
    v.hydration.score = -1;
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects scores > 100", () => {
    const v = cloneValid();
    v.texture.score = 150;
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    const v = cloneValid();
    // @ts-expect-error testing the guard
    v.pores.score = Number.NaN;
    expect(validateSkinAnalysis(v).ok).toBe(false);
    // @ts-expect-error testing the guard
    v.pores.score = Number.POSITIVE_INFINITY;
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects non-number score types", () => {
    const v = cloneValid();
    // @ts-expect-error wrong type
    v.hydration.score = "high";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });
});

// ── validateSkinAnalysis — array constraints ───────────────────────────

describe("validateSkinAnalysis: array constraints", () => {
  it("rejects empty concerns[].zones (must be non-empty)", () => {
    const v = cloneValid();
    v.concerns[0].zones = [];
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects non-array recommendations.cleanser", () => {
    const v = cloneValid() as unknown as Record<string, Record<string, unknown>>;
    v.recommendations.cleanser = { not: "an array" };
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects non-array concerns", () => {
    const v = cloneValid() as unknown as Record<string, unknown>;
    v.concerns = "not an array";
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("accepts empty recommendation categories (no serum is fine)", () => {
    const v = cloneValid();
    v.recommendations.serum = [];
    expect(validateSkinAnalysis(v).ok).toBe(true);
  });
});

// ── validateSkinAnalysis — extra keys (strict) ─────────────────────────

describe("validateSkinAnalysis: rejects extra unknown keys", () => {
  it("rejects extra top-level keys", () => {
    const v = { ...cloneValid(), bonus_field: "nope" };
    const result = validateSkinAnalysis(v);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Unexpected.*bonus_field/);
  });

  it("rejects extra keys on barrier_status", () => {
    const v = cloneValid();
    (v.barrier_status as unknown as Record<string, unknown>).extra = 1;
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects extra keys on a score-note (e.g. hydration)", () => {
    const v = cloneValid();
    (v.hydration as unknown as Record<string, unknown>).extra = 1;
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects extra keys on a recommendation item", () => {
    const v = cloneValid();
    (v.recommendations.cleanser[0] as unknown as Record<string, unknown>).extra = 1;
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });

  it("rejects extra keys on recommendations container", () => {
    const v = cloneValid();
    (v.recommendations as unknown as Record<string, unknown>).massage = [];
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });
});

// ── validateSkinAnalysis — non-object top level ────────────────────────

describe("validateSkinAnalysis: top-level shape", () => {
  it("rejects null", () => {
    expect(validateSkinAnalysis(null).ok).toBe(false);
  });

  it("rejects arrays", () => {
    expect(validateSkinAnalysis([] as unknown).ok).toBe(false);
  });

  it("rejects primitives", () => {
    expect(validateSkinAnalysis("a string" as unknown).ok).toBe(false);
    expect(validateSkinAnalysis(42 as unknown).ok).toBe(false);
  });

  it("rejects schema_version != 1", () => {
    const v = { ...cloneValid(), schema_version: 2 };
    expect(validateSkinAnalysis(v).ok).toBe(false);
  });
});
