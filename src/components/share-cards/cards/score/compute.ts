import type { ComputeContext } from "../../types";

export interface ScoreCardProps {
  readonly username: string;
  readonly overall: number;
  readonly grade: string;
  readonly headline: string;
  /** 3 short narrative bullets explaining the grade. */
  readonly bullets: readonly string[];
  readonly tweets: number;
  readonly interests: number;
  readonly advertisers: number;
}

function bulletsFromScore(ctx: ComputeContext): string[] {
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
  return {
    username: ctx.archive.meta.username,
    overall: ctx.score.overall,
    grade: ctx.score.grade,
    headline: ctx.score.headline,
    bullets: bulletsFromScore(ctx),
    tweets: ctx.archive.tweets.length,
    interests: ctx.archive.personalization?.interests.length ?? 0,
    advertisers: uniqueAdvertisers(ctx),
  };
}

export function computeScoreShareability(props: ScoreCardProps): number {
  // The worse the grade, the more shareable. F's get featured; A's hide.
  return Math.max(0, Math.min(100, props.overall));
}
