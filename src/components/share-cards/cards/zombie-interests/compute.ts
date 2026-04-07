import { buildZombieInterests } from "@/lib/archive/insights/zombie-interests";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface ZombieCardProps {
  readonly username: string;
  /** The zombie interest name (the worst one). */
  readonly interestName: string;
  /** Number of ad impressions after the interest was disabled. */
  readonly adImpressions: number;
  /** Number of advertisers who used this disabled interest. */
  readonly advertiserCount: number;
  /** Top advertiser names (up to 3). */
  readonly topAdvertisers: readonly string[];
  /** Total disabled interests. */
  readonly totalDisabled: number;
  /** Total zombie interests (disabled but still monetized). */
  readonly zombieCount: number;
  /** Total impressions across all zombie interests. */
  readonly totalZombieImpressions: number;
}

export function computeZombie(ctx: ComputeContext): ZombieCardProps | null {
  const stats = buildZombieInterests(ctx.archive);
  if (!stats || !stats.worstZombie) return null;

  const worst = stats.worstZombie;
  return {
    username: ctx.archive.meta.username,
    interestName: truncate(worst.name, 40),
    adImpressions: worst.adImpressions,
    advertiserCount: worst.advertiserCount,
    topAdvertisers: worst.topAdvertisers,
    totalDisabled: stats.totalDisabled,
    zombieCount: stats.zombieCount,
    totalZombieImpressions: stats.totalZombieImpressions,
  };
}

export function computeZombieShareability(
  props: ZombieCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.zombieCount * 10 + props.adImpressions / 5),
    specificity: Math.min(100, 70 + (props.advertiserCount > 3 ? 20 : 0)),
    uniqueness: 90, // Very few tools expose this contradiction
  };
}
