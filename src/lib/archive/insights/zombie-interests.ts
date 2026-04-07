// ---------------------------------------------------------------------------
// Zombie Interests — disabled interests X still monetized
// ---------------------------------------------------------------------------
//
// Users can "disable" interests in X's settings — but does it actually stop
// advertisers from targeting those interests? This insight cross-references
// disabled interests against ad targeting criteria to expose "zombie"
// interests that should be dead but are still driving ad revenue.
//
// We're conservative on what counts as a zombie:
//
//   - The interest must be disabled.
//   - We only count impressions from the last RECENT_WINDOW_DAYS days
//     (relative to the archive's generation date — not "now", because the
//     user might be viewing an old archive). Ads from years ago aren't
//     evidence of *current* behavior.
//   - The interest needs at least MIN_IMPRESSIONS recent ad impressions
//     to be flagged. A single stale ad doesn't make a zombie.
//
// These thresholds prevent the "1 stale ad = active zombie" false positive
// while keeping the headline meaningful for users with real reanimations.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildCorpus,
  isInterestConfirmed,
  tokenizeInterest,
} from "@/lib/archive/interest-matching";
import { parseDate } from "@/lib/format";

// --- Constants --------------------------------------------------------------

/** Only count ad impressions within this window of the archive date. */
const RECENT_WINDOW_DAYS = 90;
/** A disabled interest needs at least this many recent ads to count. */
const MIN_IMPRESSIONS = 5;

// --- Types ------------------------------------------------------------------

export interface ZombieInterest {
  /** The interest name as X labeled it. */
  readonly name: string;
  /** Number of *recent* ad impressions that still targeted this interest. */
  readonly adImpressions: number;
  /** Number of distinct advertisers that used this disabled interest recently. */
  readonly advertiserCount: number;
  /** Names of top advertisers (up to 3) still targeting this zombie. */
  readonly topAdvertisers: readonly string[];
  /** Whether the user ever mentioned this in tweets/likes (usually not). */
  readonly confirmedByBehavior: boolean;
}

export interface ZombieInterestStats {
  /** Total interests the user disabled. */
  readonly totalDisabled: number;
  /** Disabled interests that advertisers STILL targeted (after thresholds). */
  readonly zombieCount: number;
  /** Total recent ad impressions driven by zombie interests. */
  readonly totalZombieImpressions: number;
  /** Total unique advertisers that used zombie interests recently. */
  readonly totalZombieAdvertisers: number;
  /** Number of days the recency window looks back. */
  readonly recencyWindowDays: number;
  /** The individual zombie entries, sorted by ad impressions desc. */
  readonly entries: readonly ZombieInterest[];
  /** The single worst zombie — most impressions despite being disabled. */
  readonly worstZombie: ZombieInterest | null;
}

// --- Helpers ----------------------------------------------------------------

/**
 * Cutoff date for "recent" ads. Anchored to the archive's generation date,
 * not Date.now() — so loading a 2-year-old archive still gives meaningful
 * results relative to *that* archive's window.
 */
function getRecencyCutoff(archive: ParsedArchive): number {
  const anchor = parseDate(archive.meta.generationDate)?.getTime() ?? Date.now();
  return anchor - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

interface InterestAdAccumulator {
  /** Total recent impressions for this interest target value. */
  impressions: number;
  /** Recent advertisers for this interest target value, with impression counts. */
  advertisers: Map<string, number>;
}

/**
 * Build a map of (lowercased interest target value) → recent impression
 * stats. Only impressions inside the recency window count.
 */
function buildRecentInterestAdMap(
  archive: ParsedArchive,
  recencyCutoffMs: number,
): Map<string, InterestAdAccumulator> {
  const map = new Map<string, InterestAdAccumulator>();

  function process(
    targetingCriteria: readonly {
      targetingType: string;
      targetingValue: string | null;
    }[],
    advertiser: string,
    impressionTime: string,
  ) {
    const d = parseDate(impressionTime);
    if (!d) return;
    if (d.getTime() < recencyCutoffMs) return;

    for (const tc of targetingCriteria) {
      if (
        !tc.targetingValue ||
        !tc.targetingType.toLowerCase().includes("interest")
      ) {
        continue;
      }
      const key = tc.targetingValue.toLowerCase();
      let acc = map.get(key);
      if (!acc) {
        acc = { impressions: 0, advertisers: new Map() };
        map.set(key, acc);
      }
      acc.impressions += 1;
      acc.advertisers.set(
        advertiser,
        (acc.advertisers.get(advertiser) ?? 0) + 1,
      );
    }
  }

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      process(imp.targetingCriteria, imp.advertiserName, imp.impressionTime);
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      process(eng.targetingCriteria, eng.advertiserName, eng.impressionTime);
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

  // Step 1: Behavior corpus (used to mark which zombies the user *did*
  // tweet about — those are not actually false positives).
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
  const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));

  // Step 2: Recent-ad map for impression + advertiser lookups
  const recencyCutoffMs = getRecencyCutoff(archive);
  const recentAdMap = buildRecentInterestAdMap(archive, recencyCutoffMs);

  // Step 3: Walk every disabled interest, look up its recent activity
  const entries: ZombieInterest[] = [];
  const allZombieAdvertisers = new Set<string>();

  for (const interest of disabled) {
    const lower = interest.name.toLowerCase();
    const tokens = tokenizeInterest(interest.name);

    // Find the strongest (impressions, advertisers) match for this interest:
    // try the exact lowercased name first, then each token. Use the variant
    // with the most impressions (not the first one — first-match was lossy).
    let best: InterestAdAccumulator | null = recentAdMap.get(lower) ?? null;
    for (const t of tokens) {
      const candidate = recentAdMap.get(t);
      if (candidate && (!best || candidate.impressions > best.impressions)) {
        best = candidate;
      }
    }

    if (!best || best.impressions < MIN_IMPRESSIONS) continue;

    const topAdvertisers = [...best.advertisers.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    for (const name of best.advertisers.keys()) {
      allZombieAdvertisers.add(name);
    }

    const confirmedByBehavior =
      isInterestConfirmed(interest.name, tweetCorpus) ||
      isInterestConfirmed(interest.name, likeCorpus);

    entries.push({
      name: interest.name,
      adImpressions: best.impressions,
      advertiserCount: best.advertisers.size,
      topAdvertisers,
      confirmedByBehavior,
    });
  }

  // Sort by recent impressions desc
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
    recencyWindowDays: RECENT_WINDOW_DAYS,
    entries,
    worstZombie: entries[0] ?? null,
  };
}
