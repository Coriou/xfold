import { buildAdvertiserProspectus } from "@/lib/archive/insights/advertiser-prospectus";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface ProspectusCardProps {
  readonly username: string;
  /** Top hidden demographic slots (up to 5). */
  readonly demographics: readonly { category: string; value: string }[];
  /** Custom audience membership count. */
  readonly customAudiences: number;
  /** Lookalike audience count. */
  readonly lookalikes: number;
  /** Data broker label count. */
  readonly brokerLabels: number;
  /** Off-twitter conversion count. */
  readonly conversions: number;
  /** Total unique advertisers. */
  readonly totalAdvertisers: number;
  /** Total distinct data categories shared with advertisers. */
  readonly dataPointCount: number;
  /** Top advertised interests (up to 5). */
  readonly topInterests: readonly string[];
}

export function computeProspectus(
  ctx: ComputeContext,
): ProspectusCardProps | null {
  const prospectus = buildAdvertiserProspectus(ctx.archive);
  if (!prospectus || prospectus.dataPointCount < 2) return null;

  const demographics = prospectus.demographics.slice(0, 5).map((d) => ({
    category: d.category,
    value: d.values[0] ?? "Unknown",
  }));

  return {
    username: ctx.archive.meta.username,
    demographics,
    customAudiences: prospectus.customAudienceCount,
    lookalikes: prospectus.lookalikeCount,
    brokerLabels: prospectus.brokerLabels.length,
    conversions: prospectus.conversionCount,
    totalAdvertisers: prospectus.totalAdvertisers,
    dataPointCount: prospectus.dataPointCount,
    topInterests: prospectus.topTargetedInterests.slice(0, 5),
  };
}

export function computeProspectusShareability(
  props: ProspectusCardProps,
): ShareabilityScore {
  const hasDemos = props.demographics.length >= 2;
  const hasAudiences = props.customAudiences + props.lookalikes >= 3;

  return {
    magnitude: Math.min(
      100,
      props.dataPointCount * 10 + props.totalAdvertisers / 5,
    ),
    specificity: Math.min(
      100,
      (hasDemos ? 50 : 20) +
        (hasAudiences ? 30 : 0) +
        (props.conversions > 0 ? 20 : 0),
    ),
    uniqueness: 88, // A complete advertiser-facing dossier is extremely rare
  };
}
