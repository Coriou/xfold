import { buildPlainEnglishSummary } from "@/lib/archive/insights/plain-english-summary";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface PlainEnglishCardProps {
  readonly username: string;
  readonly lines: readonly {
    readonly text: string;
    readonly severity: "info" | "warning" | "critical";
  }[];
  readonly sourcesUsed: number;
}

export function computePlainEnglish(
  ctx: ComputeContext,
): PlainEnglishCardProps | null {
  const summary = buildPlainEnglishSummary(ctx.archive);
  if (!summary || summary.lines.length < 3) return null;

  return {
    username: ctx.archive.meta.username,
    lines: summary.lines.slice(0, 7).map((l) => ({
      text: l.text,
      severity: l.severity,
    })),
    sourcesUsed: summary.sourcesUsed,
  };
}

export function computePlainEnglishShareability(
  props: PlainEnglishCardProps,
): ShareabilityScore {
  const criticalCount = props.lines.filter(
    (l) => l.severity === "critical",
  ).length;
  return {
    magnitude: Math.min(100, props.lines.length * 14),
    // Very high specificity — these are complete sentences about the user's data
    specificity: Math.min(100, 70 + criticalCount * 5),
    uniqueness: 95, // No other tool generates plain-English privacy summaries
  };
}
