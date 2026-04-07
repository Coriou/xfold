// ---------------------------------------------------------------------------
// Advertiser dossier — per-advertiser intelligence report
// ---------------------------------------------------------------------------
//
// For each top advertiser, aggregate everything X gave them: which targeting
// criteria they used (interests, demographics, lookalike, custom audience),
// whether the user converted off-platform, whether they're on audience lists,
// total impressions + engagements. This turns the flat "top advertisers" bar
// chart into an exposé.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

// --- Types ------------------------------------------------------------------

export interface AdvertiserDossier {
  /** Advertiser display name. */
  readonly name: string;
  /** Advertiser screen name / handle. */
  readonly screenName: string;
  /** Total ad impressions shown to user. */
  readonly impressions: number;
  /** Total ad engagements (clicks, etc). */
  readonly engagements: number;
  /** All distinct targeting criteria types used (e.g. "Interests", "Age", "List"). */
  readonly targetingTypes: readonly string[];
  /** All distinct targeting values used (interest names, age ranges, etc). */
  readonly targetingValues: readonly string[];
  /** True if this advertiser used a "List" (custom audience) to target the user. */
  readonly usedCustomAudience: boolean;
  /** True if this advertiser used a "Lookalike" targeting criterion. */
  readonly usedLookalike: boolean;
  /** Interest names this advertiser specifically targeted. */
  readonly targetedInterests: readonly string[];
  /** True if there's an off-twitter conversion event from this advertiser. */
  readonly hasOffTwitterConversion: boolean;
  /** Number of off-twitter conversion events from this advertiser. */
  readonly offTwitterConversionCount: number;
  /** True if user appears in this advertiser's audience list. */
  readonly onAudienceList: boolean;
  /** Threat score 0-100 — composite of how deeply this advertiser profiled the user. */
  readonly threatScore: number;
}

export interface AdvertiserDossierStats {
  /** Full dossiers sorted by threat score descending. */
  readonly dossiers: readonly AdvertiserDossier[];
  /** The single worst offender. */
  readonly topThreat: AdvertiserDossier | null;
  /** Advertisers using custom audience lists. */
  readonly customAudienceCount: number;
  /** Advertisers using lookalike targeting. */
  readonly lookalikeCount: number;
  /** Advertisers with off-twitter conversions. */
  readonly withConversionsCount: number;
  /** Average number of targeting methods per advertiser. */
  readonly averageTargetingMethods: number;
}

// --- Implementation ---------------------------------------------------------

interface AdvertiserAccum {
  name: string;
  screenName: string;
  impressions: number;
  engagements: number;
  targetingTypes: Set<string>;
  targetingValues: Set<string>;
  hasCustomAudience: boolean;
  hasLookalike: boolean;
  targetedInterests: Set<string>;
}

function computeThreatScore(
  impressions: number,
  engagements: number,
  targetingTypeCount: number,
  usedCustomAudience: boolean,
  usedLookalike: boolean,
  hasOffTwitterConversion: boolean,
  onAudienceList: boolean,
): number {
  let score = 0;

  // Volume: impressions contribute up to 25 points
  score += Math.min(25, (impressions / 50) * 25);

  // Engagement: engagements contribute up to 15 points
  score += Math.min(15, (engagements / 10) * 15);

  // Targeting sophistication: methods count contributes up to 20 points
  score += Math.min(20, targetingTypeCount * 5);

  // Red flags: each adds significant points
  if (usedCustomAudience) score += 15;
  if (usedLookalike) score += 10;
  if (hasOffTwitterConversion) score += 10;
  if (onAudienceList) score += 5;

  return Math.min(100, Math.round(score));
}

