import { buildAccuracyAudit } from "@/lib/archive/insights/accuracy-audit";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface AccuracyAuditCardProps {
  readonly username: string;
  /** Share of interests with no behavioral evidence (0–100). The headline. */
  readonly unconfirmedPercent: number;
  /** Share of interests confirmed by the user's own tweets/likes (0–100). */
  readonly confirmedPercent: number;
  readonly totalAudited: number;
  readonly confirmedCount: number;
  readonly unconfirmedCount: number;
  readonly boughtCount: number;
  /** Up to 4 unconfirmed interests as concrete examples. */
  readonly unconfirmedExamples: readonly string[];
  /** Up to 2 confirmed interests for balance. */
  readonly confirmedExamples: readonly string[];
}

export function computeAccuracyAudit(
  ctx: ComputeContext,
): AccuracyAuditCardProps | null {
  const audit = buildAccuracyAudit(ctx.archive);
  if (!audit || audit.totalAudited < 10) return null;
  // Only show the card if there's a meaningful unconfirmed pile.
  // Threshold is on the new denominator (which uses *all* interests),
  // so 25% means roughly 1 in 4 inferences has no behavioral backing.
  if (audit.unconfirmedPercent < 25) return null;

  return {
    username: ctx.archive.meta.username,
    unconfirmedPercent: audit.unconfirmedPercent,
    confirmedPercent: audit.confirmedPercent,
    totalAudited: audit.totalAudited,
    confirmedCount: audit.confirmedCount,
    unconfirmedCount: audit.unconfirmedCount,
    boughtCount: audit.boughtCount,
    unconfirmedExamples: audit.topUnconfirmed.slice(0, 4).map((e) => e.name),
    confirmedExamples: audit.topConfirmed.slice(0, 2).map((e) => e.name),
  };
}

export function computeAccuracyAuditShareability(
  props: AccuracyAuditCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, (props.unconfirmedPercent / 80) * 100),
    // Very high specificity — concrete unconfirmed/confirmed examples
    specificity: Math.min(
      100,
      70 +
        props.unconfirmedExamples.length * 5 +
        props.confirmedExamples.length * 3,
    ),
    uniqueness: 90, // "How much of the algorithm's profile has evidence" framing
  };
}
