// ---------------------------------------------------------------------------
// Interest matching — compare inferred interests against actual behavior
// ---------------------------------------------------------------------------
//
// X assigns each user a list of "interests" used for ad targeting. We want
// to know which of those are *actually* supported by the user's own content
// (tweets + likes) versus pure guesses.
//
// The naive approach — "does any token of the interest appear as a substring
// of the corpus?" — produces systematic false positives. For example, the
// interest "Machine Learning" would match a tweet saying "machine politics"
// because the token "machine" appears in the corpus, even though the user
// has never mentioned ML.
//
// Instead, we confirm an interest only if either:
//
//   1. The full interest phrase appears verbatim in the corpus
//      (e.g. "machine learning" as contiguous words), OR
//   2. Every meaningful token of the interest appears as a *whole word*
//      in the corpus word set (so "machine" + "learning" must both be
//      present somewhere).
//
// Both signals can produce false positives in the limit (a tweet with
// "machine" and a separate tweet with "learning" would still confirm), but
// they no longer fire on a single unrelated word.
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

/**
 * Lowercased corpus + the set of distinct ≥4-char words it contains.
 *
 * The set is what makes whole-word matching cheap; the string is what
 * makes phrase matching cheap. We pay the tokenization cost once.
 */
export interface CorpusContext {
  readonly text: string;
  readonly words: ReadonlySet<string>;
}

const MIN_TOKEN_LENGTH = 4;

/** Build a corpus context from a list of texts. */
export function buildCorpus(
  texts: (string | null | undefined)[],
): CorpusContext {
  const words = new Set<string>();
  const parts: string[] = [];
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    parts.push(lower);
    for (const word of lower.split(/[^a-z0-9']+/i)) {
      if (word.length >= MIN_TOKEN_LENGTH) words.add(word);
    }
  }
  return { text: parts.join(" "), words };
}

/** Split an interest name into searchable ≥4-char tokens (lowercased). */
export function tokenizeInterest(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9']+/i)
    .filter((s) => s.length >= MIN_TOKEN_LENGTH);
}

/**
 * Is the user's behavior consistent with this interest being real?
 *
 * Two ways for an interest to be confirmed:
 *
 *   - phrase: the normalized lowercased interest name appears as a
 *     contiguous substring of the corpus.
 *   - all-tokens: every ≥4-char token of the interest exists in the
 *     corpus word set. Single-token interests need only that one token.
 *
 * An interest with no usable tokens (e.g. "AI" — too short) cannot be
 * confirmed by token matching, but can still match by phrase.
 */
export function isInterestConfirmed(
  interestName: string,
  corpus: CorpusContext,
): boolean {
  const phrase = interestName.toLowerCase().trim().replace(/\s+/g, " ");
  if (!phrase) return false;

  // Phrase match: e.g. "machine learning" must appear contiguously.
  // Only meaningful for phrases that are at least MIN_TOKEN_LENGTH long
  // (otherwise we'd false-positive on every short stem like "ai").
  if (phrase.length >= MIN_TOKEN_LENGTH && corpus.text.includes(phrase)) {
    return true;
  }

  // All-tokens match: every meaningful token must be in the word set.
  const tokens = tokenizeInterest(interestName);
  if (tokens.length === 0) return false;
  return tokens.every((t) => corpus.words.has(t));
}

/** Match interests against tweet/like corpora and ad targeting data. */
export function matchInterests(
  interests: PersonalizationInterest[],
  tweetCorpus: CorpusContext,
  likeCorpus: CorpusContext,
  adTargetingCounts: Map<string, number>,
): InterestMatch[] {
  return interests.map((interest) => {
    const confirmedByTweets = isInterestConfirmed(interest.name, tweetCorpus);
    const confirmedByLikes = isInterestConfirmed(interest.name, likeCorpus);

    // Match against ad targeting: try exact name match first, then tokens
    const nameLower = interest.name.toLowerCase();
    let adImpressionCount = adTargetingCounts.get(nameLower) ?? 0;
    if (adImpressionCount === 0) {
      const tokens = tokenizeInterest(interest.name);
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
  impressions: {
    targetingCriteria: { targetingType: string; targetingValue: string | null }[];
  }[],
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
