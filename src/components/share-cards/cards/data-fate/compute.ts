import { computeDataFate } from "@/lib/archive/insights/data-fate";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface DataFateCardProps {
  readonly username: string;
  readonly retainedCount: number;
  readonly deletedCount: number;
  readonly totalCategories: number;
  readonly retainedPct: number;
  readonly summary: string;
  readonly topRetained: readonly {
    readonly icon: string;
    readonly label: string;
    readonly count: number;
    readonly unit: string;
    readonly verdict: string;
  }[];
}

export function computeDataFateCard(
  ctx: ComputeContext,
): DataFateCardProps | null {
  const result = computeDataFate(ctx.archive);
  if (result.entries.length < 3) return null;

  const retainedEntries = result.entries.filter(
    (e) => e.verdict === "retained" || e.verdict === "shared",
  );
  if (retainedEntries.length === 0) return null;

  const totalCategories = result.entries.length;
  const retainedPct = Math.round(
    (result.retainedCount / totalCategories) * 100,
  );

  return {
    username: ctx.archive.meta.username,
    retainedCount: result.retainedCount,
    deletedCount: result.deletedCount,
    totalCategories,
    retainedPct,
    summary: result.summary,
    topRetained: retainedEntries.slice(0, 5).map((e) => ({
      icon: e.icon,
      label: e.label,
      count: e.count,
      unit: e.unit,
      verdict: e.verdict === "shared" ? "Already shared" : "Retained by X",
    })),
  };
}

export function computeDataFateShareability(
  props: DataFateCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.retainedPct + 20),
    specificity: Math.min(100, 70 + props.topRetained.length * 6),
    uniqueness: 90, // "What happens when you leave" is a unique framing
  };
}
