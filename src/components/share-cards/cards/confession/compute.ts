import { buildConfessions } from "@/lib/archive/insights/confessions";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface ConfessionCardProps {
  readonly username: string;
  readonly tag: string;
  readonly icon: string;
  readonly claim: string;
  readonly proof: string;
  readonly proofDate: string | null;
  readonly punchline: string;
}

export function computeConfession(
  ctx: ComputeContext,
): ConfessionCardProps | null {
  const confessions = buildConfessions(ctx.archive);
  if (confessions.length === 0) return null;

  // Pick the most shareable confession
  const best = confessions[0];
  if (!best) return null;

  return {
    username: ctx.archive.meta.username,
    tag: best.tag,
    icon: best.icon,
    claim: best.claim,
    proof: best.proof,
    proofDate: best.proofDate,
    punchline: best.punchline,
  };
}

export function computeConfessionShareability(
  props: ConfessionCardProps,
): ShareabilityScore {
  const hasQuote = props.proof.startsWith('"') || props.proof.includes('"');
  return {
    magnitude: 60,
    // Extremely specific — one claim, one proof
    specificity: hasQuote ? 95 : 85,
    // Very unique framing — confession format
    uniqueness: 90,
  };
}
