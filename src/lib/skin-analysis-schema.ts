/**
 * Hand-rolled types + validators for the AI selfie → skin-profile feature.
 *
 * Why no zod: the rest of the codebase validates by hand (see
 * `src/app/api/scan/route.ts`, `src/app/api/products/batch/route.ts`).
 * Mimicking that style keeps the bundle lean and the dependency graph
 * unchanged.
 *
 * Schema is owned here AND by the system prompt in
 * `src/app/api/skin-analysis/route.ts`. Keep them in sync — if you add a
 * field, update both.
 */

export type SkinTypeKey =
  | "oily"
  | "dry"
  | "combination"
  | "normal"
  | "sensitive";

export type SkinConfidence = "low" | "medium" | "high";

export type BarrierState = "healthy" | "compromised" | "uncertain";

export type Undertone = "warm" | "cool" | "neutral" | "olive";

export interface SkinConcern {
  /** Short label, e.g. "post-acne marks" */
  label: string;
  /** mild → severe spectrum, 5 buckets */
  severity: "mild" | "moderate" | "noticeable" | "marked" | "severe";
  /** Zones where the concern appears (e.g. ["forehead", "left cheek"]) */
  zones: string[];
}

export interface ScoreNote {
  /** Integer 0–100 inclusive */
  score: number;
  /** Single short clause explaining the score */
  note: string;
}

export interface BarrierStatus {
  state: BarrierState;
  note: string;
}

export interface SkinRecommendationItem {
  /** 1-3 word label, e.g. "gentle cleanser" */
  label: string;
  /** Single short clause — why this item */
  why: string;
  /** When true the item is something to *avoid* (rendered with red X) */
  avoid?: boolean;
}

export interface SkinRecommendations {
  cleanser: SkinRecommendationItem[];
  moisturizer: SkinRecommendationItem[];
  sunscreen: SkinRecommendationItem[];
  serum: SkinRecommendationItem[];
  /** Active ingredients to seek out OR avoid (use `avoid: true` for the latter) */
  ingredients: SkinRecommendationItem[];
}

export interface SkinAnalysisV1 {
  schema_version: 1;
  skin_type: SkinTypeKey;
  skin_type_confidence: SkinConfidence;
  concerns: SkinConcern[];
  hydration: ScoreNote;
  texture: ScoreNote;
  pores: ScoreNote;
  undertone: Undertone;
  barrier_status: BarrierStatus;
  recommendations: SkinRecommendations;
  /** Overall confidence in the analysis: low | medium | high */
  confidence: SkinConfidence;
  /** 1-3 sentence caveat about photo quality / known limitations. */
  disclaimer: string;
}

export type SkinAnalysisValidationResult =
  | { ok: true; data: SkinAnalysisV1 }
  | { ok: false; reason: string };

// ── Allowed unions, declared once so we can iterate over them in error msgs ──

const SKIN_TYPES: readonly SkinTypeKey[] = [
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
] as const;

const CONFIDENCES: readonly SkinConfidence[] = [
  "low",
  "medium",
  "high",
] as const;

const BARRIER_STATES: readonly BarrierState[] = [
  "healthy",
  "compromised",
  "uncertain",
] as const;

const UNDERTONES: readonly Undertone[] = [
  "warm",
  "cool",
  "neutral",
  "olive",
] as const;

const SEVERITIES: readonly SkinConcern["severity"][] = [
  "mild",
  "moderate",
  "noticeable",
  "marked",
  "severe",
] as const;

const TOP_KEYS = [
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
] as const;

const REC_KEYS: (keyof SkinRecommendations)[] = [
  "cleanser",
  "moisturizer",
  "sunscreen",
  "serum",
  "ingredients",
];

// ── Small helpers ──

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function asString(v: unknown, key: string, maxLen = 600): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function asEnum<T extends string>(
  v: unknown,
  allowed: readonly T[]
): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : null;
}

