// ---------------------------------------------------------------------------
// Advertiser Prospectus — "The profile X sells to advertisers"
// ---------------------------------------------------------------------------
//
// Assembles every piece of data X shares with advertisers about the user
// into a single "product listing" view. Combines:
//
//   1. Hidden demographics from ad targeting (income, job, education, etc.)
//   2. Audience list memberships (custom audiences, lookalikes)
//   3. Off-twitter conversion data (proof of purchase/install behavior)
//   4. Partner interests (data broker labels)
//   5. Top inferred interests + behavioral signals
//
// The result is the advertiser-facing dossier — what a media buyer sees
// when they target this user.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

// --- Types ------------------------------------------------------------------

export interface ProspectusSlot {
  /** Category label (e.g. "Income", "Job Title"). */
  readonly category: string;
  /** The values X told advertisers (may be multiple). */
  readonly values: readonly string[];
  /** Number of ad impressions that used this slot for targeting. */
  readonly impressionCount: number;
}

export interface AudienceMembership {
  /** The audience type: "custom" | "lookalike" | "do-not-reach". */
  readonly type: "custom" | "lookalike" | "do-not-reach";
  /** The audience or advertiser name. */
  readonly name: string;
  /** Number of ad impressions from this audience membership. */
  readonly impressionCount: number;
}

export interface AdvertiserProspectus {
  /** Hidden demographic slots extracted from ad targeting. */
  readonly demographics: readonly ProspectusSlot[];
  /** Audience list memberships. */
  readonly audiences: readonly AudienceMembership[];
  /** Total custom audience memberships. */
  readonly customAudienceCount: number;
  /** Total lookalike audience memberships. */
  readonly lookalikeCount: number;
  /** Advertisers that paid NOT to reach this user. */
  readonly doNotReachCount: number;
  /** Data broker labels (partner interests). */
  readonly brokerLabels: readonly string[];
  /** Top inferred interests used in targeting (up to 8). */
  readonly topTargetedInterests: readonly string[];
  /** Off-twitter conversion events count. */
  readonly conversionCount: number;
  /** Types of conversion events (e.g. "Install", "Purchase"). */
  readonly conversionTypes: readonly string[];
  /** Total unique advertisers who targeted this user. */
  readonly totalAdvertisers: number;
  /** Total ad impressions. */
  readonly totalImpressions: number;
  /** How many distinct data categories X shares with advertisers. */
  readonly dataPointCount: number;
}

// --- Hidden demographic slot types we extract from ad targeting -------------

const DEMOGRAPHIC_TYPES: ReadonlyMap<string, string> = new Map([
  ["Income range", "Income"],
  ["Job title", "Job Title"],
  ["Education", "Education"],
  ["Relationship status", "Relationship"],
  ["Homeownership", "Homeownership"],
  ["Behaviors", "Behavior"],
  ["Purchase behavior", "Purchase Behavior"],
  ["Life events", "Life Events"],
  ["Age", "Age Range"],
  ["Gender", "Gender"],
  ["Locations", "Location"],
]);

// --- Main -------------------------------------------------------------------

