/**
 * Cohort helpers for product social-proof.
 *
 * Pure, no React, no fetch — safe to import from a server route AND a client
 * component. Mirrors the SQL function `get_product_cohort_stats` in
 * `supabase/migrations/010_product_outcomes.sql`.
 */

export type ProductDomain = "skincare" | "haircare" | "makeup";

export type OutcomeKey =
  | "helped"
  | "no_change"
  | "caused_breakouts"
  | "caused_irritation"
  | "caused_dryness"
  | "caused_oiliness"
  | "other_negative";

export type OutcomeTone = "positive" | "negative" | "neutral";

export interface CohortInfo {
  /** Number of outcome rows backing this summary (>= 5 strict, >= 20 fallback). */
  sample_size: number;
  /** Share of `helped` outcomes out of sample_size, 0–100 integer. */
  positive_pct: number;
  /** Mode outcome over the sample. */
  top_outcome: OutcomeKey;
  /** Share of `top_outcome` out of sample_size, 0–100 integer. */
  top_outcome_pct: number;
  /** True when the strict-cohort sample was too small and we used the global pool. */
  is_fallback: boolean;
  /** Human-friendly label for the cohort — e.g. "combination skin + acne". */
  cohort_label: string;
}

const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  helped: "helped",
  no_change: "no change",
  caused_breakouts: "caused breakouts",
  caused_irritation: "caused irritation",
  caused_dryness: "caused dryness",
  caused_oiliness: "caused oiliness",
  other_negative: "other negative reaction",
};

const OUTCOME_TONES: Record<OutcomeKey, OutcomeTone> = {
  helped: "positive",
  no_change: "neutral",
  caused_breakouts: "negative",
  caused_irritation: "negative",
  caused_dryness: "negative",
  caused_oiliness: "negative",
  other_negative: "negative",
};

export function outcomeToTag(o: OutcomeKey): string {
  return OUTCOME_LABELS[o] ?? o;
}

export function outcomeTone(o: OutcomeKey): OutcomeTone {
  return OUTCOME_TONES[o] ?? "neutral";
}

/**
 * Produces a human-friendly cohort label like:
 *   "combination skin + acne, dryness"
 *   "oily skin"
 *   "30s · sensitive skin"
 *
 * Inputs may be partial — missing skin_type just drops that segment.
 */
export function formatCohortLabel(profile: {
  skin_type?: string | null;
  skin_concerns?: string[] | null;
}): string {
  const parts: string[] = [];
  if (profile.skin_type) {
    parts.push(`${profile.skin_type} skin`);
  }
  const concerns = (profile.skin_concerns ?? []).filter(Boolean).slice(0, 2);
  if (concerns.length) {
    parts.push(concerns.join(", "));
  }
  if (parts.length === 0) return "based on similar users";
  return parts.join(" + ");
}

const AGE_BUCKETS = ["teens", "20s", "30s", "40s", "50+"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/**
 * Adjacent age-range buckets. Mirrors SQL `adjacent_age_ranges`.
 * Returns the input bucket plus its immediate neighbours. Unknown input
 * returns every bucket (no narrowing).
 */
export function adjacentAgeRanges(age: string | null | undefined): AgeBucket[] {
  switch (age) {
    case "teens":
      return ["teens", "20s"];
    case "20s":
      return ["teens", "20s", "30s"];
    case "30s":
      return ["20s", "30s", "40s"];
    case "40s":
      return ["30s", "40s", "50+"];
    case "50+":
      return ["40s", "50+"];
    default:
      return [...AGE_BUCKETS];
  }
}

/**
 * Canonical dedup key for a product. Matches the SQL generated column on
 * `product_outcomes.product_key`. Keep these two definitions byte-for-byte
 * in sync — `cohort/route.ts` and the upsert path both depend on it.
 */
export function productKey(
  name: string,
  brand: string,
  domain: ProductDomain = "skincare"
): string {
  return `${name.toLowerCase()}|${brand.toLowerCase()}|${domain}`;
}
