import { buildWrappedStats } from "@/lib/archive/insights/wrapped-stats";
import { truncate } from "@/lib/format";
import type { ComputeContext } from "../../types";

export interface WrappedCardProps {
  readonly username: string;
  readonly daysOnX: number;
  readonly tweetCount: number;
  readonly likeCount: number;
  readonly topHashtag: { tag: string; count: number } | null;
  readonly topHourLabel: string | null;
  readonly topContactScreenName: string | null;
  readonly firstTweetText: string | null;
  readonly firstTweetDate: string | null;
}

export function computeWrapped(ctx: ComputeContext): WrappedCardProps | null {
  const stats = buildWrappedStats(ctx.archive);
  if (!stats) return null;
  if (stats.daysOnX === null) return null;

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
  };
}

export function computeWrappedShareability(props: WrappedCardProps): number {
  const yearsOnX = props.daysOnX / 365;
  const ageScore = Math.min(80, yearsOnX * 8);
  const hashBonus = props.topHashtag ? 10 : 0;
  const contactBonus = props.topContactScreenName ? 10 : 0;
  return Math.round(Math.min(100, ageScore + hashBonus + contactBonus));
}
