// ---------------------------------------------------------------------------
// Deletion lie — topics from deleted tweets that X still profiles
// ---------------------------------------------------------------------------
//
// When users delete tweets, they expect those words to disappear. But X
// retains the text AND may still profile the user for topics mentioned
// exclusively in deleted content. This insight cross-references:
//
//   1. Keywords/hashtags extracted from deleted tweets
//   2. Personalization interests (X's current inferred profile)
//   3. Ad targeting criteria (what advertisers were told about the user)
//
// The result: topics the user tried to erase that X still monetizes.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { tokenizeInterest } from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export interface DeletionLieEntry {
  /** The topic/interest that survived deletion. */
  readonly interestName: string;
  /** Number of deleted tweets that mentioned this topic. */
  readonly deletedMentions: number;
  /** Number of active tweets that mention this topic (0 = fully erased). */
  readonly activeMentions: number;
  /** Whether this topic appears in X's current interest profile. */
  readonly inInterestProfile: boolean;
  /** Number of ad impressions that targeted this topic. */
  readonly adImpressions: number;
  /** Whether the user disabled this interest (extra outrage if so). */
  readonly isDisabled: boolean;
}

export interface DeletionLieStats {
  /** Total topics from deleted tweets found in X's interest profile. */
  readonly survivingTopicCount: number;
  /** Topics that are ONLY in deleted tweets (zero active mentions). */
  readonly fullyErasedButProfiled: number;
  /** Total ad impressions driven by deletion-surviving topics. */
  readonly totalAdImpressions: number;
  /** The entries, sorted by deletedMentions desc. */
  readonly entries: readonly DeletionLieEntry[];
  /** The single most outrageous case. */
  readonly worstCase: DeletionLieEntry | null;
  /** Total deleted tweets in the archive. */
  readonly totalDeleted: number;
}

// --- Helpers ----------------------------------------------------------------

/** Extract meaningful keywords from tweet text for topic matching. */
function extractKeywords(text: string): string[] {
  // Pull hashtags sans #
  const hashtags = Array.from(text.matchAll(/#(\w{3,})/g), (m) => m[1] ?? "")
    .filter((h) => h.length >= 3)
    .map((h) => h.toLowerCase());

  // Also extract significant words (4+ chars, skip common stop words)
  const stopWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "been",
    "were",
    "they",
    "their",
    "them",
    "what",
    "when",
    "where",
    "which",
    "will",
    "would",
    "could",
    "should",
    "about",
    "there",
    "these",
    "those",
    "than",
    "then",
    "just",
    "more",
    "some",
    "also",
    "very",
    "much",
    "like",
    "into",
    "over",
    "only",
    "your",
    "each",
    "make",
    "know",
    "take",
    "come",
    "want",
    "look",
    "http",
    "https",
    "t.co",
    "lol",
  ]);

  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  return [...new Set([...hashtags, ...words])];
}

// --- Main -------------------------------------------------------------------

export function buildDeletionLie(
  archive: ParsedArchive,
): DeletionLieStats | null {
  if (archive.deletedTweets.length === 0) return null;

  const interests = archive.personalization?.interests;
  if (!interests || interests.length === 0) return null;

  // Step 1: Build keyword frequency maps from deleted and active tweets
  const deletedKeywords = new Map<string, number>();
  for (const tweet of archive.deletedTweets) {
    for (const kw of extractKeywords(tweet.fullText)) {
      deletedKeywords.set(kw, (deletedKeywords.get(kw) ?? 0) + 1);
    }
  }

  const activeKeywords = new Map<string, number>();
  for (const tweet of archive.tweets) {
    for (const kw of extractKeywords(tweet.fullText)) {
      activeKeywords.set(kw, (activeKeywords.get(kw) ?? 0) + 1);
    }
  }

  // Step 2: Build ad targeting impression counts
  const adCounts = new Map<string, number>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (
          tc.targetingValue &&
          tc.targetingType.toLowerCase().includes("interest")
        ) {
          const key = tc.targetingValue.toLowerCase();
          adCounts.set(key, (adCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  // Step 3: For each interest, check if deleted tweets mention it
  const entries: DeletionLieEntry[] = [];

  for (const interest of interests) {
    const tokens = tokenizeInterest(interest.name);

    // Count deleted mentions
    let deletedMentions = 0;
    for (const token of tokens) {
      deletedMentions += deletedKeywords.get(token) ?? 0;
    }

    if (deletedMentions === 0) continue;

    // Count active mentions
    let activeMentions = 0;
    for (const token of tokens) {
      activeMentions += activeKeywords.get(token) ?? 0;
    }

    // Ad impressions for this interest
    const lower = interest.name.toLowerCase();
    let adImpressions = adCounts.get(lower) ?? 0;
    if (adImpressions === 0) {
      for (const token of tokens) {
        const count = adCounts.get(token) ?? 0;
        if (count > adImpressions) adImpressions = count;
      }
    }

    entries.push({
      interestName: interest.name,
      deletedMentions,
      activeMentions,
      inInterestProfile: true,
      adImpressions,
      isDisabled: interest.isDisabled,
    });
  }

  if (entries.length === 0) return null;

  // Sort by deleted mentions desc, preferring fully-erased topics
  entries.sort((a, b) => {
    // Fully-erased topics first (zero active mentions)
    if (a.activeMentions === 0 && b.activeMentions > 0) return -1;
    if (b.activeMentions === 0 && a.activeMentions > 0) return 1;
    // Then by deleted mentions
    return b.deletedMentions - a.deletedMentions;
  });

  const fullyErasedButProfiled = entries.filter(
    (e) => e.activeMentions === 0,
  ).length;

  const totalAdImpressions = entries.reduce(
    (sum, e) => sum + e.adImpressions,
    0,
  );

  return {
    survivingTopicCount: entries.length,
    fullyErasedButProfiled,
    totalAdImpressions,
    entries,
    worstCase: entries[0] ?? null,
    totalDeleted: archive.deletedTweets.length,
  };
}
