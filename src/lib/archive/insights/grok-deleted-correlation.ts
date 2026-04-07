// ---------------------------------------------------------------------------
// Grok × Deleted Tweets — cross-references AI conversations with deletions
// ---------------------------------------------------------------------------
//
// Did you ask Grok about a topic, then delete tweets about it? X has both —
// the thing you tried to hide AND the evidence you were worried about it.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

// --- Types ------------------------------------------------------------------

export interface GrokDeletedMatch {
  /** The overlapping keyword/topic. */
  readonly keyword: string;
  /** Grok message text (truncated) mentioning this topic. */
  readonly grokExcerpt: string;
  /** When the Grok message was sent. */
  readonly grokDate: string;
  /** Deleted tweet text (truncated) mentioning this topic. */
  readonly deletedExcerpt: string;
  /** When the deleted tweet was posted. */
  readonly deletedDate: string;
  /** True if the Grok query happened AFTER the tweet deletion. */
  readonly grokAfterDeletion: boolean;
}

export interface GrokDeletedCorrelation {
  /** All topic matches found. */
  readonly matches: readonly GrokDeletedMatch[];
  /** Total Grok user messages analyzed. */
  readonly totalGrokMessages: number;
  /** Total deleted tweets analyzed. */
  readonly totalDeletedTweets: number;
  /** Number of overlapping topics. */
  readonly overlapCount: number;
}

// --- Helpers ----------------------------------------------------------------

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
  "about",
  "your",
  "like",
  "know",
  "think",
  "want",
  "some",
  "more",
  "here",
  "there",
  "make",
  "help",
  "tell",
  "need",
  "also",
  "really",
  "please",
  "thanks",
  "good",
  "right",
  "http",
  "https",
  "www",
  "com",
]);

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w));
  return new Set(words);
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

// --- Main -------------------------------------------------------------------

export function buildGrokDeletedCorrelation(
  archive: ParsedArchive,
): GrokDeletedCorrelation | null {
  if (archive.grokConversations.length === 0) return null;
  if (archive.deletedTweets.length === 0) return null;

  // Step 1: Build keyword → grok message map (user messages only)
  const grokKeywords = new Map<string, { text: string; date: string }>();
  let totalGrokMessages = 0;

  for (const convo of archive.grokConversations) {
    for (const msg of convo.messages) {
      if (msg.sender !== "user") continue;
      totalGrokMessages++;
      const tokens = tokenize(msg.message);
      for (const token of tokens) {
        if (!grokKeywords.has(token)) {
          grokKeywords.set(token, {
            text: msg.message,
            date: msg.createdAt,
          });
        }
      }
    }
  }

  if (grokKeywords.size === 0 || totalGrokMessages < 2) return null;

  // Step 2: Build keyword → deleted tweet map
  const deletedKeywords = new Map<string, { text: string; date: string }>();

  for (const tweet of archive.deletedTweets) {
    const tokens = tokenize(tweet.fullText);
    for (const token of tokens) {
      if (!deletedKeywords.has(token)) {
        deletedKeywords.set(token, {
          text: tweet.fullText,
          date: tweet.createdAt,
        });
      }
    }
  }

  if (deletedKeywords.size === 0) return null;

  // Step 3: Find overlapping keywords
  const seenPairs = new Set<string>();
  const matches: GrokDeletedMatch[] = [];

  for (const [keyword, grokInfo] of grokKeywords) {
    const deletedInfo = deletedKeywords.get(keyword);
    if (!deletedInfo) continue;

    // Avoid duplicate matches for the same grok+tweet pair
    const pairKey = `${grokInfo.text.slice(0, 30)}|${deletedInfo.text.slice(0, 30)}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const grokDate = parseDate(grokInfo.date);
    const deletedDate = parseDate(deletedInfo.date);
    const grokAfterDeletion =
      grokDate !== null && deletedDate !== null && grokDate > deletedDate;

    matches.push({
      keyword,
      grokExcerpt: truncateText(grokInfo.text, 120),
      grokDate: grokInfo.date,
      deletedExcerpt: truncateText(deletedInfo.text, 120),
      deletedDate: deletedInfo.date,
      grokAfterDeletion,
    });
  }

  if (matches.length === 0) return null;

  // Prioritize matches where Grok was asked after deletion (most suspicious)
  matches.sort((a, b) => {
    if (a.grokAfterDeletion !== b.grokAfterDeletion)
      return a.grokAfterDeletion ? -1 : 1;
    return 0;
  });

  return {
    matches: matches.slice(0, 20),
    totalGrokMessages,
    totalDeletedTweets: archive.deletedTweets.length,
    overlapCount: matches.length,
  };
}
