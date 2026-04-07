import type { ComputeContext, ShareabilityScore } from "../../types";

export interface CompareCTACardProps {
  readonly username: string;
  readonly grade: string;
  readonly overall: number;
  readonly headline: string;
  readonly topStats: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly statCount: number;
}

export function computeCompareCTA(
  ctx: ComputeContext,
): CompareCTACardProps | null {
  const { archive, score } = ctx;

  // Build top 4 most compelling stats
  const stats: { label: string; value: string }[] = [];

  // Deleted tweets
  if (archive.deletedTweets.length > 0) {
    stats.push({
      label: "Deleted tweets kept",
      value: archive.deletedTweets.length.toLocaleString(),
    });
  }

  // Advertisers
  const advertisers = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) advertisers.add(imp.advertiserName);
  }
  if (advertisers.size > 0) {
    stats.push({
      label: "Companies targeting you",
      value: advertisers.size.toLocaleString(),
    });
  }

  // Interests
  const interestCount = archive.personalization?.interests.length ?? 0;
  if (interestCount > 0) {
    stats.push({
      label: "Interests inferred",
      value: interestCount.toLocaleString(),
    });
  }

  // Grok messages
  const grokMsgs = archive.grokConversations.reduce(
    (s, c) => s + c.messages.filter((m) => m.sender === "user").length,
    0,
  );
  if (grokMsgs > 0) {
    stats.push({
      label: "Grok messages stored",
      value: grokMsgs.toLocaleString(),
    });
  }

  // IP audit
  const ips = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  if (ips > 0) {
    stats.push({ label: "IPs tracked", value: ips.toLocaleString() });
  }

  // Contacts
  if (archive.contacts.length > 0) {
    stats.push({
      label: "Contacts uploaded",
      value: archive.contacts.length.toLocaleString(),
    });
  }

  if (stats.length < 2) return null;

  return {
    username: archive.meta.username,
    grade: score.grade,
    overall: score.overall,
    headline: score.headline,
    topStats: stats.slice(0, 4),
    statCount: stats.length,
  };
}

export function computeCompareCTAShareability(
  props: CompareCTACardProps,
): ShareabilityScore {
  return {
    // The whole point is to make people compare — social dynamics drives shares
    magnitude: Math.min(100, props.overall + 10),
    specificity: Math.min(100, 75 + props.topStats.length * 5),
    uniqueness: 90, // "How does yours compare?" framing is unique
  };
}
