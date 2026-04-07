import { buildDataBrokerPipeline } from "@/lib/archive/insights/data-broker-pipeline";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface BrokerCardProps {
  readonly username: string;
  /** The most absurd broker label. */
  readonly label: string;
  /** Whether this label is confirmed by behavior. */
  readonly confirmed: boolean;
  /** Ad impressions driven by this label. */
  readonly adImpressions: number;
  /** Whether it led to an off-twitter conversion. */
  readonly linkedToConversion: boolean;
  /** Total data broker labels. */
  readonly totalLabels: number;
  /** Total unconfirmed labels. */
  readonly unconfirmedCount: number;
  /** Unconfirmed labels that advertisers targeted. */
  readonly unconfirmedButTargeted: number;
}

export function computeBroker(ctx: ComputeContext): BrokerCardProps | null {
  const stats = buildDataBrokerPipeline(ctx.archive);
  if (!stats || !stats.mostAbsurd) return null;

  const worst = stats.mostAbsurd;
  return {
    username: ctx.archive.meta.username,
    label: truncate(worst.label, 50),
    confirmed: worst.confirmedByBehavior,
    adImpressions: worst.adImpressions,
    linkedToConversion: worst.linkedToConversion,
    totalLabels: stats.totalLabels,
    unconfirmedCount: stats.unconfirmedCount,
    unconfirmedButTargeted: stats.unconfirmedButTargeted,
  };
}

export function computeBrokerShareability(
  props: BrokerCardProps,
): ShareabilityScore {
  const unconfirmedBonus = props.confirmed ? 0 : 30;
  const conversionBonus = props.linkedToConversion ? 15 : 0;

  return {
    magnitude: Math.min(
      100,
      props.totalLabels * 5 + props.unconfirmedCount * 3,
    ),
    specificity: Math.min(100, 65 + unconfirmedBonus + conversionBonus),
    uniqueness: 85, // Data broker exposure is extremely rare in consumer tools
  };
}
