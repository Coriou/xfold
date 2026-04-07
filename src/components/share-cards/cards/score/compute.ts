import {
  buildQuotePool,
  type Quote,
  type QuoteSource,
} from "@/lib/archive/insights/quote-pool";
import type { ComputeContext } from "../../types";

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
    bullets.push(`${cat.label}: ${valueStr} ${firstMetric.label.toLowerCase()}`);
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

function uniqueAdvertisers(ctx: ComputeContext): number {
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

  return {
    username: ctx.archive.meta.username,
    overall: ctx.score.overall,
    grade: ctx.score.grade,
    headline: ctx.score.headline,
    quote: bestQuote ? quoteToScoreQuote(bestQuote) : null,
    bullets: bestQuote ? [] : fallbackBullets(ctx),
    tweets: ctx.archive.tweets.length,
    interests: ctx.archive.personalization?.interests.length ?? 0,
    advertisers: uniqueAdvertisers(ctx),
  };
}

export function computeScoreShareability(props: ScoreCardProps) {
  // Specificity is dominated by whether we have a real quote.
  const specificity = props.quote ? 80 : 30;
  // Magnitude tracks the actual privacy score.
  const magnitude = Math.max(0, Math.min(100, props.overall));
  // Uniqueness is moderate — every archive has some kind of quote.
  const uniqueness = props.quote ? 60 : 30;

  return { magnitude, specificity, uniqueness };
}
