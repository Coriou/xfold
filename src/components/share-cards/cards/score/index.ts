import type { ShareCardModule } from "../../types";
import { ScoreCard } from "./card";
import {
  computeScore,
  computeScoreShareability,
  type ScoreCardProps,
} from "./compute";

export const scoreCard: ShareCardModule<ScoreCardProps> = {
  meta: {
    id: "score",
    title: "Your X Receipt",
    tagline: "Every way X profiled, tracked, and monetized you — itemized",
    category: "score",
    slug: "x-receipt",
  },
  compute: computeScore,
  shareabilityScore: computeScoreShareability,
  Component: ScoreCard,
};
