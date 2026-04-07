// ---------------------------------------------------------------------------
// Ad Price Tag — "What you're worth to advertisers"
// ---------------------------------------------------------------------------
//
// Estimates the ad revenue X earned from impressions shown to this user,
// using public CPM (cost per thousand impressions) benchmarks by targeting
// type. More sophisticated targeting costs more.
//
// The estimate is intentionally conservative — it only counts what's in
// the archive. Real revenue is higher since the archive only covers a
// window of time and misses programmatic/exchange inventory.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildAdvertiserStats } from "./advertiser-stats";

// --- Types ------------------------------------------------------------------

export interface AdPriceTag {
  /** Total estimated revenue in USD. */
  readonly estimatedRevenue: number;
  /** Revenue per year on X. */
  readonly revenuePerYear: number;
  /** Revenue per day (averaged). */
  readonly revenuePerDay: number;
  /** Total impressions counted. */
  readonly totalImpressions: number;
  /** Total engagements. */
  readonly totalEngagements: number;
  /** Unique advertisers. */
  readonly uniqueAdvertisers: number;
  /** The most expensive targeting method used on this user. */
  readonly mostExpensiveMethod: TargetingMethodValue | null;
  /** Breakdown by targeting type with estimated cost. */
  readonly methodBreakdown: readonly TargetingMethodValue[];
  /** The single advertiser that spent the most on reaching this user. */
  readonly biggestSpender: BiggestSpender | null;
  /** How many years of data this estimate covers. */
  readonly yearsOfData: number;
  /** Estimated revenue from each major category. */
  readonly categoryBreakdown: readonly CategoryRevenue[];
}

export interface TargetingMethodValue {
  readonly method: string;
  /** Estimated CPM for this targeting type. */
  readonly estimatedCpm: number;
  /** Number of impressions using this targeting type. */
  readonly impressions: number;
  /** Estimated revenue from this method. */
  readonly estimatedRevenue: number;
}

export interface BiggestSpender {
  readonly name: string;
  readonly screenName: string;
  readonly impressions: number;
  readonly estimatedSpend: number;
}

export interface CategoryRevenue {
  readonly category: string;
  readonly revenue: number;
  readonly percentage: number;
}

// --- CPM benchmarks (USD) ---------------------------------------------------
//
// Based on publicly available X/Twitter advertising CPM data (2024-2026).
// Custom audience and look-alike targeting commands premium rates.
// These are conservative mid-range estimates.

const CPM_BY_TARGETING_TYPE: Record<string, number> = {
  // Premium targeting (advertiser-specific data)
  List: 8.0, // Custom audience lists
  "Follower look-alikes": 7.0,
  "Website Activity": 9.0, // Retargeting / pixel
  "App Activity": 6.5,
  "App Activity Combination": 7.0,

  // Behavioral / intent targeting
  "Conversation topics": 4.5,
  Keywords: 4.0,
  Interests: 3.5,
  "Movies and TV shows": 3.0,

  // Demographic targeting
  Age: 2.5,
  Gender: 2.0,
  Locations: 2.5,
  Languages: 2.0,
  Platforms: 1.5,
  "OS versions": 1.5,

  // Unknown / catch-all
  Unknown: 2.0,
};

const DEFAULT_CPM = 2.5;

// --- Builder ----------------------------------------------------------------

