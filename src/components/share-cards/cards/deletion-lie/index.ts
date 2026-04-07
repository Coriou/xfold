import type { ShareCardModule } from "../../types";
import { DeletionLieCard } from "./card";
import {
  computeDeletionLie,
  computeDeletionLieShareability,
  type DeletionLieCardProps,
} from "./compute";

export const deletionLieCard: ShareCardModule<DeletionLieCardProps> = {
  meta: {
    id: "deletion-lie",
    title: "The Deletion Lie",
    tagline: "You deleted it — X monetized it",
    category: "headline",
    slug: "deletion-lie",
  },
  compute: computeDeletionLie,
  shareabilityScore: computeDeletionLieShareability,
  Component: DeletionLieCard,
};
