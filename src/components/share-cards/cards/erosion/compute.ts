import { buildErosionTimeline } from "@/lib/archive/insights/erosion-timeline";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface ErosionCardProps {
  readonly username: string;
  /** Total data categories X collects. */
  readonly totalCategories: number;
  /** Years of data coverage. */
  readonly spanYears: number;
  /** Year-over-year layer labels (newest 5). */
  readonly recentLayers: readonly { label: string; year: string }[];
  /** Peak active layers (max in any year). */
  readonly peakLayers: number;
  /** The year with the most new layers added. */
  readonly worstYear: string;
  /** How many new categories in worst year. */
  readonly worstYearCount: number;
}

export function computeErosion(ctx: ComputeContext): ErosionCardProps | null {
  const timeline = buildErosionTimeline(ctx.archive);
  if (!timeline) return null;
  if (timeline.layers.length < 3) return null;

  // Find the year with the most new layers
  let worstYear = "";
  let worstYearCount = 0;
  let peakLayers = 0;
  for (const m of timeline.milestones) {
    if (m.newLayers.length > worstYearCount) {
      worstYear = m.year;
      worstYearCount = m.newLayers.length;
    }
    if (m.activeLayers > peakLayers) {
      peakLayers = m.activeLayers;
    }
  }

  // Get the 5 most recently added layers
  const recentLayers = timeline.layers
    .slice(-5)
    .reverse()
    .map((l) => ({
      label: l.label,
      year: l.firstSeen.slice(0, 4),
    }));

  return {
    username: ctx.archive.meta.username,
    totalCategories: timeline.totalCategories,
    spanYears: timeline.spanYears,
    recentLayers,
    peakLayers,
    worstYear,
    worstYearCount,
  };
}

export function computeErosionShareability(
  props: ErosionCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.totalCategories * 8),
    specificity: Math.min(100, 40 + props.spanYears * 5),
    uniqueness: 90, // No other tool visualizes privacy erosion over time
  };
}
