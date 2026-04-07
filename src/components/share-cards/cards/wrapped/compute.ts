import { buildWrappedStats } from "@/lib/archive/insights/wrapped-stats";
import type { Persona } from "@/lib/archive/insights/wrapped-stats";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface WrappedCardProps {
  readonly username: string;
  readonly daysOnX: number;
  readonly tweetCount: number;
  readonly likeCount: number;
  readonly topHashtag: { readonly tag: string; readonly count: number } | null;
  readonly topHourLabel: string | null;
  readonly topContactScreenName: string | null;
  readonly firstTweetText: string | null;
  readonly firstTweetDate: string | null;
  /** Behavioral persona derived from tweet-type breakdown. */
  readonly persona: Persona;
  /** One-line personality read based on behavior ratios. */
  readonly personalityLine: string;
}

function derivePersonalityLine(
  persona: Persona,
  tweetCount: number,
  likeCount: number,
): string {
  const ratio = tweetCount > 0 ? likeCount / tweetCount : 0;
  if (tweetCount === 0 && likeCount > 0)
    return "You never tweeted but liked everything — the ultimate lurker.";
  if (ratio > 20)
    return `You liked ${Math.round(ratio)}× more than you tweeted — a dedicated observer.`;
  if (ratio > 5)
    return `${Math.round(ratio)} likes for every tweet — you consume more than you create.`;
  switch (persona) {
    case "Conversationalist":
      return "Most of your tweets were replies — you came to talk, not broadcast.";
    case "Curator":
      return "You retweeted more than you wrote — amplifying others' voices.";
    case "Broadcaster":
      return "You wrote more originals than replies — a true broadcaster.";
  }
}

export function computeWrapped(ctx: ComputeContext): WrappedCardProps | null {
  const stats = buildWrappedStats(ctx.archive);
  if (!stats) return null;
  if (stats.daysOnX === null) return null;

  const persona = stats.breakdown.persona;

  return {
    username: stats.username,
    daysOnX: stats.daysOnX,
    tweetCount: stats.tweetCount,
    likeCount: stats.likeCount,
    topHashtag: stats.topHashtags[0] ?? null,
    topHourLabel: stats.topHour?.label ?? null,
    topContactScreenName: stats.topContacts[0]?.screenName ?? null,
    firstTweetText: stats.firstAndLast.first
      ? truncate(stats.firstAndLast.first.fullText, 140)
      : null,
    firstTweetDate: stats.firstAndLast.first?.createdAt ?? null,
    persona,
    personalityLine: derivePersonalityLine(
      persona,
      stats.tweetCount,
      stats.likeCount,
    ),
  };
}

export function computeWrappedShareability(
  props: WrappedCardProps,
): ShareabilityScore {
  const yearsOnX = props.daysOnX / 365;
  const magnitude = Math.min(100, yearsOnX * 8);
  // Persona + personality line make this specific to the user
  const specificity = Math.min(
    100,
    50 +
      (props.topHashtag ? 15 : 0) +
      (props.topContactScreenName ? 15 : 0) +
      (props.firstTweetText ? 10 : 0) +
      10, // persona always available
  );
  const uniqueness = 60; // Wrapped format is common, but persona angle adds novelty

  return { magnitude, specificity, uniqueness };
}
