import { findFirstAndLastTweet } from "@/lib/archive/insights/first-and-last-tweet";
import { truncate } from "@/lib/format";
import type { ComputeContext } from "../../types";

export interface FirstAndLastCardProps {
  readonly username: string;
  readonly firstText: string;
  readonly firstDate: string;
  readonly lastText: string;
  readonly lastDate: string;
  readonly daysBetween: number;
}

export function computeFirstAndLast(
  ctx: ComputeContext,
): FirstAndLastCardProps | null {
  const fl = findFirstAndLastTweet(ctx.archive);
  if (!fl.first || !fl.last) return null;
  // Need a real time delta — same-tweet edge case isn't shareable.
  if (fl.first === fl.last) return null;

  return {
    username: ctx.archive.meta.username,
    firstText: truncate(fl.first.fullText, 140),
    firstDate: fl.first.createdAt,
    lastText: truncate(fl.last.fullText, 140),
    lastDate: fl.last.createdAt,
    daysBetween: fl.daysBetween,
  };
}

export function computeFirstAndLastShareability(
  props: FirstAndLastCardProps,
): number {
  // Long timelines are the hook. Cap at ~10 years (3650 days).
  return Math.round(Math.min(100, (props.daysBetween / 3650) * 100));
}
