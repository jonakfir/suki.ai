// Curated list of commonly-flagged ingredient conflicts.
// Rules are heuristic — the UX is "heads up" not "do not use". We err on the side
// of showing a warning so users can look things up or ask Suki.

export type Severity = "avoid" | "caution" | "note";

export interface ConflictRule {
  id: string;
  a: string[];           // any of these
  b: string[];           // combined with any of these
  severity: Severity;
  title: string;
  explanation: string;
  alternatives?: string;  // short "try instead" text
  // If true, the rule only flags when a & b would be used *in the same routine slot*.
  sameSlotOnly?: boolean;
}

const RETINOIDS = [
  "retinol", "retinal", "retinaldehyde", "retinyl palmitate", "tretinoin",
  "adapalene", "granactive retinoid", "hydroxypinacolone retinoate", "hpr",
];

const AHAS = [
  "glycolic acid", "lactic acid", "mandelic acid", "citric acid",
  "malic acid", "tartaric acid", "aha",
];

const BHAS = [
  "salicylic acid", "bha", "betaine salicylate",
];

const STRONG_ACIDS = [...AHAS, ...BHAS];

const VIT_C = [
  "ascorbic acid", "l-ascorbic acid", "ethyl ascorbic acid",
  "magnesium ascorbyl phosphate", "sodium ascorbyl phosphate",
  "ascorbyl glucoside", "3-o-ethyl ascorbic acid", "vitamin c",
];

const BENZOYL_PEROXIDE = ["benzoyl peroxide", "bpo"];

const NIACINAMIDE = ["niacinamide", "nicotinamide"];

const OXIDIZERS = ["hydrogen peroxide"];

const FRAGRANCE = ["parfum", "fragrance", "essential oil"];

export const CONFLICT_RULES: ConflictRule[] = [
  {
    id: "retinoid-aha-bha",
    a: RETINOIDS,
    b: STRONG_ACIDS,
    severity: "caution",
    title: "Retinoid + strong acid (AHA/BHA)",
    explanation:
      "Using a retinoid and an AHA/BHA in the same routine can over-exfoliate and irritate the barrier.",
    alternatives: "Alternate nights, or keep acids AM and retinoid PM.",
  },
  {
    id: "retinoid-bpo",
    a: RETINOIDS,
    b: BENZOYL_PEROXIDE,
    severity: "avoid",
    title: "Retinoid + benzoyl peroxide",
    explanation:
      "Benzoyl peroxide can oxidize most retinoids, degrading them and increasing irritation when layered together.",
    alternatives:
      "Use BPO in the morning and retinoid at night — or switch BPO to a short-contact cleanser.",
    sameSlotOnly: true,
  },
  {
    id: "vitc-retinoid",
    a: VIT_C,
    b: RETINOIDS,
    severity: "note",
    title: "Vitamin C + retinoid (same routine)",
    explanation:
      "L-ascorbic acid prefers a low pH; retinoids prefer neutral. Layering may reduce efficacy of both.",
    alternatives: "Vitamin C in the morning, retinoid at night.",
    sameSlotOnly: true,
  },
  {
    id: "vitc-niacinamide",
    a: VIT_C,
    b: NIACINAMIDE,
    severity: "note",
    title: "Vitamin C + niacinamide",
    explanation:
      "The 1960s myth of this pair being incompatible has been largely debunked, but high concentrations of L-ascorbic acid with niacinamide can cause temporary flushing.",
    alternatives: "Fine for most skin. Space them out if you notice flushing.",
    sameSlotOnly: true,
  },
  {
    id: "aha-bha-stack",
    a: AHAS,
    b: BHAS,
    severity: "caution",
    title: "AHA + BHA in the same routine",
    explanation:
      "Stacking acids daily is a common driver of barrier damage.",
    alternatives: "Alternate days or use a combination product formulated for daily use.",
    sameSlotOnly: true,
  },
  {
    id: "bpo-vitc",
    a: BENZOYL_PEROXIDE,
    b: VIT_C,
    severity: "avoid",
    title: "Benzoyl peroxide + vitamin C",
    explanation:
      "BPO will oxidize L-ascorbic acid — both lose effectiveness.",
    alternatives: "Keep them in different routines (AM vs PM).",
    sameSlotOnly: true,
  },
  {
    id: "sensitive-fragrance",
    a: ["sensitive-skin"],
    b: FRAGRANCE,
    severity: "caution",
    title: "Fragrance in a sensitive-skin routine",
    explanation:
      "Essential oils and parfum are common triggers for reactive skin.",
    alternatives: "Look for fragrance-free formulas.",
  },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    // Collapse hyphen spacing: "l - ascorbic acid" → "l-ascorbic acid"
    .replace(/\s*-\s*/g, "-")
    // Collapse runs of whitespace into a single space.
    .replace(/\s+/g, " ")
    .trim();
}

