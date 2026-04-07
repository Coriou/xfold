// ---------------------------------------------------------------------------
// Advertiser stats — aggregate ad impressions and engagements
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

export interface AdvertiserSummary {
  name: string;
  screenName: string;
  impressions: number;
  engagements: number;
}

export interface AdvertiserStats {
  uniqueAdvertisers: number;
  totalImpressions: number;
  totalEngagements: number;
  /** Distinct targeting types (Interests, Lookalike, Age, ...) used against the user. */
  targetingTypes: string[];
  /** Sorted by impressions desc, ties broken by engagements desc. */
  top: AdvertiserSummary[];
}

interface AdvertiserAccum {
  name: string;
  screenName: string;
  impressions: number;
  engagements: number;
}

export function buildAdvertiserStats(
  archive: ParsedArchive,
  topN: number = 12,
): AdvertiserStats {
  const byScreenName = new Map<string, AdvertiserAccum>();
  const targetingTypes = new Set<string>();
  let totalImpressions = 0;
  let totalEngagements = 0;

  function getOrCreate(name: string, screenName: string): AdvertiserAccum {
    const key = screenName || name;
    let existing = byScreenName.get(key);
    if (!existing) {
      existing = { name, screenName, impressions: 0, engagements: 0 };
      byScreenName.set(key, existing);
    }
    return existing;
  }

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      totalImpressions++;
      const a = getOrCreate(imp.advertiserName, imp.advertiserScreenName);
      a.impressions++;
      for (const tc of imp.targetingCriteria) {
        if (tc.targetingType) targetingTypes.add(tc.targetingType);
      }
    }
  }

  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      totalEngagements++;
      const a = getOrCreate(eng.advertiserName, eng.advertiserScreenName);
      a.engagements++;
      for (const tc of eng.targetingCriteria) {
        if (tc.targetingType) targetingTypes.add(tc.targetingType);
      }
    }
  }

  const top: AdvertiserSummary[] = [];
  for (const a of byScreenName.values()) {
    top.push({
      name: a.name,
      screenName: a.screenName,
      impressions: a.impressions,
      engagements: a.engagements,
    });
  }
  top.sort((a, b) => {
    if (b.impressions !== a.impressions) return b.impressions - a.impressions;
    if (b.engagements !== a.engagements) return b.engagements - a.engagements;
    return a.name.localeCompare(b.name);
  });

  return {
    uniqueAdvertisers: byScreenName.size,
    totalImpressions,
    totalEngagements,
    targetingTypes: Array.from(targetingTypes).sort(),
    top: top.slice(0, Math.max(0, topN)),
  };
}
