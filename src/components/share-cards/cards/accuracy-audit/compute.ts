import { buildAccuracyAudit } from "@/lib/archive/insights/accuracy-audit";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface AccuracyAuditCardProps {
  readonly username: string;
  /** "X got N% wrong" — the headline number. */
  readonly wrongPercent: number;
  readonly totalAudited: number;
  readonly confirmedCount: number;
  readonly wrongCount: number;
  readonly boughtCount: number;
  /** Up to 4 wrong interests as concrete examples. */
  readonly wrongExamples: readonly string[];
  /** Up to 2 confirmed interests for balance. */
  readonly confirmedExamples: readonly string[];
}

export function computeAccuracyAudit(
  ctx: ComputeContext,
): AccuracyAuditCardProps | null {
  const audit = buildAccuracyAudit(ctx.archive);
  if (!audit || audit.totalAudited < 10) return null;
  // Only interesting if there's a meaningful wrong percentage
  if (audit.wrongPercent < 15) return null;

  return {
    username: ctx.archive.meta.username,
    wrongPercent: audit.wrongPercent,
    totalAudited: audit.totalAudited,
    confirmedCount: audit.confirmedCount,
    wrongCount: audit.wrongCount,
    boughtCount: audit.boughtCount,
    wrongExamples: audit.topWrong.slice(0, 4).map((e) => e.name),
    confirmedExamples: audit.topConfirmed.slice(0, 2).map((e) => e.name),
  };
}

export function computeAccuracyAuditShareability(
  props: AccuracyAuditCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, (props.wrongPercent / 80) * 100),
    // Very high specificity — concrete wrong/right examples from archive
    specificity: Math.min(
      100,
      70 + props.wrongExamples.length * 5 + props.confirmedExamples.length * 3,
    ),
    uniqueness: 92, // "How wrong is the algorithm" is a unique framing
  };
}
