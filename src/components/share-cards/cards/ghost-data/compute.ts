import { detectGhostData } from "@/lib/archive/insights/ghost-data";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface GhostDataCardProps {
  readonly username: string;
  readonly categoryCount: number;
  readonly criticalCount: number;
  /** Top 6 ghost data category labels for the visual checklist */
  readonly topLabels: readonly string[];
}

export function computeGhostData(
  ctx: ComputeContext,
): GhostDataCardProps | null {
  const categories = detectGhostData(ctx.archive);
  if (categories.length === 0) return null;

  return {
    username: ctx.archive.meta.username,
    categoryCount: categories.length,
    criticalCount: categories.filter((c) => c.severity === "critical").length,
    topLabels: categories.slice(0, 6).map((c) => c.headline),
  };
}

export function computeGhostDataShareability(
  props: GhostDataCardProps,
): ShareabilityScore {
  const magnitude = Math.min(100, (props.categoryCount / 8) * 100);
  const specificity = Math.min(100, props.criticalCount * 30);
  const uniqueness = 90; // Very unique framing — "X hid this data"

  return { magnitude, specificity, uniqueness };
}
