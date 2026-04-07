// ---------------------------------------------------------------------------
// DM × Ad Targeting Correlation — cross-references private messages with ads
// ---------------------------------------------------------------------------
//
// The single most explosive cross-reference: do topics discussed in DMs
// appear in your ad targeting profile? Even if the causal link is unprovable,
// the *correlation* is terrifying — and something X's own viewer never shows.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

// --- Types ------------------------------------------------------------------

export interface DmAdMatch {
  /** The keyword/topic that appears in both domains. */
  readonly keyword: string;
  /** Number of DM messages containing this keyword. */
  readonly dmMentions: number;
  /** Timestamp of first DM mentioning this keyword. */
  readonly firstDmDate: string | null;
  /** Number of ad impressions targeting this keyword (exact or fuzzy). */
  readonly adImpressions: number;
  /** Targeting type used (e.g. "Interest", "Keyword"). */
  readonly targetingType: string;
  /** Earliest ad impression using this targeting. */
  readonly firstAdDate: string | null;
  /** Did the ad appear AFTER the DM? */
  readonly adFollowedDm: boolean;
}

export interface DmAdCorrelation {
  /** All matches found. */
  readonly matches: readonly DmAdMatch[];
  /** Total DM messages analyzed. */
  readonly totalDmMessages: number;
  /** Total ad impressions analyzed. */
  readonly totalAdImpressions: number;
  /** Number of unique keywords that appear in both DMs and ad targeting. */
  readonly overlapCount: number;
  /** Percentage of ad targeting criteria that match DM topics. */
  readonly correlationRate: number;
  /** The most suspicious match (ad appeared shortly after DM). */
  readonly mostSuspicious: DmAdMatch | null;
}

// --- Helpers ----------------------------------------------------------------

/** Stop words to filter out — common words that create false positives. */
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "have",
  "are",
  "was",
  "were",
  "been",
  "will",
  "would",
  "could",
  "should",
  "just",
  "not",
  "but",
  "they",
  "them",
  "their",
  "what",
  "when",
  "where",
  "which",
  "who",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "than",
  "too",
  "very",
  "can",
  "did",
  "does",
  "had",
  "has",
  "her",
  "him",
  "his",
  "its",
  "let",
  "may",
  "our",
  "own",
  "say",
  "she",
  "use",
  "way",
  "who",
  "you",
  "your",
  "about",
  "after",
  "again",
  "also",
  "back",
  "been",
  "being",
  "come",
  "could",
  "even",
  "first",
  "give",
  "going",
  "good",
  "great",
  "help",
  "here",
  "into",
  "know",
  "like",
  "long",
  "look",
  "made",
  "make",
  "many",
  "much",
  "need",
  "only",
  "over",
  "really",
  "right",
  "same",
  "still",
  "take",
  "tell",
  "then",
  "these",
  "thing",
  "think",
  "time",
  "want",
  "well",
  "went",
  "yeah",
  "yeah",
  "yeah",
  "http",
  "https",
  "www",
  "com",
  "lol",
  "lmao",
  "haha",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "") // strip URLs
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

// --- Main -------------------------------------------------------------------

export function buildDmAdCorrelation(
  archive: ParsedArchive,
): DmAdCorrelation | null {
  const dms = archive.directMessages;
  if (dms.length === 0) return null;

  // Step 1: Build DM keyword frequency map with earliest date
  const dmKeywords = new Map<
    string,
    { count: number; firstDate: string | null }
  >();
  let totalDmMessages = 0;

  for (const convo of dms) {
    for (const msg of convo.messages) {
      // Only analyze the user's own messages
      if (msg.senderId !== archive.account?.accountId) continue;
      totalDmMessages++;

      const tokens = tokenize(msg.text);
      for (const token of tokens) {
        const existing = dmKeywords.get(token);
        if (existing) {
          existing.count++;
          if (!existing.firstDate || msg.createdAt < existing.firstDate) {
            existing.firstDate = msg.createdAt;
          }
        } else {
          dmKeywords.set(token, { count: 1, firstDate: msg.createdAt });
        }
      }
    }
  }

  if (dmKeywords.size === 0 || totalDmMessages < 5) return null;

  // Step 2: Build ad targeting keyword map with earliest date
  const adTargeting = new Map<
    string,
    { count: number; firstDate: string | null; type: string }
  >();
  let totalAdImpressions = 0;

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      totalAdImpressions++;
      for (const tc of imp.targetingCriteria) {
        if (!tc.targetingValue) continue;
        const tokens = tokenize(tc.targetingValue);
        for (const token of tokens) {
          const existing = adTargeting.get(token);
          if (existing) {
            existing.count++;
            if (
              !existing.firstDate ||
              imp.impressionTime < existing.firstDate
            ) {
              existing.firstDate = imp.impressionTime;
            }
          } else {
            adTargeting.set(token, {
              count: 1,
              firstDate: imp.impressionTime,
              type: tc.targetingType,
            });
          }
        }
      }
    }
  }

  if (adTargeting.size === 0) return null;

  // Step 3: Find overlapping keywords
  const matches: DmAdMatch[] = [];

  for (const [keyword, dmInfo] of dmKeywords) {
    const adInfo = adTargeting.get(keyword);
    if (!adInfo) continue;

    // Skip very common words that slipped through — require at least 2 DM mentions
    if (dmInfo.count < 2) continue;

    const adFollowedDm =
      dmInfo.firstDate !== null &&
      adInfo.firstDate !== null &&
      adInfo.firstDate > dmInfo.firstDate;

    matches.push({
      keyword,
      dmMentions: dmInfo.count,
      firstDmDate: dmInfo.firstDate,
      adImpressions: adInfo.count,
      targetingType: adInfo.type,
      firstAdDate: adInfo.firstDate,
      adFollowedDm,
    });
  }

  if (matches.length === 0) return null;

  // Sort by suspicion: ad-follows-DM first, then by DM mention count
  matches.sort((a, b) => {
    if (a.adFollowedDm !== b.adFollowedDm) return a.adFollowedDm ? -1 : 1;
    return b.dmMentions - a.dmMentions;
  });

  const overlapCount = matches.length;
  const totalTargetingCriteria = adTargeting.size;
  const correlationRate =
    totalTargetingCriteria > 0
      ? Math.round((overlapCount / totalTargetingCriteria) * 100)
      : 0;

  return {
    matches,
    totalDmMessages,
    totalAdImpressions,
    overlapCount,
    correlationRate,
    mostSuspicious: matches.find((m) => m.adFollowedDm) ?? matches[0] ?? null,
  };
}
