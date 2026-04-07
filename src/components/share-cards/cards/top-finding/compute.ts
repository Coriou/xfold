import {
  computeTopFindings,
  type TopFinding,
} from "@/lib/archive/insights/top-findings";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface TopFindingCardProps {
  readonly username: string;
  /** The #1 finding's hook text. */
  readonly hook: string;
  /** The #1 finding's detail. */
  readonly detail: string;
  /** Severity for visual treatment. */
  readonly severity: TopFinding["severity"];
  /** Category label. */
  readonly category: string;
  /** Total findings discovered across the archive. */
  readonly totalFindings: number;
  /** How many are critical. */
  readonly criticalCount: number;
  /** How many are high. */
  readonly highCount: number;
}

export function computeTopFinding(
  ctx: ComputeContext,
): TopFindingCardProps | null {
  const findings = computeTopFindings(ctx.archive);
  if (findings.length === 0) return null;

  const top = findings[0];
  if (!top) return null;

  return {
    username: ctx.archive.meta.username,
    hook: truncate(top.hook, 120),
    detail: truncate(top.detail, 140),
    severity: top.severity,
    category: top.category,
    totalFindings: findings.length,
    criticalCount: findings.filter((f) => f.severity === "critical").length,
    highCount: findings.filter((f) => f.severity === "high").length,
  };
}

export function computeTopFindingShareability(
  props: TopFindingCardProps,
): ShareabilityScore {
  // Cross-data findings are the #1 differentiator — pump specificity and uniqueness
  const severityBonus =
    props.severity === "critical" ? 30 : props.severity === "high" ? 15 : 0;

  return {
    magnitude: Math.min(100, props.totalFindings * 10 + severityBonus),
    specificity: Math.min(100, 70 + severityBonus), // Real quoted finding text
    uniqueness: 95, // No other tool surfaces these cross-data insights
  };
}
