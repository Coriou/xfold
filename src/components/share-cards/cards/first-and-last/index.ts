import type { ShareCardModule } from "../../types";
import { FirstAndLastCard } from "./card";
import {
  computeFirstAndLast,
  computeFirstAndLastShareability,
  type FirstAndLastCardProps,
} from "./compute";

export const firstAndLastCard: ShareCardModule<FirstAndLastCardProps> = {
  meta: {
    id: "first-and-last",
    title: "First & Last",
    tagline: "Your very first tweet next to your latest",
    category: "history",
    slug: "first-and-last",
  },
  compute: computeFirstAndLast,
  shareabilityScore: computeFirstAndLastShareability,
  Component: FirstAndLastCard,
};
