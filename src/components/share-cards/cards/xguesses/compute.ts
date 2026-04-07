import { buildInterestPipeline } from "@/lib/archive/insights/interest-pipeline";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface XGuessesCardProps {
  readonly username: string;
  /** Total interests X assigned. */
  readonly totalInterests: number;
  /** Interests not backed by any tweet or like. */
  readonly unconfirmedCount: number;
  /** Unconfirmed interests that were sold to advertisers anyway. */
  readonly unconfirmedMonetized: number;
  /** Top 6 unconfirmed-but-monetized interest names for display. */
  readonly examples: readonly string[];
}

export function computeXGuesses(ctx: ComputeContext): XGuessesCardProps | null {
  const pipeline = buildInterestPipeline(ctx.archive);
  if (!pipeline) return null;
  if (pipeline.unconfirmedCount < 3) return null;

  const monetizedUnconfirmed = pipeline.entries
    .filter((e) => !e.confirmedByBehavior && e.advertiserCount > 0)
    .sort((a, b) => b.advertiserCount - a.advertiserCount);

  const examples = monetizedUnconfirmed
    .slice(0, 6)
    .map((e) => truncate(e.name, 30));

  return {
    username: ctx.archive.meta.username,
    totalInterests: pipeline.totalInterests,
    unconfirmedCount: pipeline.unconfirmedCount,
    unconfirmedMonetized: pipeline.unconfirmedButMonetized,
    examples,
  };
}

export function computeXGuessesShareability(
  props: XGuessesCardProps,
): ShareabilityScore {
  const unconfirmedRatio =
    props.unconfirmedCount / Math.max(1, props.totalInterests);
  return {
    magnitude: Math.min(100, props.unconfirmedCount * 2),
    specificity: Math.min(
      100,
      unconfirmedRatio * 120 + (props.examples.length > 0 ? 20 : 0),
    ),
    uniqueness: 75,
  };
}
