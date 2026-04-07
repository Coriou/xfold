import { computeBenchmarks } from "@/lib/archive/insights/benchmarks";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface BenchmarkCardProps {
  readonly username: string;
  /** Top 4 most concerning benchmarks for the card. */
  readonly items: readonly BenchmarkItem[];
  /** How many total benchmarks are concerning. */
  readonly totalConcerning: number;
}

export interface BenchmarkItem {
  readonly label: string;
  readonly value: string;
  readonly typical: string;
  readonly multiplier: string;
}

export function computeBenchmarkCard(
  ctx: ComputeContext,
): BenchmarkCardProps | null {
  const benchmarks = computeBenchmarks(ctx.archive);
  const concerning = benchmarks.filter((b) => b.isConcerning);
  if (concerning.length === 0) return null;

  const items: BenchmarkItem[] = concerning.slice(0, 4).map((b) => ({
    label: b.label,
    value: b.value.toLocaleString("en-US"),
    typical: b.typicalRange,
    multiplier:
      b.multiplier !== null && b.multiplier > 1
        ? `${b.multiplier.toFixed(1)}×`
        : "above avg",
  }));

  return {
    username: ctx.archive.meta.username,
    items,
    totalConcerning: concerning.length,
  };
}

export function computeBenchmarkShareability(
  props: BenchmarkCardProps,
): ShareabilityScore {
  return {
    magnitude: Math.min(100, props.totalConcerning * 20),
    specificity: Math.min(100, 60 + props.items.length * 10),
    uniqueness: 80, // Comparative framing is rare in privacy tools
  };
}
