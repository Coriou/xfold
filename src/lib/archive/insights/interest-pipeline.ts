// ---------------------------------------------------------------------------
// Interest pipeline — cross-reference interests → ad targeting → conversions
// ---------------------------------------------------------------------------
//
// The single most damning visualization in xfold: show users that X assigned
// them an interest, advertisers used it, and conversions were tracked — even
// when the user never tweeted about that interest.
//
// Data sources crossed:
//   1. Personalization interests (what X inferred)
//   2. Ad impressions/engagements targeting criteria (who bought those inferences)
//   3. Tweet/like corpus (did the user ever actually mention it?)
//   4. Off-Twitter conversions (did the profiling lead to tracked behavior?)
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildAdTargetingCounts,
  buildCorpus,
  matchInterests,
  type InterestMatch,
} from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export interface InterestPipelineEntry {
  /** The interest name as X labeled it. */
  readonly name: string;
  /** Whether the user disabled this interest in their settings. */
  readonly isDisabled: boolean;
  /** True if any tweet or like mentions this interest. */
  readonly confirmedByBehavior: boolean;
  /** Number of ad impressions that targeted this interest. */
  readonly adImpressions: number;
  /** Number of distinct advertisers that used this interest. */
  readonly advertiserCount: number;
  /** Names of top advertisers (up to 3) that targeted this interest. */
  readonly topAdvertisers: readonly string[];
  /** Whether this interest led to any off-twitter conversion. */
  readonly hasConversion: boolean;
}

export interface InterestPipelineStats {
  /** Total interests assigned by X. */
  readonly totalInterests: number;
  /** Interests with evidence in tweet/like corpus. */
  readonly confirmedCount: number;
  /** Interests with NO evidence in user content. */
  readonly unconfirmedCount: number;
  /** Unconfirmed interests that advertisers still targeted. */
  readonly unconfirmedButMonetized: number;
  /** Unconfirmed interests that also led to conversions. */
  readonly unconfirmedWithConversions: number;
  /** All interests that were used by at least one advertiser. */
  readonly monetizedCount: number;
  /** The full pipeline entries, sorted by ad impressions desc. */
  readonly entries: readonly InterestPipelineEntry[];
  /** The single most "outrageous" entry — unconfirmed + high ad count. */
  readonly worstOffender: InterestPipelineEntry | null;
}

// --- Helpers ----------------------------------------------------------------

/** Build a map of interest → Set<advertiser screen name> from ad data. */
function buildInterestAdvertiserMap(
  archive: ParsedArchive,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  function process(
    targetingCriteria: { targetingType: string; targetingValue: string | null }[],
    advertiser: string,
  ) {
    for (const tc of targetingCriteria) {
      if (
        tc.targetingValue &&
        tc.targetingType.toLowerCase().includes("interest")
      ) {
        const key = tc.targetingValue.toLowerCase();
        let set = map.get(key);
        if (!set) {
          set = new Set();
          map.set(key, set);
        }
        set.add(advertiser);
      }
    }
  }

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      process(imp.targetingCriteria, imp.advertiserName);
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      process(eng.targetingCriteria, eng.advertiserName);
    }
  }

  return map;
}

/** Build a set of lowercased keywords from off-twitter conversion events. */
function buildConversionKeywords(archive: ParsedArchive): Set<string> {
  const keywords = new Set<string>();

  for (const e of archive.offTwitter.mobileConversionsAttributed) {
    keywords.add(e.applicationName.toLowerCase());
    if (e.conversionEventName) keywords.add(e.conversionEventName.toLowerCase());
  }
  for (const e of archive.offTwitter.mobileConversionsUnattributed) {
    keywords.add(e.applicationName.toLowerCase());
    if (e.conversionEventName) keywords.add(e.conversionEventName.toLowerCase());
  }
  for (const e of archive.offTwitter.onlineConversionsAttributed) {
    if (e.advertiserName) keywords.add(e.advertiserName.toLowerCase());
    if (e.conversionUrl) keywords.add(e.conversionUrl.toLowerCase());
  }
  for (const e of archive.offTwitter.onlineConversionsUnattributed) {
    if (e.advertiserName) keywords.add(e.advertiserName.toLowerCase());
    if (e.conversionUrl) keywords.add(e.conversionUrl.toLowerCase());
  }

  return keywords;
}

