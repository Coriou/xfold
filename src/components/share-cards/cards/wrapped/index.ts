import type { ShareCardModule } from "../../types";
import { WrappedCard } from "./card";
import {
  computeWrapped,
  computeWrappedShareability,
  type WrappedCardProps,
} from "./compute";

export const wrappedCard: ShareCardModule<WrappedCardProps> = {
  meta: {
    id: "wrapped",
    title: "Your X, Wrapped",
    tagline: "Your X personality type, top stats, and first tweet",
    category: "headline",
    slug: "wrapped",
  },
  compute: computeWrapped,
  shareabilityScore: computeWrappedShareability,
  Component: WrappedCard,
};
