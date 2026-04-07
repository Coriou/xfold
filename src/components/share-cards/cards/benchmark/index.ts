import type { ShareCardModule } from "../../types";
import { BenchmarkCard } from "./card";
import {
  computeBenchmarkCard,
  computeBenchmarkShareability,
  type BenchmarkCardProps,
} from "./compute";

export const benchmarkCard: ShareCardModule<BenchmarkCardProps> = {
  meta: {
    id: "benchmark",
    title: "How You Compare",
    tagline: "Your data footprint vs. the typical X user",
    category: "score",
    slug: "benchmark",
  },
  compute: computeBenchmarkCard,
  shareabilityScore: computeBenchmarkShareability,
  Component: BenchmarkCard,
};
