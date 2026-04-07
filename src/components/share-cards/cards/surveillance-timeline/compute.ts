import { buildSurveillanceTimeline } from "@/lib/archive/insights/surveillance-timeline";
import { formatDate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface SurveillanceTimelineCardProps {
  readonly username: string;
  readonly durationLabel: string;
  readonly milestoneCount: number;
  /** Top 8 milestones (date + icon + label) for display. */
  readonly milestones: readonly {
    readonly dateLabel: string;
    readonly icon: string;
    readonly label: string;
  }[];
}

export function computeSurveillanceTimeline(
  ctx: ComputeContext,
): SurveillanceTimelineCardProps | null {
  const timeline = buildSurveillanceTimeline(ctx.archive);
  if (!timeline || timeline.milestones.length < 3) return null;

  return {
    username: ctx.archive.meta.username,
    durationLabel: timeline.durationLabel,
    milestoneCount: timeline.milestones.length,
    milestones: timeline.milestones.slice(0, 8).map((m) => ({
      dateLabel: formatDate(m.date),
      icon: m.icon,
      label: m.label,
    })),
  };
}

export function computeSurveillanceTimelineShareability(
  props: SurveillanceTimelineCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.milestoneCount * 12),
    specificity: Math.min(100, 60 + props.milestoneCount * 5),
    uniqueness: 90, // Chronological surveillance timeline is very unique framing
  };
}
