import { buildAdvertiserStats } from "@/lib/archive/insights/advertiser-stats";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface AdvertiserWallCardProps {
  readonly username: string;
  readonly uniqueAdvertisers: number;
  readonly targetingTypeCount: number;
  /** Top advertiser display names, capped at 12 for the credits grid. */
  readonly names: readonly string[];
  /** Contextual benchmark line, e.g. "3× the typical active user". */
  readonly benchmarkLine: string | null;
}

const MIN_ADVERTISERS_TO_FEATURE = 5;

/**
 * Rough median for an active X user based on public ad-transparency reports.
 * Conservative estimate — most users see 30-80 unique advertisers.
 */
const TYPICAL_ADVERTISER_COUNT = 50;

export function computeAdvertiserWall(
  ctx: ComputeContext,
): AdvertiserWallCardProps | null {
  const stats = buildAdvertiserStats(ctx.archive, 12);
  if (stats.uniqueAdvertisers < MIN_ADVERTISERS_TO_FEATURE) return null;

  const names = stats.top
    .map((a) => a.name || a.screenName)
    .filter((n) => n.length > 0);

  const ratio = stats.uniqueAdvertisers / TYPICAL_ADVERTISER_COUNT;
  const benchmarkLine =
    ratio >= 2
      ? `${Math.round(ratio)}× the typical active user`
      : ratio >= 1.3
        ? "above average for an active X user"
        : null;

  return {
    username: ctx.archive.meta.username,
    uniqueAdvertisers: stats.uniqueAdvertisers,
    targetingTypeCount: stats.targetingTypes.length,
    names,
    benchmarkLine,
  };
}

export function computeAdvertiserWallShareability(
  props: AdvertiserWallCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, (props.uniqueAdvertisers / 300) * 100),
    // Named advertisers make it specific and quotable
    specificity: Math.min(100, 40 + props.names.length * 5),
    uniqueness: 70, // Advertiser wall format is fairly unique to xfold
  };
}
