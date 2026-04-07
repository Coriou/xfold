import type { ShareCardModule } from "../../types";
import { TopFindingCard } from "./card";
import {
  computeTopFinding,
  computeTopFindingShareability,
  type TopFindingCardProps,
} from "./compute";

export const topFindingCard: ShareCardModule<TopFindingCardProps> = {
  meta: {
    id: "top-finding",
    title: "Your #1 Finding",
    tagline: "The most alarming thing hiding in your archive",
    category: "headline",
    slug: "top-finding",
  },
  compute: computeTopFinding,
  shareabilityScore: computeTopFindingShareability,
  Component: TopFindingCard,
};
