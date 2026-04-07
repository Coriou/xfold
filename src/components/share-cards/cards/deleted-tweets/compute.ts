import type { ComputeContext, ShareabilityScore } from "../../types";

export interface DeletedTweetsCardProps {
  readonly username: string;
  readonly deletedCount: number;
  readonly activeCount: number;
  readonly percentOfTotal: number;
  readonly oldestDeletedDate: string | null;
}

export function computeDeletedTweets(
  ctx: ComputeContext,
): DeletedTweetsCardProps | null {
  const deleted = ctx.archive.deletedTweets;
  if (deleted.length === 0) return null;

  const active = ctx.archive.tweets.length;
  const total = deleted.length + active;
  const percent = total > 0 ? Math.round((deleted.length / total) * 100) : 0;

  // Find oldest deleted tweet date
  let oldest: string | null = null;
  for (const t of deleted) {
    if (t.createdAt && (!oldest || t.createdAt < oldest)) {
      oldest = t.createdAt;
    }
  }

  return {
    username: ctx.archive.meta.username,
    deletedCount: deleted.length,
    activeCount: active,
    percentOfTotal: percent,
    oldestDeletedDate: oldest,
  };
}

export function computeDeletedTweetsShareability(
  props: DeletedTweetsCardProps,
): ShareabilityScore {
  // Deleted tweets are inherently shocking — high base shareability
  const magnitude = Math.min(100, (props.deletedCount / 500) * 100);
  // Percentage makes it more personal/specific
  const specificity = Math.min(100, props.percentOfTotal * 2);
  // Always unique — most people don't know X keeps deleted tweets
  const uniqueness = 85;

  return { magnitude, specificity, uniqueness };
}
