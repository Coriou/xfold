import { buildInterestPipeline } from "@/lib/archive/insights/interest-pipeline";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface PipelineCardProps {
  readonly username: string;
  /** The interest name X assigned. */
  readonly interestName: string;
  /** Number of advertisers that used this interest. */
  readonly advertiserCount: number;
  /** Names of top advertisers (up to 5). */
  readonly topAdvertisers: readonly string[];
  /** Total ad impressions for this interest. */
  readonly adImpressions: number;
  /** Whether this led to an off-platform conversion. */
  readonly hasConversion: boolean;
  /** Whether the user ever mentioned this in tweets/likes. */
  readonly confirmedByBehavior: boolean;
  /** Total unconfirmed interests. */
  readonly totalUnconfirmed: number;
  /** Total interests that were monetized. */
  readonly totalMonetized: number;
}

export function computePipeline(ctx: ComputeContext): PipelineCardProps | null {
  const pipeline = buildInterestPipeline(ctx.archive);
  if (!pipeline) return null;

  // Pick the worst offender: unconfirmed + most ad impressions
  const worst = pipeline.entries.find(
    (e) => !e.confirmedByBehavior && e.advertiserCount > 0,
  );
  if (!worst) {
    // Fallback: most monetized, even if confirmed
    const mostMonetized = pipeline.entries.find((e) => e.advertiserCount > 0);
    if (!mostMonetized || mostMonetized.advertiserCount < 2) return null;
    return {
      username: ctx.archive.meta.username,
      interestName: truncate(mostMonetized.name, 40),
      advertiserCount: mostMonetized.advertiserCount,
      topAdvertisers: mostMonetized.topAdvertisers,
      adImpressions: mostMonetized.adImpressions,
      hasConversion: mostMonetized.hasConversion,
      confirmedByBehavior: mostMonetized.confirmedByBehavior,
      totalUnconfirmed: pipeline.unconfirmedCount,
      totalMonetized: pipeline.monetizedCount,
    };
  }

  return {
    username: ctx.archive.meta.username,
    interestName: truncate(worst.name, 40),
    advertiserCount: worst.advertiserCount,
    topAdvertisers: worst.topAdvertisers,
    adImpressions: worst.adImpressions,
    hasConversion: worst.hasConversion,
    confirmedByBehavior: worst.confirmedByBehavior,
    totalUnconfirmed: pipeline.unconfirmedCount,
    totalMonetized: pipeline.monetizedCount,
  };
}

export function computePipelineShareability(
  props: PipelineCardProps,
): ShareabilityScore {
  // Unconfirmed + monetized is the most specific/unique combo
  const unconfirmedBonus = props.confirmedByBehavior ? 0 : 30;
  const conversionBonus = props.hasConversion ? 15 : 0;

  return {
    magnitude: Math.min(
      100,
      props.advertiserCount * 5 + props.adImpressions / 10,
    ),
    specificity: Math.min(100, 60 + unconfirmedBonus + conversionBonus),
    uniqueness: 80, // This kind of cross-referenced data is rare
  };
}
