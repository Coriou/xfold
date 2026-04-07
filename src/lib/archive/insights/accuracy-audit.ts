// ---------------------------------------------------------------------------
// Accuracy Audit — how wrong is X's profile of you?
// ---------------------------------------------------------------------------
//
// Cross-references X's inferred interests against actual user behavior
// (tweets, likes) and ad targeting to assign each interest a verdict:
//
//   ✅ Confirmed — user discussed this topic in tweets/likes
//   ❌ Wrong     — zero evidence in behavior, X just guessed
//   ⚠️ Bought    — came from a data broker (partner interest), unverifiable
//   ❓ Unknown   — from ad targeting only, can't confirm or deny
//
// The key stat: "X got N% of your interests wrong" — the headline number
// that makes this card shareable.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildAdTargetingCounts,
  buildCorpus,
  matchInterests,
} from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export type AccuracyVerdict = "confirmed" | "wrong" | "bought" | "unknown";

export interface AuditedInterest {
  /** Interest name as X labeled it. */
  readonly name: string;
  /** Our verdict on this interest. */
  readonly verdict: AccuracyVerdict;
  /** Number of ad impressions that used this interest. */
  readonly adImpressions: number;
  /** Was this interest disabled by the user? */
  readonly isDisabled: boolean;
}

export interface AccuracyAuditResult {
  /** Total interests audited. */
  readonly totalAudited: number;
  /** Counts per verdict. */
  readonly confirmedCount: number;
  readonly wrongCount: number;
  readonly boughtCount: number;
  readonly unknownCount: number;
  /** Accuracy rate: confirmed / (confirmed + wrong) as 0–100 */
  readonly accuracyPercent: number;
  /** The inverse — how wrong X is — as a whole number. */
  readonly wrongPercent: number;
  /** Top 5 wrong interests (good for display). */
  readonly topWrong: readonly AuditedInterest[];
  /** Top 5 confirmed interests (for balance). */
  readonly topConfirmed: readonly AuditedInterest[];
  /** Top 3 data-broker interests. */
  readonly topBought: readonly AuditedInterest[];
  /** All audited entries for detailed views. */
  readonly entries: readonly AuditedInterest[];
}

// --- Main -------------------------------------------------------------------

export function buildAccuracyAudit(
  archive: ParsedArchive,
): AccuracyAuditResult | null {
  const interests = archive.personalization?.interests;
  if (!interests || interests.length < 5) return null;

  // Build behavior corpora
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
  const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));

  // We need at least some behavior data to make verdicts meaningful
  if (tweetCorpus.length < 100 && likeCorpus.length < 100) return null;

  // Build ad targeting counts
  const adTargetingCounts = buildAdTargetingCounts(
    archive.adImpressions.flatMap((b) => b.impressions),
  );

  // Match interests
  const matches = matchInterests(
    interests,
    tweetCorpus,
    likeCorpus,
    adTargetingCounts,
  );

  // Build partner interest set for "bought" detection
  const brokerInterests = new Set(
    (archive.personalization?.partnerInterests ?? []).map((s) =>
      s.toLowerCase(),
    ),
  );

  // Assign verdicts
  const entries: AuditedInterest[] = matches.map((m) => {
    let verdict: AccuracyVerdict;
    if (m.confirmed) {
      verdict = "confirmed";
    } else if (brokerInterests.has(m.name.toLowerCase())) {
      verdict = "bought";
    } else {
      // No behavior evidence — X just guessed (or advertisers assumed)
      verdict = "wrong";
    }

    return {
      name: m.name,
      verdict,
      adImpressions: m.adImpressionCount,
      isDisabled: m.isDisabled,
    };
  });

  const confirmedCount = entries.filter(
    (e) => e.verdict === "confirmed",
  ).length;
  const wrongCount = entries.filter((e) => e.verdict === "wrong").length;
  const boughtCount = entries.filter((e) => e.verdict === "bought").length;
  const unknownCount = entries.filter((e) => e.verdict === "unknown").length;

  const verifiable = confirmedCount + wrongCount;
  const accuracyPercent =
    verifiable > 0 ? Math.round((confirmedCount / verifiable) * 100) : 0;
  const wrongPercent = verifiable > 0 ? 100 - accuracyPercent : 0;

  // Sort for top lists: wrong with most ad impressions first (most outrageous)
  const wrongEntries = entries
    .filter((e) => e.verdict === "wrong")
    .sort((a, b) => b.adImpressions - a.adImpressions);

  const confirmedEntries = entries
    .filter((e) => e.verdict === "confirmed")
    .sort((a, b) => b.adImpressions - a.adImpressions);

  const boughtEntries = entries
    .filter((e) => e.verdict === "bought")
    .sort((a, b) => b.adImpressions - a.adImpressions);

  return {
    totalAudited: entries.length,
    confirmedCount,
    wrongCount,
    boughtCount,
    unknownCount,
    accuracyPercent,
    wrongPercent,
    topWrong: wrongEntries.slice(0, 5),
    topConfirmed: confirmedEntries.slice(0, 5),
    topBought: boughtEntries.slice(0, 3),
    entries,
  };
}
