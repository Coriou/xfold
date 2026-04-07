import { buildAdPriceTag } from "@/lib/archive/insights/ad-price-tag";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface AdPriceTagCardProps {
  readonly username: string;
  /** Formatted total revenue string. */
  readonly totalRevenue: string;
  /** Raw revenue for scoring. */
  readonly rawRevenue: number;
  /** Number of advertisers. */
  readonly uniqueAdvertisers: number;
  /** Total impressions. */
  readonly totalImpressions: number;
  /** The most expensive targeting method. */
  readonly mostExpensiveMethod: string | null;
  /** Name of biggest spender. */
  readonly biggestSpender: string | null;
  /** What biggest spender estimated spent. */
  readonly biggestSpenderAmount: string | null;
  /** Revenue breakdown by category as label + percentage pairs. */
  readonly breakdown: readonly {
    readonly label: string;
    readonly pct: number;
  }[];
}

export function computeAdPriceTag(
  ctx: ComputeContext,
): AdPriceTagCardProps | null {
  const priceTag = buildAdPriceTag(ctx.archive);
  if (!priceTag) return null;
  if (priceTag.totalImpressions < 5) return null;

  return {
    username: ctx.archive.meta.username,
    totalRevenue: formatCurrency(priceTag.estimatedRevenue),
    rawRevenue: priceTag.estimatedRevenue,
    uniqueAdvertisers: priceTag.uniqueAdvertisers,
    totalImpressions: priceTag.totalImpressions,
    mostExpensiveMethod: priceTag.mostExpensiveMethod?.method ?? null,
    biggestSpender: priceTag.biggestSpender?.name ?? null,
    biggestSpenderAmount: priceTag.biggestSpender
      ? formatCurrency(priceTag.biggestSpender.estimatedSpend)
      : null,
    breakdown: priceTag.categoryBreakdown.slice(0, 3).map((c) => ({
      label: c.category,
      pct: Math.round(c.percentage),
    })),
  };
}

export function computeAdPriceTagShareability(
  props: AdPriceTagCardProps,
): ShareabilityScore {
  // Dollar amounts are inherently engaging and shareable
  return {
    magnitude: Math.min(100, props.rawRevenue * 10), // $10 = 100
    specificity: 90, // It's personalized: your dollar amount, your advertisers
    uniqueness: 90, // No other tool shows this
  };
}

function formatCurrency(amount: number): string {
  if (amount < 0.01) return "$0.00";
  return `$${amount.toFixed(2)}`;
}
