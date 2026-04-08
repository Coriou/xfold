// ---------------------------------------------------------------------------
// Ad Price Tag — "What you're worth to advertisers"
// ---------------------------------------------------------------------------
//
// IMPORTANT: every monetary number in this module is an ESTIMATE, not a
// fact. X never publishes per-user revenue; we model it from publicly
// reported CPM ranges (cost per thousand impressions) by targeting type.
// All consumer UI built on top of this should label the numbers as
// "estimated" and ideally show a confidence range, because the underlying
// CPM table can be off by ±50% depending on advertiser, season, and
// auction dynamics.
//
// CPM source: published estimates from third-party ad-buying analyses
// (HubSpot, WebFX, AdExpresso reports 2023-2024). These are mid-range
// guesses for the *category*, not X-specific rate cards.
//
// The model is intentionally conservative on coverage — it only counts
// what's in the archive. Real revenue is higher since the archive misses
// programmatic exchange inventory and only covers a time window.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildAdvertiserStats } from "./advertiser-stats";
import { getReferenceDate } from "@/lib/archive/account-summary";

// --- Types ------------------------------------------------------------------

export interface AdPriceTag {
  /** Estimated total revenue in USD (mid-point of the CPM model). */
  readonly estimatedRevenue: number;
  /** Conservative low end of the revenue estimate (CPM × 0.5). */
  readonly estimatedRevenueLow: number;
  /** Aggressive high end of the revenue estimate (CPM × 1.5). */
  readonly estimatedRevenueHigh: number;
  /** Estimated revenue per year on X (mid-point). */
  readonly revenuePerYear: number;
  /** Estimated revenue per day, averaged (mid-point). */
  readonly revenuePerDay: number;
  /** Total impressions counted (this is an exact count, not an estimate). */
  readonly totalImpressions: number;
  /** Total engagements (exact count). */
  readonly totalEngagements: number;
  /** Unique advertisers (exact count). */
  readonly uniqueAdvertisers: number;
  /** The most expensive targeting method used on this user. */
  readonly mostExpensiveMethod: TargetingMethodValue | null;
  /** Breakdown by targeting type with estimated cost. */
  readonly methodBreakdown: readonly TargetingMethodValue[];
  /** The single advertiser that drove the most impressions toward this user. */
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

  // Account age for per-year/per-day calculation. Anchored on the archive's
  // generation date so the same archive always produces the same per-day
  // figure regardless of when the user opens it.
  const createdAt = archive.account?.createdAt ?? null;
  const createdDate = createdAt ? parseDate(createdAt) : null;
  const refDate = getReferenceDate(archive);
  const daysSinceCreation = createdDate
    ? Math.max(
        1,
        Math.floor(
          (refDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
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
      const avgCpm =
        totalImpressions > 0 ? (estimatedRevenue / totalImpressions) * 1000 : 0;
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
    estimatedRevenueLow: estimatedRevenue * 0.5,
    estimatedRevenueHigh: estimatedRevenue * 1.5,
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
