import type { ShareCardModule } from "../../types";
import { CompareCTACard } from "./card";
import {
  computeCompareCTA,
  computeCompareCTAShareability,
  type CompareCTACardProps,
} from "./compute";

export const compareCTACard: ShareCardModule<CompareCTACardProps> = {
  meta: {
    id: "compare-cta",
    title: "How Does Yours Compare?",
    tagline: "Challenge others to see what X knows about them",
    category: "score",
    slug: "compare",
  },
  compute: computeCompareCTA,
  shareabilityScore: computeCompareCTAShareability,
  Component: CompareCTACard,
};
