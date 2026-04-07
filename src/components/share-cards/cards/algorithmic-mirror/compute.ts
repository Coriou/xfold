import { buildAlgorithmicMirror } from "@/lib/archive/insights/algorithmic-mirror";
import { truncate } from "@/lib/format";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface AlgorithmicMirrorCardProps {
  readonly username: string;
  /** The generated bio line. */
  readonly bio: string;
  /** Gender if known. */
  readonly gender: string | null;
  /** Age range. */
  readonly ageRange: string | null;
  /** Primary location. */
  readonly location: string | null;
  /** Top 4 interests for display. */
  readonly topInterests: readonly string[];
  /** Total interest count. */
  readonly totalInterests: number;
  /** Top 2 shows. */
  readonly topShows: readonly string[];
  /** Top lookalike target. */
  readonly topLookalike: string | null;
  /** How many years X has been profiling this user. */
  readonly profileYears: number;
  /** One absurdity for the punchline, if available. */
  readonly absurdity: string | null;
}

export function computeAlgorithmicMirror(
  ctx: ComputeContext,
): AlgorithmicMirrorCardProps | null {
  const mirror = buildAlgorithmicMirror(ctx.archive);
  if (!mirror) return null;

  // Need at least some profile data to make the card interesting
  const hasContent =
    mirror.gender != null ||
    mirror.ageRange != null ||
    mirror.totalInterests > 0 ||
    mirror.location != null;
  if (!hasContent) return null;

  return {
    username: ctx.archive.meta.username,
    bio: truncate(mirror.generatedBio, 120),
    gender: mirror.gender,
    ageRange: mirror.ageRange,
    location: mirror.location,
    topInterests: mirror.topInterests.slice(0, 4),
    totalInterests: mirror.totalInterests,
    topShows: mirror.topShows.slice(0, 2),
    topLookalike: mirror.lookalikeTargets[0] ?? null,
    profileYears: Math.floor(mirror.profileAgeDays / 365),
    absurdity: mirror.absurdities[0] ?? null,
  };
}

export function computeAlgorithmicMirrorShareability(
  props: AlgorithmicMirrorCardProps,
): ShareabilityScore {
  // This card is inherently high-specificity — it's about the user personally
  const interestMagnitude = Math.min(100, props.totalInterests / 2);
  const profileBonus = Math.min(30, props.profileYears * 3);

  return {
    magnitude: Math.min(100, interestMagnitude + profileBonus),
    specificity: 95, // It's literally a profile of the user
    uniqueness: 85, // Algorithmic profile assembly is unique to xfold
  };
}