export function buildAdPriceTag(archive: ParsedArchive): AdPriceTag | null {
  const totalImpressions = archive.adImpressions.reduce(
    (sum, batch) => sum + batch.impressions.length,
    0,
  );
  if (totalImpressions === 0) return null;

  // Count impressions per targeting type and compute estimated revenue
  const methodMap = new Map<string, { impressions: number; cpm: number }>();

  // Track per-advertiser impression counts for biggest spender
  const advertiserImpressions = new Map<
    string,
    { name: string; screenName: string; count: number }
  >();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      // Track advertiser
      const advKey = imp.advertiserScreenName || imp.advertiserName;
      const advEntry = advertiserImpressions.get(advKey);
      if (advEntry) {
        advEntry.count++;
      } else {
        advertiserImpressions.set(advKey, {
          name: imp.advertiserName,
          screenName: imp.advertiserScreenName,
          count: 1,
        });
      }

      // For each impression, find the highest-value targeting method used
      // (advertisers pay for the combination, but we attribute to the premium method)
      let highestCpm = DEFAULT_CPM;
      let highestMethod = "General";

      for (const crit of imp.targetingCriteria) {
        const cpm = CPM_BY_TARGETING_TYPE[crit.targetingType] ?? DEFAULT_CPM;
        if (cpm > highestCpm) {
          highestCpm = cpm;
          highestMethod = crit.targetingType;
        }
      }

      const existing = methodMap.get(highestMethod);
      if (existing) {
        existing.impressions++;
      } else {
        methodMap.set(highestMethod, { impressions: 1, cpm: highestCpm });
      }
    }
  }

  // Build method breakdown
  const methodBreakdown: TargetingMethodValue[] = [...methodMap.entries()]
    .map(([method, data]) => ({
      method,
      estimatedCpm: data.cpm,
      impressions: data.impressions,
      estimatedRevenue: (data.impressions / 1000) * data.cpm,
    }))
    .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

  const estimatedRevenue = methodBreakdown.reduce(
    (sum, m) => sum + m.estimatedRevenue,
    0,
  );

  // Account age for per-year/per-day calculation
  const createdAt = archive.account?.createdAt ?? null;
  const createdDate = createdAt ? parseDate(createdAt) : null;
  const daysSinceCreation = createdDate
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 365; // fallback to 1 year

  const yearsOfData = daysSinceCreation / 365;
  const revenuePerYear = estimatedRevenue / Math.max(1, yearsOfData);
  const revenuePerDay = estimatedRevenue / daysSinceCreation;

  // Most expensive targeting method
  const mostExpensiveMethod = methodBreakdown[0] ?? null;

  // Biggest spender
  let biggestSpender: BiggestSpender | null = null;
  let maxImps = 0;
  for (const adv of advertiserImpressions.values()) {
    if (adv.count > maxImps) {
      maxImps = adv.count;
      // Estimate what this advertiser spent using average CPM
      const avgCpm = (estimatedRevenue / totalImpressions) * 1000;
      biggestSpender = {
        name: adv.name,
        screenName: adv.screenName,
        impressions: adv.count,
        estimatedSpend: (adv.count / 1000) * avgCpm,
      };
    }
  }

  // Category breakdown
  const categories = new Map<string, number>();
  for (const m of methodBreakdown) {
    const cat = categorizeMethod(m.method);
    categories.set(cat, (categories.get(cat) ?? 0) + m.estimatedRevenue);
  }
  const categoryBreakdown: CategoryRevenue[] = [...categories.entries()]
    .map(([category, revenue]) => ({
      category,
      revenue,
      percentage: estimatedRevenue > 0 ? (revenue / estimatedRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const adStats = buildAdvertiserStats(archive);

  return {
    estimatedRevenue,
    revenuePerYear,
    revenuePerDay,
    totalImpressions,
    totalEngagements: adStats.totalEngagements,
    uniqueAdvertisers: adStats.uniqueAdvertisers,
    mostExpensiveMethod,
    methodBreakdown,
    biggestSpender,
    yearsOfData,
    categoryBreakdown,
  };
}

// --- Helpers ----------------------------------------------------------------

function categorizeMethod(method: string): string {
  switch (method) {
    case "List":
    case "Follower look-alikes":
    case "Website Activity":
    case "App Activity":
    case "App Activity Combination":
      return "Your data (audiences & retargeting)";
    case "Conversation topics":
    case "Keywords":
    case "Interests":
    case "Movies and TV shows":
      return "Your behavior (interests & topics)";
    case "Age":
    case "Gender":
    case "Locations":
    case "Languages":
      return "Your demographics";
    default:
      return "Platform targeting";
  }
}
