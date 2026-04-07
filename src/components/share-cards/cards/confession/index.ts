import type { ShareCardModule } from "../../types";
import { ConfessionCard } from "./card";
import {
  computeConfession,
  computeConfessionShareability,
  type ConfessionCardProps,
} from "./compute";

export const confessionCard: ShareCardModule<ConfessionCardProps> = {
  meta: {
    id: "confession",
    title: "The Receipts",
    tagline: "One fact. One proof. No excuses.",
    category: "headline",
    slug: "the-receipts",
  },
  compute: computeConfession,
  shareabilityScore: computeConfessionShareability,
  Component: ConfessionCard,
};