export function buildAdvertiserDossiers(
  archive: ParsedArchive,
  topN: number = 20,
): AdvertiserDossierStats | null {
  // Step 1: Aggregate per-advertiser data from ad impressions/engagements
  const byKey = new Map<string, AdvertiserAccum>();

  function getOrCreate(name: string, screenName: string): AdvertiserAccum {
    const key = screenName || name;
    let existing = byKey.get(key);
    if (!existing) {
      existing = {
        name,
        screenName,
        impressions: 0,
        engagements: 0,
        targetingTypes: new Set(),
        targetingValues: new Set(),
        hasCustomAudience: false,
        hasLookalike: false,
        targetedInterests: new Set(),
      };
      byKey.set(key, existing);
    }
    return existing;
  }

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      const a = getOrCreate(imp.advertiserName, imp.advertiserScreenName);
      a.impressions++;
      for (const tc of imp.targetingCriteria) {
        if (tc.targetingType) a.targetingTypes.add(tc.targetingType);
        if (tc.targetingValue) a.targetingValues.add(tc.targetingValue);
        if (tc.targetingType === "List") a.hasCustomAudience = true;
        if (tc.targetingType.toLowerCase().includes("lookalike"))
          a.hasLookalike = true;
        if (
          tc.targetingType.toLowerCase().includes("interest") &&
          tc.targetingValue
        )
          a.targetedInterests.add(tc.targetingValue);
      }
    }
  }

  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      const a = getOrCreate(eng.advertiserName, eng.advertiserScreenName);
      a.engagements++;
      for (const tc of eng.targetingCriteria) {
        if (tc.targetingType) a.targetingTypes.add(tc.targetingType);
        if (tc.targetingValue) a.targetingValues.add(tc.targetingValue);
        if (tc.targetingType === "List") a.hasCustomAudience = true;
        if (tc.targetingType.toLowerCase().includes("lookalike"))
          a.hasLookalike = true;
        if (
          tc.targetingType.toLowerCase().includes("interest") &&
          tc.targetingValue
        )
          a.targetedInterests.add(tc.targetingValue);
      }
    }
  }

  if (byKey.size === 0) return null;

  // Step 2: Build off-twitter advertiser set
  const offTwitterAdvertisers = new Map<string, number>();
  for (const e of archive.offTwitter.onlineConversionsAttributed) {
    if (e.advertiserName) {
      const lower = e.advertiserName.toLowerCase();
      offTwitterAdvertisers.set(
        lower,
        (offTwitterAdvertisers.get(lower) ?? 0) + 1,
      );
    }
  }
  for (const e of archive.offTwitter.onlineConversionsUnattributed) {
    if (e.advertiserName) {
      const lower = e.advertiserName.toLowerCase();
      offTwitterAdvertisers.set(
        lower,
        (offTwitterAdvertisers.get(lower) ?? 0) + 1,
      );
    }
  }

  // Step 3: Build audience list set from personalization
  const audienceAdvertisers = new Set<string>();
  if (archive.personalization) {
    for (const name of archive.personalization.advertisers) {
      audienceAdvertisers.add(name.toLowerCase());
    }
  }

  // Step 4: Create dossiers
  const dossiers: AdvertiserDossier[] = [];
  for (const a of byKey.values()) {
    const nameLower = a.name.toLowerCase();
    const screenNameLower = a.screenName.toLowerCase();
    const offConvCount =
      (offTwitterAdvertisers.get(nameLower) ?? 0) +
      (offTwitterAdvertisers.get(screenNameLower) ?? 0);
    const onList =
      audienceAdvertisers.has(nameLower) ||
      audienceAdvertisers.has(screenNameLower);

    const threatScore = computeThreatScore(
      a.impressions,
      a.engagements,
      a.targetingTypes.size,
      a.hasCustomAudience,
      a.hasLookalike,
      offConvCount > 0,
      onList,
    );

    dossiers.push({
      name: a.name,
      screenName: a.screenName,
      impressions: a.impressions,
      engagements: a.engagements,
      targetingTypes: Array.from(a.targetingTypes).sort(),
      targetingValues: Array.from(a.targetingValues).sort(),
      usedCustomAudience: a.hasCustomAudience,
      usedLookalike: a.hasLookalike,
      targetedInterests: Array.from(a.targetedInterests).sort(),
      hasOffTwitterConversion: offConvCount > 0,
      offTwitterConversionCount: offConvCount,
      onAudienceList: onList,
      threatScore,
    });
  }

  // Sort by threat score desc
  dossiers.sort((a, b) => b.threatScore - a.threatScore);

  const topDossiers = dossiers.slice(0, topN);

  const totalTargetingMethods = topDossiers.reduce(
    (sum, d) => sum + d.targetingTypes.length,
    0,
  );

  return {
    dossiers: topDossiers,
    topThreat: topDossiers[0] ?? null,
    customAudienceCount: topDossiers.filter((d) => d.usedCustomAudience).length,
    lookalikeCount: topDossiers.filter((d) => d.usedLookalike).length,
    withConversionsCount: topDossiers.filter((d) => d.hasOffTwitterConversion)
      .length,
    averageTargetingMethods:
      topDossiers.length > 0
        ? Math.round((totalTargetingMethods / topDossiers.length) * 10) / 10
        : 0,
  };
}
