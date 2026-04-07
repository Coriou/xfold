import { buildDeletionLie } from "@/lib/archive/insights/deletion-lie";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface DeletionLieCardProps {
  readonly username: string;
  /** The topic name that survived deletion. */
  readonly topicName: string;
  /** How many deleted tweets mentioned this topic. */
  readonly deletedMentions: number;
  /** How many active tweets mention it (0 = fully erased from public). */
  readonly activeMentions: number;
  /** Number of ad impressions targeting this topic. */
  readonly adImpressions: number;
  /** Whether the user also disabled this interest (double betrayal). */
  readonly isDisabled: boolean;
  /** Total topics from deleted tweets still in the interest profile. */
  readonly survivingTopicCount: number;
  /** Topics that exist ONLY in deleted tweets. */
  readonly fullyErasedButProfiled: number;
  /** Total deleted tweets in the archive. */
  readonly totalDeleted: number;
}

export function computeDeletionLie(
  ctx: ComputeContext,
): DeletionLieCardProps | null {
  const stats = buildDeletionLie(ctx.archive);
  if (!stats || !stats.worstCase) return null;

  const worst = stats.worstCase;
  return {
    username: ctx.archive.meta.username,
    topicName: truncate(worst.interestName, 40),
    deletedMentions: worst.deletedMentions,
    activeMentions: worst.activeMentions,
    adImpressions: worst.adImpressions,
    isDisabled: worst.isDisabled,
    survivingTopicCount: stats.survivingTopicCount,
    fullyErasedButProfiled: stats.fullyErasedButProfiled,
    totalDeleted: stats.totalDeleted,
  };
}

export function computeDeletionLieShareability(
  props: DeletionLieCardProps,
): ShareabilityScore {
  const erasedBonus = props.activeMentions === 0 ? 25 : 0;
  const disabledBonus = props.isDisabled ? 10 : 0;
  const adBonus = props.adImpressions > 0 ? 15 : 0;

  return {
    magnitude: Math.min(
      100,
      props.deletedMentions * 5 + props.survivingTopicCount * 8,
    ),
    specificity: Math.min(100, 60 + erasedBonus + disabledBonus + adBonus),
    uniqueness: 95, // Almost no privacy tool exposes this
  };
}