function validateScoreNote(
  raw: unknown,
  key: string
): { ok: true; data: ScoreNote } | { ok: false; reason: string } {
  if (!isObject(raw)) return fail(`${key} must be an object`);
  const extraKeys = Object.keys(raw).filter(
    (k) => k !== "score" && k !== "note"
  );
  if (extraKeys.length) {
    return fail(`${key} has unexpected keys: ${extraKeys.join(", ")}`);
  }
  const { score, note } = raw as { score?: unknown; note?: unknown };
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return fail(`${key}.score must be a finite number`);
  }
  const intScore = Math.trunc(score);
  if (intScore < 0 || intScore > 100) {
    return fail(`${key}.score must be in [0, 100]`);
  }
  const noteStr = asString(note, `${key}.note`, 240);
  if (!noteStr) return fail(`${key}.note must be a non-empty string`);
  return { ok: true, data: { score: intScore, note: noteStr } };
}

function validateConcern(
  raw: unknown,
  i: number
): { ok: true; data: SkinConcern } | { ok: false; reason: string } {
  if (!isObject(raw)) return fail(`concerns[${i}] must be an object`);
  const extraKeys = Object.keys(raw).filter(
    (k) => k !== "label" && k !== "severity" && k !== "zones"
  );
  if (extraKeys.length) {
    return fail(`concerns[${i}] has unexpected keys: ${extraKeys.join(", ")}`);
  }
  const label = asString(raw.label, `concerns[${i}].label`, 80);
  if (!label) return fail(`concerns[${i}].label must be a non-empty string`);
  const severity = asEnum(raw.severity, SEVERITIES);
  if (!severity)
    return fail(
      `concerns[${i}].severity must be one of ${SEVERITIES.join(", ")}`
    );
  if (!Array.isArray(raw.zones))
    return fail(`concerns[${i}].zones must be an array`);
  if (raw.zones.length === 0)
    return fail(`concerns[${i}].zones must be a non-empty array`);
  const zones: string[] = [];
  for (let j = 0; j < raw.zones.length; j++) {
    const z = asString(raw.zones[j], `concerns[${i}].zones[${j}]`, 40);
    if (!z) return fail(`concerns[${i}].zones[${j}] must be a non-empty string`);
    zones.push(z);
  }
  return { ok: true, data: { label, severity, zones } };
}

function validateRecItem(
  raw: unknown,
  path: string
): { ok: true; data: SkinRecommendationItem } | { ok: false; reason: string } {
  if (!isObject(raw)) return fail(`${path} must be an object`);
  const extraKeys = Object.keys(raw).filter(
    (k) => k !== "label" && k !== "why" && k !== "avoid"
  );
  if (extraKeys.length) {
    return fail(`${path} has unexpected keys: ${extraKeys.join(", ")}`);
  }
  const label = asString(raw.label, `${path}.label`, 60);
  if (!label) return fail(`${path}.label must be a non-empty string`);
  const why = asString(raw.why, `${path}.why`, 200);
  if (!why) return fail(`${path}.why must be a non-empty string`);
  if (raw.avoid !== undefined && typeof raw.avoid !== "boolean") {
    return fail(`${path}.avoid must be a boolean when present`);
  }
  return {
    ok: true,
    data: {
      label,
      why,
      ...(raw.avoid === true ? { avoid: true } : {}),
    },
  };
}

// ── Public API ──

/**
 * JSON.parse with a `{...}` regex fallback, mirroring the pattern used by
 * `scan/route.ts`. Returns `unknown` — the caller must then run
 * `validateSkinAnalysis` to type-narrow.
 */
export function parseSkinAnalysis(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Response did not contain a JSON object");
    }
    return JSON.parse(match[0]);
  }
}

/**
 * Hand-rolled validator for SkinAnalysisV1. Rejects:
 *   - non-objects at top level
 *   - missing required keys
 *   - any *extra* top-level keys (strict — keeps the schema tight)
 *   - bad union values
 *   - out-of-range scores
 *   - empty required arrays (zones inside concerns)
 *
 * Empty arrays at the *recommendation* category level (e.g. no serum) are
 * permitted — sometimes there genuinely isn't one to recommend.
 */
