import { buildDeletionTimeline } from "@/lib/archive/insights/deletion-timeline";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface DataBetrayalCardProps {
  readonly username: string;
  /** Total deleted tweets retained by X. */
  readonly deletedCount: number;
  /** How long X has kept the oldest "deleted" tweet, in days. */
  readonly longestRetentionDays: number;
  /** Human-readable retention label, e.g. "4 years, 2 months". */
  readonly retentionLabel: string;
  /** Topics the user fully erased (only exist in deleted tweets). */
  readonly fullyErasedCount: number;
  /** Deletion rate as a percentage. */
  readonly deletionRate: number;
}

function formatRetention(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (parts.length === 0) parts.push(`${days} days`);
  return parts.join(", ");
}

export function computeDataBetrayal(
  ctx: ComputeContext,
): DataBetrayalCardProps | null {
  const timeline = buildDeletionTimeline(ctx.archive);
  if (!timeline) return null;
  if (!timeline.longestRetentionDays || timeline.longestRetentionDays < 30)
    return null;

  const deleted = ctx.archive.deletedTweets.length;
  if (deleted < 5) return null;

  return {
    username: ctx.archive.meta.username,
    deletedCount: deleted,
    longestRetentionDays: timeline.longestRetentionDays,
    retentionLabel: formatRetention(timeline.longestRetentionDays),
    fullyErasedCount: timeline.fullyErasedCount,
    deletionRate: timeline.deletionRate,
  };
}

export function computeDataBetrayalShareability(
  props: DataBetrayalCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.deletedCount / 5),
    specificity: Math.min(100, (props.longestRetentionDays / 365) * 30 + 40),
    uniqueness: 90, // Very few tools surface this
  };
}
