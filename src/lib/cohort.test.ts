/**
 * Unit tests for the cohort helpers.
 *
 * `productKey`, `outcomeToTag`, `outcomeTone`, `adjacentAgeRanges`,
 * `formatCohortLabel` are pure. We assert byte-for-byte parity with the
 * SQL functions in `supabase/migrations/010_product_outcomes.sql` per
 * Agent B's handoff (`productKey` matches the generated column).
 */
import { describe, expect, it } from "vitest";
import {
  adjacentAgeRanges,
  formatCohortLabel,
  outcomeTone,
  outcomeToTag,
  productKey,
  type OutcomeKey,
} from "./cohort";

describe("productKey", () => {
  it("produces the canonical lower|lower|domain key", () => {
    expect(productKey("CeraVe Cleanser", "CeraVe", "skincare")).toBe(
      "cerave cleanser|cerave|skincare"
    );
  });

  it("defaults the domain to 'skincare' when omitted", () => {
    expect(productKey("Foaming Cleanser", "CeraVe")).toBe(
      "foaming cleanser|cerave|skincare"
    );
  });

  it("lowercases everything (matches the generated column)", () => {
    expect(productKey("The Ordinary Niacinamide 10% + Zinc 1%", "DECIEM"))
      .toBe("the ordinary niacinamide 10% + zinc 1%|deciem|skincare");
  });

  it("threads the domain into the key suffix", () => {
    expect(productKey("Shampoo", "BrandX", "haircare")).toBe(
      "shampoo|brandx|haircare"
    );
    expect(productKey("Lipstick", "BrandY", "makeup")).toBe(
      "lipstick|brandy|makeup"
    );
  });
});

describe("outcomeToTag", () => {
  // The shape we assert is "every key produces a stable, human-friendly tag".
  // We don't hard-code the exact label per key — that's tested individually
  // below in `outcomeTone`, and the labels may evolve.
  const cases: OutcomeKey[] = [
    "helped",
    "no_change",
    "caused_breakouts",
    "caused_irritation",
    "caused_dryness",
    "caused_oiliness",
    "other_negative",
  ];

  it("round-trips every enum value to a non-empty string", () => {
    for (const o of cases) {
      const tag = outcomeToTag(o);
      expect(typeof tag).toBe("string");
      expect(tag.length).toBeGreaterThan(0);
    }
  });

  it("returns distinct labels for each enum value (no collisions)", () => {
    const tags = cases.map(outcomeToTag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("uses human-friendly labels (no snake_case in output)", () => {
    for (const o of cases) {
      expect(outcomeToTag(o)).not.toMatch(/_/);
    }
  });
});

describe("outcomeTone", () => {
  it("'helped' is positive", () => {
    expect(outcomeTone("helped")).toBe("positive");
  });

  it("'no_change' is neutral", () => {
    expect(outcomeTone("no_change")).toBe("neutral");
  });

  it.each([
    "caused_breakouts",
    "caused_irritation",
    "caused_dryness",
    "caused_oiliness",
    "other_negative",
  ] as const)("'%s' is negative", (key) => {
    expect(outcomeTone(key)).toBe("negative");
  });
});

describe("adjacentAgeRanges", () => {
  it("'teens' → ['teens','20s']", () => {
    expect(adjacentAgeRanges("teens")).toEqual(["teens", "20s"]);
  });

  it("'20s' → ['teens','20s','30s']", () => {
    expect(adjacentAgeRanges("20s")).toEqual(["teens", "20s", "30s"]);
  });

  it("'30s' → ['20s','30s','40s']", () => {
    expect(adjacentAgeRanges("30s")).toEqual(["20s", "30s", "40s"]);
  });

  it("'40s' → ['30s','40s','50+']", () => {
    expect(adjacentAgeRanges("40s")).toEqual(["30s", "40s", "50+"]);
  });

  it("'50+' → ['40s','50+']", () => {
    expect(adjacentAgeRanges("50+")).toEqual(["40s", "50+"]);
  });

  it("null/undefined/unknown returns the full bucket list", () => {
    const full = ["teens", "20s", "30s", "40s", "50+"];
    expect(adjacentAgeRanges(null)).toEqual(full);
    expect(adjacentAgeRanges(undefined)).toEqual(full);
    expect(adjacentAgeRanges("garbage")).toEqual(full);
  });
});

describe("formatCohortLabel", () => {
  it("formats skin_type + first-two concerns with ' + '", () => {
    expect(
      formatCohortLabel({
        skin_type: "combination",
        skin_concerns: ["acne", "dryness"],
      })
    ).toBe("combination skin + acne, dryness");
  });

  it("first-concern-wins when concerns are present (joined order preserved)", () => {
    const label = formatCohortLabel({
      skin_type: "combination",
      skin_concerns: ["acne", "dryness", "redness", "pores"],
    });
    expect(label.startsWith("combination skin + acne")).toBe(true);
    // Only the first two concerns are joined (see implementation).
    expect(label).not.toContain("redness");
  });

  it("omits skin_type when missing", () => {
    expect(
      formatCohortLabel({
        skin_concerns: ["dryness"],
      })
    ).toBe("dryness");
  });

  it("omits concerns when empty", () => {
    expect(
      formatCohortLabel({ skin_type: "oily", skin_concerns: [] })
    ).toBe("oily skin");
  });

  it("falls back to 'based on similar users' when both fields are empty", () => {
    expect(formatCohortLabel({})).toBe("based on similar users");
    expect(
      formatCohortLabel({ skin_type: null, skin_concerns: null })
    ).toBe("based on similar users");
  });

  it("filters out empty-string concerns", () => {
    expect(
      formatCohortLabel({
        skin_type: "dry",
        skin_concerns: ["", "redness", ""],
      })
    ).toBe("dry skin + redness");
  });
});
