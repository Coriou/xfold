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
    tagline: "Days on X, top hashtag, top hour, first tweet",
    category: "headline",
    slug: "wrapped",
  },
  compute: computeWrapped,
  shareabilityScore: computeWrappedShareability,
  Component: WrappedCard,
};
