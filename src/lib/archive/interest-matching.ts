// ---------------------------------------------------------------------------
// Interest matching — compare inferred interests against actual behavior
// ---------------------------------------------------------------------------

import type { PersonalizationInterest } from "@/lib/archive/types";

export interface InterestMatch {
  name: string;
  isDisabled: boolean;
  confirmedByTweets: boolean;
  confirmedByLikes: boolean;
  confirmed: boolean;
  adImpressionCount: number;
  usedByAdvertisers: boolean;
}

/** Split an interest name into searchable tokens. */
export function tokenizeInterest(name: string): string[] {
  const parts = name
    .split(/[&\/,\-]|\band\b/i)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 4);

  // Always include the full lowercased name as a token too
  const full = name.toLowerCase().trim();
  if (full.length >= 4 && !parts.includes(full)) {
    parts.push(full);
  }

  return parts;
}

/** Join an array of texts into a single lowercased corpus string. */
export function buildCorpus(texts: (string | null | undefined)[]): string {
  return texts.filter(Boolean).join(" ").toLowerCase();
}

/** Match interests against tweet/like corpora and ad targeting data. */
export function matchInterests(
  interests: PersonalizationInterest[],
  tweetCorpus: string,
  likeCorpus: string,
  adTargetingCounts: Map<string, number>,
): InterestMatch[] {
  return interests.map((interest) => {
    const tokens = tokenizeInterest(interest.name);
    const confirmedByTweets = tokens.some((t) => tweetCorpus.includes(t));
    const confirmedByLikes = tokens.some((t) => likeCorpus.includes(t));

    // Match against ad targeting: try exact name match first, then tokens
    const nameLower = interest.name.toLowerCase();
    let adImpressionCount = adTargetingCounts.get(nameLower) ?? 0;
    if (adImpressionCount === 0) {
      for (const t of tokens) {
        const count = adTargetingCounts.get(t) ?? 0;
        if (count > 0) {
          adImpressionCount = count;
          break;
        }
      }
    }

    return {
      name: interest.name,
      isDisabled: interest.isDisabled,
      confirmedByTweets,
      confirmedByLikes,
      confirmed: confirmedByTweets || confirmedByLikes,
      adImpressionCount,
      usedByAdvertisers: adImpressionCount > 0,
    };
  });
}

/** Build a map of lowercased interest targeting values → impression count. */
export function buildAdTargetingCounts(
  impressions: { targetingCriteria: { targetingType: string; targetingValue: string | null }[] }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const imp of impressions) {
    for (const tc of imp.targetingCriteria) {
      if (
        tc.targetingValue &&
        tc.targetingType.toLowerCase().includes("interest")
      ) {
        const key = tc.targetingValue.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}
