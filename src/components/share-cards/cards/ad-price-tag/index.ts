import type { ShareCardModule } from "../../types";
import { AdPriceTagCard } from "./card";
import {
  computeAdPriceTag,
  computeAdPriceTagShareability,
  type AdPriceTagCardProps,
} from "./compute";

export const adPriceTagCard: ShareCardModule<AdPriceTagCardProps> = {
  meta: {
    id: "ad-price-tag",
    title: "Your Ad Price Tag",
    tagline: "How much X earned from your attention",
    category: "ads",
    slug: "ad-price-tag",
  },
  compute: computeAdPriceTag,
  shareabilityScore: computeAdPriceTagShareability,
  Component: AdPriceTagCard,
};
