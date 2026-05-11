"use client";

import { motion } from "framer-motion";
import {
  outcomeToTag,
  outcomeTone,
  type CohortInfo,
} from "@/lib/cohort";

interface CohortBadgeProps {
  /**
   * `undefined`  → loading (skeleton)
   * `null`       → nothing to show (sample too small / opted out) — render nothing
   * `CohortInfo` → render the 2-line pill
   */
  cohort: CohortInfo | null | undefined;
}

/**
 * Two-line cohort pill rendered under each identified product on /scan.
 *
 * Line 1: "84% positive · 23 reviews"
 * Line 2: "most common: caused breakouts" (toned)
 * Footer: cohort_label, or "based on all suki users" when is_fallback.
 */
export function CohortBadge({ cohort }: CohortBadgeProps) {
  if (cohort === undefined) {
    return (
      <motion.div
        aria-label="Loading cohort data"
        className="mt-2 h-3 w-32 rounded-full bg-accent/5"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }
  if (cohort === null) return null;

  const positiveTone =
    cohort.positive_pct >= 60
      ? "text-accent"
      : cohort.positive_pct <= 30
      ? "text-rose"
      : "text-foreground/70";

  const topTone = outcomeTone(cohort.top_outcome);
  const topToneClass =
    topTone === "positive"
      ? "text-accent"
      : topTone === "negative"
      ? "text-rose"
      : "text-foreground/65";

  const footer = cohort.is_fallback
    ? "based on all suki users"
    : cohort.cohort_label;

  return (
    <div className="mt-2 inline-flex flex-col gap-0.5 rounded-lg bg-accent/[0.04] border border-accent/15 px-2 py-1.5 max-w-full">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs font-semibold ${positiveTone}`}>
          {cohort.positive_pct}% positive
        </span>
        <span className="text-[10px] text-muted">·</span>
        <span className="text-[11px] text-muted">
          {cohort.sample_size} review{cohort.sample_size === 1 ? "" : "s"}
        </span>
      </div>
      <div className={`text-[11px] leading-snug ${topToneClass}`}>
        most common: {outcomeToTag(cohort.top_outcome)}
      </div>
      {footer && (
        <div className="text-[10px] text-muted/80 leading-snug">{footer}</div>
      )}
    </div>
  );
}
