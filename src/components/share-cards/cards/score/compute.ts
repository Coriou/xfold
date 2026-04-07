import {
  buildQuotePool,
  type Quote,
  type QuoteSource,
} from "@/lib/archive/insights/quote-pool";
import { buildInterestPipeline } from "@/lib/archive/insights/interest-pipeline";
import { buildZombieInterests } from "@/lib/archive/insights/zombie-interests";
import { buildDataBrokerPipeline } from "@/lib/archive/insights/data-broker-pipeline";
import { computeBenchmarks } from "@/lib/archive/insights/benchmarks";
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
  /** Up to 5 cross-domain receipts — the "X receipt" format. */
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

  // Precompute benchmarks for inline comparison text
  const benchmarks = computeBenchmarks(archive);
  const bench = (id: string) => benchmarks.find((b) => b.id === id);
  const multiplierTag = (id: string) => {
    const b = bench(id);
    return b?.multiplier && b.multiplier > 1.5
      ? ` (${b.multiplier.toFixed(1)}\u00d7 typical)`
      : "";
  };

  // Receipt 1: Tracking — unique IPs and networks
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
      text: `Logged in from ${uniqueIps} IPs across ${subnets} networks${multiplierTag("login-ips")}`,
      severity: uniqueIps > 20 ? "high" : uniqueIps > 5 ? "medium" : "low",
    });
  }

  // Receipt 2: Zombie interests — disabled but still monetized
  const zombies = buildZombieInterests(archive);
  if (zombies && zombies.zombieCount > 0) {
    receipts.push({
      icon: "\uD83E\uDDDF",
      text: `${zombies.zombieCount} interests you disabled are still being sold`,
      severity: zombies.zombieCount > 5 ? "high" : "medium",
    });
  }

  // Receipt 3: Profiling — unconfirmed interests
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

  // Receipt 4: Monetization — advertisers
  const advCount = countUniqueAdvertisers(ctx);
  if (advCount > 0) {
    receipts.push({
      icon: "\uD83D\uDCB0",
      text: `${advCount.toLocaleString("en-US")} advertisers targeted you${multiplierTag("advertisers")}, $0 paid to you`,
      severity: advCount > 200 ? "high" : advCount > 50 ? "medium" : "low",
    });
  }

  // Receipt 5: Data brokers — third-party labels
  const brokers = buildDataBrokerPipeline(archive);
  if (brokers && brokers.unconfirmedCount > 0) {
    receipts.push({
      icon: "\uD83D\uDD75\uFE0F",
      text: `${brokers.totalLabels} data broker labels, ${brokers.unconfirmedCount} with no basis`,
      severity: brokers.unconfirmedButTargeted > 3 ? "high" : "medium",
    });
  }

  // Receipt 6: Data retention — deleted tweets still stored
  if (archive.deletedTweets.length > 0) {
    receipts.push({
      icon: "\uD83D\uDDD1\uFE0F",
      text: `${archive.deletedTweets.length} "deleted" tweets still in X\u2019s possession${multiplierTag("deleted-tweets")}`,
      severity: archive.deletedTweets.length > 100 ? "high" : "medium",
    });
  }

  // Receipt 7: Connected apps with access
  const writeApps = archive.connectedApps.filter(
    (a) =>
      a.permissions.includes("write") ||
      a.permissions.includes("Read and write"),
  );
  if (writeApps.length > 0) {
    receipts.push({
      icon: "\uD83D\uDD11",
      text: `${writeApps.length} apps can still post on your behalf`,
      severity: writeApps.length > 3 ? "high" : "medium",
    });
  }

  return receipts.slice(0, 5);
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
  // More receipts = more specific and shareable
  const receiptBonus = Math.min(30, props.receipts.length * 8);
  const hasReceipts = props.receipts.length >= 2;
  const specificity = props.quote
    ? 85 + receiptBonus
    : hasReceipts
      ? 65 + receiptBonus
      : 30;
  // Magnitude tracks the actual privacy score.
  const magnitude = Math.max(0, Math.min(100, props.overall));
  // Uniqueness boosted by receipts covering multiple domains.
  const uniqueness = props.quote
    ? 70 + receiptBonus
    : hasReceipts
      ? 60 + receiptBonus
      : 30;

  return {
    magnitude,
    specificity: Math.min(100, specificity),
    uniqueness: Math.min(100, uniqueness),
  };
}
