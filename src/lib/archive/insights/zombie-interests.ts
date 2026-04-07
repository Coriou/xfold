// ---------------------------------------------------------------------------
// Zombie Interests — disabled interests X still monetized
// ---------------------------------------------------------------------------
//
// Users can "disable" interests in X's settings — but does it actually stop
// advertisers from targeting those interests? This insight cross-references
// disabled interests against ad targeting criteria to expose "zombie"
// interests that should be dead but are still driving ad revenue.
//
// Data sources crossed:
//   1. Personalization interests with isDisabled = true
//   2. Ad impressions/engagements targeting criteria (who still used them?)
//   3. Tweet/like corpus (did the user ever even mention it?)
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildAdTargetingCounts,
  buildCorpus,
  tokenizeInterest,
} from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export interface ZombieInterest {
  /** The interest name as X labeled it. */
  readonly name: string;
  /** Number of ad impressions that still targeted this disabled interest. */
  readonly adImpressions: number;
  /** Number of distinct advertisers that used this disabled interest. */
  readonly advertiserCount: number;
  /** Names of top advertisers (up to 3) still targeting this zombie. */
  readonly topAdvertisers: readonly string[];
  /** Whether the user ever mentioned this in tweets/likes (usually not). */
  readonly confirmedByBehavior: boolean;
}

export interface ZombieInterestStats {
  /** Total interests the user disabled. */
  readonly totalDisabled: number;
  /** Disabled interests that advertisers STILL targeted. */
  readonly zombieCount: number;
  /** Total ad impressions driven by zombie interests. */
  readonly totalZombieImpressions: number;
  /** Total unique advertisers that used zombie interests. */
  readonly totalZombieAdvertisers: number;
  /** The individual zombie entries, sorted by ad impressions desc. */
  readonly entries: readonly ZombieInterest[];
  /** The single worst zombie — most impressions despite being disabled. */
  readonly worstZombie: ZombieInterest | null;
}

// --- Helpers ----------------------------------------------------------------

function buildInterestAdvertiserMap(
  archive: ParsedArchive,
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();

  function process(
    targetingCriteria: readonly {
      targetingType: string;
      targetingValue: string | null;
    }[],
    advertiser: string,
  ) {
    for (const tc of targetingCriteria) {
      if (
        tc.targetingValue &&
        tc.targetingType.toLowerCase().includes("interest")
      ) {
        const key = tc.targetingValue.toLowerCase();
        let advMap = map.get(key);
        if (!advMap) {
          advMap = new Map();
          map.set(key, advMap);
        }
        advMap.set(advertiser, (advMap.get(advertiser) ?? 0) + 1);
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

// --- Main -------------------------------------------------------------------

export function buildZombieInterests(
  archive: ParsedArchive,
): ZombieInterestStats | null {
  const interests = archive.personalization?.interests;
  if (!interests || interests.length === 0) return null;

  const disabled = interests.filter((i) => i.isDisabled);
  if (disabled.length === 0) return null;

  // Step 1: Build behavior corpus for confirmation check
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
  const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));

  // Step 2: Build ad targeting counts and advertiser map
  const adTargetingCounts = buildAdTargetingCounts(
    archive.adImpressions.flatMap((b) => b.impressions),
  );
  const advertiserMap = buildInterestAdvertiserMap(archive);

  // Step 3: Assemble zombie entries
  const entries: ZombieInterest[] = [];
  const allZombieAdvertisers = new Set<string>();

  for (const interest of disabled) {
    const lower = interest.name.toLowerCase();
    const tokens = tokenizeInterest(interest.name);

    // Ad impression count — try exact match then tokens
    let adImpressions = adTargetingCounts.get(lower) ?? 0;
    if (adImpressions === 0) {
      for (const t of tokens) {
        const count = adTargetingCounts.get(t) ?? 0;
        if (count > adImpressions) adImpressions = count;
      }
    }

    // Advertisers — try exact match then tokens
    let advMap = advertiserMap.get(lower);
    if (!advMap || advMap.size === 0) {
      for (const t of tokens) {
        const tokenMap = advertiserMap.get(t);
        if (tokenMap && tokenMap.size > 0) {
          advMap = tokenMap;
          break;
        }
      }
    }

    const advertiserCount = advMap?.size ?? 0;
    const topAdvertisers = advMap
      ? [...advMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name)
      : [];

    // Track global zombie advertisers
    if (advMap) {
      for (const name of advMap.keys()) allZombieAdvertisers.add(name);
    }

    // Behavior confirmation
    const confirmedByBehavior =
      tokens.some((t) => tweetCorpus.includes(t)) ||
      tokens.some((t) => likeCorpus.includes(t));

    if (adImpressions > 0) {
      entries.push({
        name: interest.name,
        adImpressions,
        advertiserCount,
        topAdvertisers,
        confirmedByBehavior,
      });
    }
  }

  // Sort by ad impressions desc
  entries.sort((a, b) => b.adImpressions - a.adImpressions);

  const totalZombieImpressions = entries.reduce(
    (sum, e) => sum + e.adImpressions,
    0,
  );

  return {
    totalDisabled: disabled.length,
    zombieCount: entries.length,
    totalZombieImpressions,
    totalZombieAdvertisers: allZombieAdvertisers.size,
    entries,
    worstZombie: entries[0] ?? null,
  };
}