/** Check if any conversion keyword contains any of the interest's tokens. */
function interestMatchesConversions(
  interestName: string,
  conversionKeywords: Set<string>,
): boolean {
  const lower = interestName.toLowerCase().trim();
  if (lower.length < 4) return false;

  for (const kw of conversionKeywords) {
    if (kw.includes(lower)) return true;
  }

  // Try individual tokens for compound interests like "Health & Fitness"
  const tokens = lower
    .split(/[&\/,\-]|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  for (const token of tokens) {
    for (const kw of conversionKeywords) {
      if (kw.includes(token)) return true;
    }
  }

  return false;
}

// --- Main -------------------------------------------------------------------

export function buildInterestPipeline(
  archive: ParsedArchive,
): InterestPipelineStats | null {
  const interests = archive.personalization?.interests;
  if (!interests || interests.length === 0) return null;

  // Step 1: Match interests against tweet/like content. For likes we use the
  // full text of the liked tweet (what the user engaged with), since the URL
  // alone has no semantic content to match against interest names.
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
  const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));
  const adTargetingCounts = buildAdTargetingCounts(
    archive.adImpressions.flatMap((b) => b.impressions),
  );
  const matches = matchInterests(interests, tweetCorpus, likeCorpus, adTargetingCounts);

  // Step 2: Build advertiser-per-interest map
  const advertiserMap = buildInterestAdvertiserMap(archive);

  // Step 3: Build conversion keywords for off-twitter matching
  const conversionKeywords = buildConversionKeywords(archive);

  // Step 4: Assemble pipeline entries
  const matchByName = new Map<string, InterestMatch>();
  for (const m of matches) {
    matchByName.set(m.name.toLowerCase(), m);
  }

  const entries: InterestPipelineEntry[] = interests.map((interest) => {
    const match = matchByName.get(interest.name.toLowerCase());
    const nameLower = interest.name.toLowerCase();
    const advertisers = advertiserMap.get(nameLower);

    // Also check tokens for advertiser matching
    let finalAdvertisers = advertisers;
    if (!finalAdvertisers || finalAdvertisers.size === 0) {
      const tokens = nameLower
        .split(/[&\/,\-]|\band\b/i)
        .map((s) => s.trim())
        .filter((s) => s.length >= 4);
      for (const token of tokens) {
        const tokenAds = advertiserMap.get(token);
        if (tokenAds && tokenAds.size > 0) {
          finalAdvertisers = tokenAds;
          break;
        }
      }
    }

    const advertiserNames = finalAdvertisers
      ? Array.from(finalAdvertisers)
      : [];

    return {
      name: interest.name,
      isDisabled: interest.isDisabled,
      confirmedByBehavior: match?.confirmed ?? false,
      adImpressions: match?.adImpressionCount ?? 0,
      advertiserCount: advertiserNames.length,
      topAdvertisers: advertiserNames.slice(0, 3),
      hasConversion: interestMatchesConversions(interest.name, conversionKeywords),
    };
  });

  // Sort by ad impressions descending
  entries.sort((a, b) => b.adImpressions - a.adImpressions);

  // Step 5: Compute summary stats
  const confirmedCount = entries.filter((e) => e.confirmedByBehavior).length;
  const unconfirmedCount = entries.filter((e) => !e.confirmedByBehavior).length;
  const unconfirmedButMonetized = entries.filter(
    (e) => !e.confirmedByBehavior && e.advertiserCount > 0,
  ).length;
  const unconfirmedWithConversions = entries.filter(
    (e) => !e.confirmedByBehavior && e.hasConversion,
  ).length;
  const monetizedCount = entries.filter((e) => e.advertiserCount > 0).length;

  // The "worst offender": unconfirmed interest with the most ad impressions
  const worstOffender =
    entries.find((e) => !e.confirmedByBehavior && e.adImpressions > 0) ?? null;

  return {
    totalInterests: interests.length,
    confirmedCount,
    unconfirmedCount,
    unconfirmedButMonetized,
    unconfirmedWithConversions,
    monetizedCount,
    entries,
    worstOffender,
  };
}
