import { buildBetrayalStack } from "@/lib/archive/insights/betrayal-stack";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface BetrayalStackCardProps {
  readonly username: string;
  readonly betrayalCount: number;
  readonly betrayals: readonly {
    readonly label: string;
    readonly userAction: string;
    readonly xAction: string;
    readonly evidence: string;
  }[];
}

export function computeBetrayalStack(
  ctx: ComputeContext,
): BetrayalStackCardProps | null {
  const stack = buildBetrayalStack(ctx.archive);
  if (!stack || stack.count === 0) return null;

  return {
    username: ctx.archive.meta.username,
    betrayalCount: stack.count,
    betrayals: stack.betrayals.slice(0, 3).map((b) => ({
      label: b.label,
      userAction: b.userAction,
      xAction: b.xAction,
      evidence: b.evidence,
    })),
  };
}

export function computeBetrayalStackShareability(
  props: BetrayalStackCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.betrayalCount * 35),
    // Very high specificity — concrete user actions + X responses
    specificity: Math.min(100, 80 + props.betrayalCount * 7),
    uniqueness: 95, // "Broken promises" framing is unique
  };
}
