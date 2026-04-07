import type { ShareCardModule } from "../../types";
import { AdvertiserWallCard } from "./card";
import {
  computeAdvertiserWall,
  computeAdvertiserWallShareability,
  type AdvertiserWallCardProps,
} from "./compute";

export const advertiserWallCard: ShareCardModule<AdvertiserWallCardProps> = {
  meta: {
    id: "advertiser-wall",
    title: "The Advertiser Wall",
    tagline: "Every brand that paid to reach you",
    category: "ads",
    slug: "advertiser-wall",
  },
  compute: computeAdvertiserWall,
  shareabilityScore: computeAdvertiserWallShareability,
  Component: AdvertiserWallCard,
};
