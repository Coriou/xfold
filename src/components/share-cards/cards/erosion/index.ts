import type { ShareCardModule } from "../../types";
import { ErosionCard } from "./card";
import {
  computeErosion,
  computeErosionShareability,
  type ErosionCardProps,
} from "./compute";

export const erosionCard: ShareCardModule<ErosionCardProps> = {
  meta: {
    id: "erosion",
    title: "Privacy Erosion",
    tagline: "How X's surveillance expanded year by year",
    category: "headline",
    slug: "privacy-erosion",
  },
  compute: computeErosion,
  shareabilityScore: computeErosionShareability,
  Component: ErosionCard,
};
