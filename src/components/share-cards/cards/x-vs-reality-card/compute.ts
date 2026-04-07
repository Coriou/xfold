import { buildXVsReality } from "@/lib/archive/insights/x-vs-reality";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface XVsRealityCardProps {
  readonly username: string;
  readonly rows: readonly {
    readonly category: string;
    readonly xVersion: string;
    readonly reality: string;
    readonly severity: "critical" | "warning" | "info";
  }[];
  readonly criticalCount: number;
}

export function computeXVsReality(
  ctx: ComputeContext,
): XVsRealityCardProps | null {
  const data = buildXVsReality(ctx.archive);
  if (!data || data.totalRows < 3) return null;

  return {
    username: ctx.archive.meta.username,
    rows: data.rows.slice(0, 4).map((r) => ({
      category: r.category,
      xVersion: r.xVersion,
      reality: r.reality,
      severity: r.severity,
    })),
    criticalCount: data.criticalCount,
  };
}

export function computeXVsRealityShareability(
  props: XVsRealityCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.criticalCount * 25 + 20),
    specificity: Math.min(100, 80 + props.rows.length * 5),
    uniqueness: 95, // "Side-by-side truth" framing is very unique
  };
}
