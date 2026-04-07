import type { ShareCardModule } from "../../types";
import { XVsRealityCard } from "./card";
import {
  computeXVsReality,
  computeXVsRealityShareability,
  type XVsRealityCardProps,
} from "./compute";

export const xVsRealityCard: ShareCardModule<XVsRealityCardProps> = {
  meta: {
    id: "x-vs-reality",
    title: "X's Version vs. Reality",
    tagline: "Side-by-side: what X shows you vs. what's actually stored",
    category: "headline",
    slug: "x-vs-reality",
  },
  compute: computeXVsReality,
  shareabilityScore: computeXVsRealityShareability,
  Component: XVsRealityCard,
};