export function validateSkinAnalysis(raw: unknown): SkinAnalysisValidationResult {
  if (!isObject(raw)) return fail("Top-level value must be an object");

  const keys = Object.keys(raw);
  const extra = keys.filter(
    (k) => !(TOP_KEYS as readonly string[]).includes(k)
  );
  if (extra.length) {
    return fail(`Unexpected top-level keys: ${extra.join(", ")}`);
  }
  for (const required of TOP_KEYS) {
    if (!(required in raw)) {
      return fail(`Missing required key: ${required}`);
    }
  }

  if (raw.schema_version !== 1) {
    return fail("schema_version must equal the literal 1");
  }

  const skinType = asEnum(raw.skin_type, SKIN_TYPES);
  if (!skinType) {
    return fail(`skin_type must be one of ${SKIN_TYPES.join(", ")}`);
  }
  const skinTypeConfidence = asEnum(raw.skin_type_confidence, CONFIDENCES);
  if (!skinTypeConfidence) {
    return fail(
      `skin_type_confidence must be one of ${CONFIDENCES.join(", ")}`
    );
  }

  if (!Array.isArray(raw.concerns)) {
    return fail("concerns must be an array");
  }
  const concerns: SkinConcern[] = [];
  for (let i = 0; i < raw.concerns.length; i++) {
    const result = validateConcern(raw.concerns[i], i);
    if (!result.ok) return result;
    concerns.push(result.data);
  }

  const hydration = validateScoreNote(raw.hydration, "hydration");
  if (!hydration.ok) return hydration;
  const texture = validateScoreNote(raw.texture, "texture");
  if (!texture.ok) return texture;
  const pores = validateScoreNote(raw.pores, "pores");
  if (!pores.ok) return pores;

  const undertone = asEnum(raw.undertone, UNDERTONES);
  if (!undertone) {
    return fail(`undertone must be one of ${UNDERTONES.join(", ")}`);
  }

  if (!isObject(raw.barrier_status)) {
    return fail("barrier_status must be an object");
  }
  const bsExtra = Object.keys(raw.barrier_status).filter(
    (k) => k !== "state" && k !== "note"
  );
  if (bsExtra.length) {
    return fail(`barrier_status has unexpected keys: ${bsExtra.join(", ")}`);
  }
  const barrierState = asEnum(
    (raw.barrier_status as { state?: unknown }).state,
    BARRIER_STATES
  );
  if (!barrierState) {
    return fail(
      `barrier_status.state must be one of ${BARRIER_STATES.join(", ")}`
    );
  }
  const barrierNote = asString(
    (raw.barrier_status as { note?: unknown }).note,
    "barrier_status.note",
    240
  );
  if (!barrierNote) {
    return fail("barrier_status.note must be a non-empty string");
  }

  if (!isObject(raw.recommendations)) {
    return fail("recommendations must be an object");
  }
  const recsExtra = Object.keys(raw.recommendations).filter(
    (k) => !(REC_KEYS as readonly string[]).includes(k)
  );
  if (recsExtra.length) {
    return fail(
      `recommendations has unexpected keys: ${recsExtra.join(", ")}`
    );
  }
  const recs: SkinRecommendations = {
    cleanser: [],
    moisturizer: [],
    sunscreen: [],
    serum: [],
    ingredients: [],
  };
  for (const k of REC_KEYS) {
    if (!(k in raw.recommendations)) {
      return fail(`Missing recommendations.${k}`);
    }
    const arr = (raw.recommendations as Record<string, unknown>)[k];
    if (!Array.isArray(arr)) {
      return fail(`recommendations.${k} must be an array`);
    }
    for (let i = 0; i < arr.length; i++) {
      const r = validateRecItem(arr[i], `recommendations.${k}[${i}]`);
      if (!r.ok) return r;
      recs[k].push(r.data);
    }
  }

  const confidence = asEnum(raw.confidence, CONFIDENCES);
  if (!confidence) {
    return fail(`confidence must be one of ${CONFIDENCES.join(", ")}`);
  }

  const disclaimer = asString(raw.disclaimer, "disclaimer", 800);
  if (!disclaimer) {
    return fail("disclaimer must be a non-empty string");
  }

  return {
    ok: true,
    data: {
      schema_version: 1,
      skin_type: skinType,
      skin_type_confidence: skinTypeConfidence,
      concerns,
      hydration: hydration.data,
      texture: texture.data,
      pores: pores.data,
      undertone,
      barrier_status: { state: barrierState, note: barrierNote },
      recommendations: recs,
      confidence,
      disclaimer,
    },
  };
}
