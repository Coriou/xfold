import {
  buildQuotePool,
  type Quote,
  type QuoteSource,
} from "@/lib/archive/insights/quote-pool";
import { buildInterestPipeline } from "@/lib/archive/insights/interest-pipeline";
import type { ComputeContext } from "../../types";

export interface ScoreCardReceipt {
  readonly icon: string;
  readonly text: string;
  readonly severity: "low" | "medium" | "high";
}

export interface ScoreCardProps {
  readonly username: string;
  readonly overall: number;
  readonly grade: string;
  readonly headline: string;
  /**
   * The single most-quotable receipt from the archive, or null when nothing
   * specific can be extracted (very small archives, etc).
   */
  readonly quote: ScoreCardQuote | null;
  /** Up to 3 cross-domain receipts shown under the score. */
  readonly receipts: readonly ScoreCardReceipt[];
  /** Three short fact-bullets, used as a fallback when no quote is available. */
  readonly bullets: readonly string[];
  /** Aggregate stats kept around for non-quote callouts. */
  readonly tweets: number;
  readonly interests: number;
  readonly advertisers: number;
}

export interface ScoreCardQuote {
  readonly text: string;
  readonly source: QuoteSource;
  readonly date: string | null;
  readonly contextLine: string;
  readonly severity: "low" | "medium" | "high";
}

function quoteToScoreQuote(q: Quote): ScoreCardQuote {
  return {
    text: q.text,
    source: q.source,
    date: q.date,
    contextLine: q.contextLine,
    severity: q.severity,
  };
}

function buildReceipts(ctx: ComputeContext): ScoreCardReceipt[] {
  const { archive } = ctx;
  const receipts: ScoreCardReceipt[] = [];

  // Receipt 1: Tracking
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  const subnets = new Set(
    archive.ipAudit.map((e) => {
      const parts = e.loginIp.split(".");
      return parts.length >= 3
        ? `${parts[0]}.${parts[1]}.${parts[2]}`
        : e.loginIp;
    }),
  ).size;
  if (uniqueIps > 0) {
    receipts.push({
      icon: "\uD83D\uDCCD",
      text: `Logged in from ${uniqueIps} IPs across ${subnets} networks`,
      severity: uniqueIps > 20 ? "high" : uniqueIps > 5 ? "medium" : "low",
    });
  }

  // Receipt 2: Profiling
  const pipeline = buildInterestPipeline(archive);
  if (pipeline && pipeline.unconfirmedCount > 0) {
    receipts.push({
      icon: "\uD83C\uDFAF",
      text: `${pipeline.totalInterests} interests assigned, ${pipeline.unconfirmedCount} unconfirmed`,
      severity:
        pipeline.unconfirmedButMonetized > 10
          ? "high"
          : pipeline.unconfirmedCount > 30
            ? "medium"
            : "low",
    });
  } else if (archive.personalization) {
    const count = archive.personalization.interests.length;
    if (count > 0) {
      receipts.push({
        icon: "\uD83C\uDFAF",
        text: `${count} interests inferred about you`,
        severity: count > 100 ? "high" : count > 30 ? "medium" : "low",
      });
    }
  }

  // Receipt 3: Monetization
  const advCount = countUniqueAdvertisers(ctx);
  if (advCount > 0) {
    receipts.push({
      icon: "\uD83D\uDCB0",
      text: `${advCount} advertisers, $0 paid to you`,
      severity: advCount > 200 ? "high" : advCount > 50 ? "medium" : "low",
    });
  }

  // Receipt 4 (fallback): Data retention
  if (receipts.length < 3 && archive.deletedTweets.length > 0) {
    receipts.push({
      icon: "\uD83D\uDDD1\uFE0F",
      text: `${archive.deletedTweets.length} deleted tweets still stored`,
      severity: archive.deletedTweets.length > 100 ? "high" : "medium",
    });
  }

  return receipts.slice(0, 3);
}

function fallbackBullets(ctx: ComputeContext): string[] {
  const { archive, score } = ctx;

  // Pull the top 3 categories by score (already sorted desc by computePrivacyScore).
  const topCategories = score.categories.slice(0, 3);
  const bullets: string[] = [];

  for (const cat of topCategories) {
    const firstMetric = cat.metrics[0];
    if (!firstMetric) continue;
    const valueStr =
      typeof firstMetric.value === "number"
        ? firstMetric.value.toLocaleString("en-US")
        : firstMetric.value;
    bullets.push(
      `${cat.label}: ${valueStr} ${firstMetric.label.toLowerCase()}`,
    );
  }

  // Always end with a "this is X data points" total if we have one.
  const totalPoints =
    archive.tweets.length +
    archive.likes.length +
    archive.directMessages.reduce((s, c) => s + c.messages.length, 0);
  if (totalPoints > 0) {
    bullets.push(
      `${totalPoints.toLocaleString("en-US")} total data points stored`,
    );
  }

  return bullets.slice(0, 4);
}

function countUniqueAdvertisers(ctx: ComputeContext): number {
  const set = new Set<string>();
  for (const batch of ctx.archive.adImpressions) {
    for (const imp of batch.impressions) set.add(imp.advertiserScreenName);
  }
  for (const batch of ctx.archive.adEngagements) {
    for (const eng of batch.engagements) set.add(eng.advertiserScreenName);
  }
  return set.size;
}

export function computeScore(ctx: ComputeContext): ScoreCardProps | null {
  // Score card always renders — even an empty archive yields A grade.
  const pool = buildQuotePool(ctx.archive);
  const bestQuote = pool[0] ?? null;
  const receipts = buildReceipts(ctx);

  return {
    username: ctx.archive.meta.username,
    overall: ctx.score.overall,
    grade: ctx.score.grade,
    headline: ctx.score.headline,
    quote: bestQuote ? quoteToScoreQuote(bestQuote) : null,
    receipts,
    bullets: bestQuote ? [] : fallbackBullets(ctx),
    tweets: ctx.archive.tweets.length,
    interests: ctx.archive.personalization?.interests.length ?? 0,
    advertisers: countUniqueAdvertisers(ctx),
  };
}

export function computeScoreShareability(props: ScoreCardProps) {
  // Specificity is dominated by whether we have a real quote + receipts.
  const hasReceipts = props.receipts.length >= 2;
  const specificity = props.quote ? 85 : hasReceipts ? 65 : 30;
  // Magnitude tracks the actual privacy score.
  const magnitude = Math.max(0, Math.min(100, props.overall));
  // Uniqueness boosted by receipts covering multiple domains.
  const uniqueness = props.quote ? 65 : hasReceipts ? 55 : 30;

  return { magnitude, specificity, uniqueness };
}
