import { buildXEras } from "@/lib/archive/insights/x-eras";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface XErasCardProps {
  readonly username: string;
  readonly totalYears: number;
  readonly eras: readonly {
    readonly label: string;
    readonly name: string;
    readonly description: string;
    readonly tweetsPerDay: number;
    readonly primaryClient: string;
  }[];
}

export function computeXEras(ctx: ComputeContext): XErasCardProps | null {
  const result = buildXEras(ctx.archive);
  if (!result || result.eras.length < 2) return null;

  return {
    username: result.username,
    totalYears: result.totalYears,
    eras: result.eras.slice(0, 5).map((era) => ({
      label: era.label,
      name: era.name,
      description: era.description,
      tweetsPerDay: era.tweetsPerDay,
      primaryClient: era.primaryClient,
    })),
  };
}

export function computeXErasShareability(
  props: XErasCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.totalYears * 8),
    // Very high specificity — personalized era names and descriptions
    specificity: Math.min(100, 75 + props.eras.length * 5),
    uniqueness: 95, // Completely unique to xfold — no other tool does this
  };
}
