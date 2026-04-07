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
    title: "Privacy Score",
    tagline: "Your X exposure grade with a narrative explanation",
    category: "score",
    slug: "score",
  },
  compute: computeScore,
  shareabilityScore: computeScoreShareability,
  Component: ScoreCard,
};
