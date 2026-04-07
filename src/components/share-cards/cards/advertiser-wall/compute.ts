import { buildAdvertiserStats } from "@/lib/archive/insights/advertiser-stats";
import type { ComputeContext } from "../../types";

export interface AdvertiserWallCardProps {
  readonly username: string;
  readonly uniqueAdvertisers: number;
  readonly targetingTypeCount: number;
  /** Top advertiser display names, capped at 12 for the credits grid. */
  readonly names: readonly string[];
}

const MIN_ADVERTISERS_TO_FEATURE = 5;

export function computeAdvertiserWall(
  ctx: ComputeContext,
): AdvertiserWallCardProps | null {
  const stats = buildAdvertiserStats(ctx.archive, 12);
  if (stats.uniqueAdvertisers < MIN_ADVERTISERS_TO_FEATURE) return null;

  const names = stats.top
    .map((a) => a.name || a.screenName)
    .filter((n) => n.length > 0);

  return {
    username: ctx.archive.meta.username,
    uniqueAdvertisers: stats.uniqueAdvertisers,
    targetingTypeCount: stats.targetingTypes.length,
    names,
  };
}

export function computeAdvertiserWallShareability(
  props: AdvertiserWallCardProps,
): number {
  // 300 advertisers caps it. The more brands targeted you, the more shareable.
  return Math.round(Math.min(100, (props.uniqueAdvertisers / 300) * 100));
}