export function buildAdvertiserProspectus(
  archive: ParsedArchive,
): AdvertiserProspectus | null {
  // Need at least ad data or personalization
  if (archive.adImpressions.length === 0 && !archive.personalization) {
    return null;
  }

  // --- Extract hidden demographics from ad targeting ---
  const slotMap = new Map<string, Map<string, number>>();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        const label = DEMOGRAPHIC_TYPES.get(tc.targetingType);
        if (label && tc.targetingValue) {
          let valueMap = slotMap.get(label);
          if (!valueMap) {
            valueMap = new Map();
            slotMap.set(label, valueMap);
          }
          valueMap.set(
            tc.targetingValue,
            (valueMap.get(tc.targetingValue) ?? 0) + 1,
          );
        }
      }
    }
  }

  const demographics: ProspectusSlot[] = [];
  for (const [category, valueMap] of slotMap) {
    const sorted = [...valueMap.entries()].sort((a, b) => b[1] - a[1]);
    const totalImpressions = sorted.reduce((s, [, c]) => s + c, 0);
    demographics.push({
      category,
      values: sorted.slice(0, 3).map(([v]) => v),
      impressionCount: totalImpressions,
    });
  }
  demographics.sort((a, b) => b.impressionCount - a.impressionCount);

  // --- Extract audience memberships ---
  const audienceMap = new Map<
    string,
    { type: AudienceMembership["type"]; count: number }
  >();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (tc.targetingType === "List" && tc.targetingValue) {
          const key = `custom::${tc.targetingValue}`;
          const existing = audienceMap.get(key);
          audienceMap.set(key, {
            type: "custom",
            count: (existing?.count ?? 0) + 1,
          });
        }
        if (tc.targetingType === "Follower look-alikes" && tc.targetingValue) {
          const key = `lookalike::${tc.targetingValue}`;
          const existing = audienceMap.get(key);
          audienceMap.set(key, {
            type: "lookalike",
            count: (existing?.count ?? 0) + 1,
          });
        }
      }
    }
  }

  // Include do-not-reach advertisers from personalization
  const doNotReach = archive.personalization?.doNotReachAdvertisers ?? [];
  for (const name of doNotReach) {
    audienceMap.set(`do-not-reach::${name}`, {
      type: "do-not-reach",
      count: 0,
    });
  }

  const audiences: AudienceMembership[] = [...audienceMap.entries()]
    .map(([key, val]) => ({
      type: val.type,
      name: key.split("::").slice(1).join("::"),
      impressionCount: val.count,
    }))
    .sort((a, b) => b.impressionCount - a.impressionCount);

  const customAudienceCount = audiences.filter(
    (a) => a.type === "custom",
  ).length;
  const lookalikeCount = audiences.filter((a) => a.type === "lookalike").length;
  const doNotReachCount = audiences.filter(
    (a) => a.type === "do-not-reach",
  ).length;

  // --- Data broker labels ---
  const brokerLabels = archive.personalization?.partnerInterests ?? [];

  // --- Top targeted interests ---
  const interestCounts = new Map<string, number>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (
          tc.targetingValue &&
          tc.targetingType.toLowerCase().includes("interest")
        ) {
          const key = tc.targetingValue;
          interestCounts.set(key, (interestCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }
  const topTargetedInterests = [...interestCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  // --- Conversion events ---
  const conversions = [
    ...archive.offTwitter.mobileConversionsAttributed,
    ...archive.offTwitter.mobileConversionsUnattributed,
    ...archive.offTwitter.onlineConversionsAttributed,
    ...archive.offTwitter.onlineConversionsUnattributed,
  ];
  const conversionTypeSet = new Set<string>();
  for (const c of conversions) {
    if ("conversionType" in c && c.conversionType) {
      conversionTypeSet.add(c.conversionType);
    }
    if ("eventType" in c) {
      conversionTypeSet.add(c.eventType);
    }
  }

  // --- Totals ---
  const advertiserSet = new Set<string>();
  let totalImpressions = 0;
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      advertiserSet.add(imp.advertiserScreenName);
      totalImpressions++;
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      advertiserSet.add(eng.advertiserScreenName);
    }
  }

  // Data point count: how many distinct categories of data X shares
  let dataPointCount = 0;
  if (demographics.length > 0) dataPointCount += demographics.length;
  if (customAudienceCount > 0) dataPointCount++;
  if (lookalikeCount > 0) dataPointCount++;
  if (brokerLabels.length > 0) dataPointCount++;
  if (topTargetedInterests.length > 0) dataPointCount++;
  if (conversions.length > 0) dataPointCount++;
  if (doNotReachCount > 0) dataPointCount++;

  if (dataPointCount === 0) return null;

  return {
    demographics,
    audiences,
    customAudienceCount,
    lookalikeCount,
    doNotReachCount,
    brokerLabels,
    topTargetedInterests,
    conversionCount: conversions.length,
    conversionTypes: [...conversionTypeSet],
    totalAdvertisers: advertiserSet.size,
    totalImpressions,
    dataPointCount,
  };
}