// Word-boundary aware match. Avoids "aha" hitting "bakuchiol-saha-extract".
// Needles that already contain spaces/punctuation are treated as phrases.
function matchesNeedle(haystack: string, needle: string): boolean {
  const n = norm(needle);
  const h = norm(haystack);
  if (h === n) return true;
  // Short needles must match with word boundaries on both sides.
  const tokenize = /\w+/g;
  const tokens: string[] = h.match(tokenize) ?? [];
  if (n.includes(" ")) {
    // Multi-word: fall back to substring but require space/punct boundary.
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(n)}([^a-z0-9]|$)`, "i");
    return re.test(h);
  }
  return tokens.includes(n);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasAny(haystack: Set<string>, needles: string[]): boolean {
  return needles.some((n) => {
    for (const h of haystack) {
      if (matchesNeedle(h, n)) return true;
    }
    return false;
  });
}

export interface ConflictHit {
  rule: ConflictRule;
  matchedA: string[];
  matchedB: string[];
}

/**
 * Find ingredient conflicts across a set of products.
 * `ingredientGroups` is a list of "ingredient sets" (one per product or slot).
 * If `sameSlotOnly` is relevant, it checks that a single group contains both sides.
 */
export function findConflicts(
  ingredientGroups: string[][],
  options?: { skinTags?: string[] }
): ConflictHit[] {
  const hits: ConflictHit[] = [];
  const allIngredients = new Set<string>();
  const perGroup = ingredientGroups.map((g) => new Set(g.map(norm)));
  perGroup.forEach((g) => g.forEach((v) => allIngredients.add(v)));
  (options?.skinTags ?? []).forEach((t) => allIngredients.add(`${norm(t)}-skin`));

  for (const rule of CONFLICT_RULES) {
    if (rule.sameSlotOnly) {
      const hit = perGroup.find(
        (g) => hasAny(g, rule.a) && hasAny(g, rule.b)
      );
      if (!hit) continue;
      hits.push({
        rule,
        matchedA: findMatches(hit, rule.a),
        matchedB: findMatches(hit, rule.b),
      });
    } else {
      if (hasAny(allIngredients, rule.a) && hasAny(allIngredients, rule.b)) {
        hits.push({
          rule,
          matchedA: findMatches(allIngredients, rule.a),
          matchedB: findMatches(allIngredients, rule.b),
        });
      }
    }
  }
  return hits;
}

function findMatches(haystack: Set<string>, needles: string[]): string[] {
  const out = new Set<string>();
  for (const n of needles) {
    for (const h of haystack) {
      if (matchesNeedle(h, n)) out.add(h);
    }
  }
  return Array.from(out);
}

/**
 * Lightweight sync scan of a single product's ingredient list against a
 * user's existing product ingredients. Returns any conflicts that would be
 * introduced by adding this product.
 */
export function conflictsWithNew(
  newIngredients: string[],
  existing: string[][],
  skinTags: string[] = []
): ConflictHit[] {
  return findConflicts([newIngredients, ...existing], { skinTags });
}
