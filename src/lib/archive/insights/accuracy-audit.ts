// ---------------------------------------------------------------------------
// Accuracy Audit — how much of X's profile is grounded in your real content?
// ---------------------------------------------------------------------------
//
// Cross-references X's inferred interests against actual user behavior
// (tweets, likes) and ad targeting to assign each interest a verdict:
//
//   ✅ Confirmed   — interest appears in tweets/likes (phrase or all-tokens match)
//   ❌ Unconfirmed — no behavioral evidence; X inferred this on its own
//   ⚠️ Bought      — came from a data broker (partner interest), unverifiable
//
// The headline rate is `confirmed / total` — the share of X's profile that
// the user's *own* writing actually supports. Note: we report this as
// "share of inferences with evidence", NOT as "X's accuracy", because the
// absence of a topic in your tweets doesn't strictly mean X is wrong about
// you (you may simply not tweet about every interest you have).
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildAdTargetingCounts,
  buildCorpus,
  matchInterests,
} from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export type AccuracyVerdict = "confirmed" | "unconfirmed" | "bought";

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
  /** Interests with no behavioral evidence in tweets/likes. */
  readonly unconfirmedCount: number;
  /** Interests sourced from third-party data brokers (cannot self-verify). */
  readonly boughtCount: number;
  /** Share of interests with behavioral evidence (0–100). */
  readonly confirmedPercent: number;
  /** Share without evidence (0–100). */
  readonly unconfirmedPercent: number;
  /** Share from data brokers (0–100). */
  readonly boughtPercent: number;
  /** Top 5 unconfirmed interests with the most ad impressions. */
  readonly topUnconfirmed: readonly AuditedInterest[];
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

  // Build behavior corpora (a single pass; expensive on huge archives)
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
  const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));

  // We need at least some behavior data to make verdicts meaningful
  if (tweetCorpus.text.length < 100 && likeCorpus.text.length < 100) {
    return null;
  }

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
      verdict = "unconfirmed";
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
  const unconfirmedCount = entries.filter(
    (e) => e.verdict === "unconfirmed",
  ).length;
  const boughtCount = entries.filter((e) => e.verdict === "bought").length;
  const total = entries.length;

  // All three rates use the *full* total as denominator. The previous
  // implementation used (confirmed + wrong) which made e.g. 40 / 50
  // unconfirmed look like "80 % accurate" while ignoring the broker pile.
  const confirmedPercent =
    total > 0 ? Math.round((confirmedCount / total) * 100) : 0;
  const unconfirmedPercent =
    total > 0 ? Math.round((unconfirmedCount / total) * 100) : 0;
  const boughtPercent =
    total > 0 ? Math.round((boughtCount / total) * 100) : 0;

  // Sort for top lists: unconfirmed with most ad impressions first
  const unconfirmedEntries = entries
    .filter((e) => e.verdict === "unconfirmed")
    .sort((a, b) => b.adImpressions - a.adImpressions);

  const confirmedEntries = entries
    .filter((e) => e.verdict === "confirmed")
    .sort((a, b) => b.adImpressions - a.adImpressions);

  const boughtEntries = entries
    .filter((e) => e.verdict === "bought")
    .sort((a, b) => b.adImpressions - a.adImpressions);

  return {
    totalAudited: total,
    confirmedCount,
    unconfirmedCount,
    boughtCount,
    confirmedPercent,
    unconfirmedPercent,
    boughtPercent,
    topUnconfirmed: unconfirmedEntries.slice(0, 5),
    topConfirmed: confirmedEntries.slice(0, 5),
    topBought: boughtEntries.slice(0, 3),
    entries,
  };
}
