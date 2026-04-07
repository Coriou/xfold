// ---------------------------------------------------------------------------
// Data broker pipeline — third-party interest labels vs. reality
// ---------------------------------------------------------------------------
//
// X gets "partner interests" from third-party data brokers — labels attached
// to users by companies the user has no relationship with. This insight
// cross-references those labels against:
//
//   1. Actual tweet/like behavior (is the label accurate?)
//   2. Ad targeting criteria (did advertisers use these broker labels?)
//   3. Off-Twitter conversions (did the broker labeling lead to tracking?)
//
// The result exposes how data brokers describe you to X, often inaccurately.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildCorpus,
  isInterestConfirmed,
  tokenizeInterest,
} from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export interface BrokerLabel {
  /** The label from the data broker. */
  readonly label: string;
  /** Whether the user's behavior confirms this label. */
  readonly confirmedByBehavior: boolean;
  /** Number of ad impressions that used this or a similar targeting value. */
  readonly adImpressions: number;
  /** Whether any off-twitter conversion keyword matches this label. */
  readonly linkedToConversion: boolean;
}

export interface DataBrokerPipelineStats {
  /** Total partner interest labels from data brokers. */
  readonly totalLabels: number;
  /** Labels confirmed by the user's actual behavior. */
  readonly confirmedCount: number;
  /** Labels with NO behavioral evidence. */
  readonly unconfirmedCount: number;
  /** Unconfirmed labels that advertisers still used for targeting. */
  readonly unconfirmedButTargeted: number;
  /** All entries sorted by outrage (unconfirmed + monetized first). */
  readonly entries: readonly BrokerLabel[];
  /** The most absurd label — unconfirmed with the most ad impressions. */
  readonly mostAbsurd: BrokerLabel | null;
  /** Total ad impressions from broker-sourced targeting. */
  readonly totalBrokerImpressions: number;
}

// --- Helpers ----------------------------------------------------------------

function buildConversionKeywords(archive: ParsedArchive): Set<string> {
  const keywords = new Set<string>();

  for (const e of archive.offTwitter.mobileConversionsAttributed) {
    keywords.add(e.applicationName.toLowerCase());
    if (e.conversionEventName)
      keywords.add(e.conversionEventName.toLowerCase());
  }
  for (const e of archive.offTwitter.mobileConversionsUnattributed) {
    keywords.add(e.applicationName.toLowerCase());
    if (e.conversionEventName)
      keywords.add(e.conversionEventName.toLowerCase());
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

function labelMatchesConversions(
  label: string,
  conversionKeywords: Set<string>,
): boolean {
  const lower = label.toLowerCase().trim();
  if (lower.length < 4) return false;

  for (const kw of conversionKeywords) {
    if (kw.includes(lower)) return true;
  }

  const tokens = lower
    .split(/[&\/,\-\s]/)
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

export function buildDataBrokerPipeline(
  archive: ParsedArchive,
): DataBrokerPipelineStats | null {
  const partnerInterests = archive.personalization?.partnerInterests;
  if (!partnerInterests || partnerInterests.length === 0) return null;

  // Step 1: Build behavior corpus
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
  const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));

  // Step 2: Build ad targeting counts for partner interests
  // Partner interests appear in ad targeting with various type labels
  const adCounts = new Map<string, number>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (tc.targetingValue) {
          const key = tc.targetingValue.toLowerCase();
          adCounts.set(key, (adCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  // Step 3: Build conversion keywords
  const conversionKeywords = buildConversionKeywords(archive);

  // Step 4: Evaluate each partner interest
  const entries: BrokerLabel[] = [];

  for (const label of partnerInterests) {
    const tokens = tokenizeInterest(label);

    // Behavior check — uses the rigorous phrase/all-tokens matcher rather
    // than naive substring inclusion (which mis-matched "Machine Learning"
    // against "machine politics"). Same fix as accuracy-audit.
    const confirmedByBehavior =
      isInterestConfirmed(label, tweetCorpus) ||
      isInterestConfirmed(label, likeCorpus);

    // Ad targeting check
    const lower = label.toLowerCase();
    let adImpressions = adCounts.get(lower) ?? 0;
    if (adImpressions === 0) {
      for (const token of tokens) {
        const count = adCounts.get(token) ?? 0;
        if (count > adImpressions) adImpressions = count;
      }
    }

    // Conversion check
    const linkedToConversion = labelMatchesConversions(
      label,
      conversionKeywords,
    );

    entries.push({
      label,
      confirmedByBehavior,
      adImpressions,
      linkedToConversion,
    });
  }

  // Sort: unconfirmed + monetized first, then by ad impressions
  entries.sort((a, b) => {
    const aScore =
      (a.confirmedByBehavior ? 0 : 100) +
      a.adImpressions +
      (a.linkedToConversion ? 50 : 0);
    const bScore =
      (b.confirmedByBehavior ? 0 : 100) +
      b.adImpressions +
      (b.linkedToConversion ? 50 : 0);
    return bScore - aScore;
  });

  const confirmedCount = entries.filter((e) => e.confirmedByBehavior).length;
  const unconfirmedCount = entries.length - confirmedCount;
  const unconfirmedButTargeted = entries.filter(
    (e) => !e.confirmedByBehavior && e.adImpressions > 0,
  ).length;
  const totalBrokerImpressions = entries.reduce(
    (sum, e) => sum + e.adImpressions,
    0,
  );

  // Most absurd: unconfirmed with highest impressions
  const mostAbsurd =
    entries.find((e) => !e.confirmedByBehavior && e.adImpressions > 0) ??
    entries.find((e) => !e.confirmedByBehavior) ??
    null;

  return {
    totalLabels: entries.length,
    confirmedCount,
    unconfirmedCount,
    unconfirmedButTargeted,
    entries,
    mostAbsurd,
    totalBrokerImpressions,
  };
}
