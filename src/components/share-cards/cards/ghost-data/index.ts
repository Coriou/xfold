import type { ShareCardModule } from "../../types";
import { GhostDataCard } from "./card";
import {
  computeGhostData,
  computeGhostDataShareability,
  type GhostDataCardProps,
} from "./compute";

export const ghostDataCard: ShareCardModule<GhostDataCardProps> = {
  meta: {
    id: "ghost-data",
    title: "Ghost Data",
    tagline: "Data X hid from their own archive viewer",
    category: "headline",
    slug: "ghost-data",
  },
  compute: computeGhostData,
  shareabilityScore: computeGhostDataShareability,
  Component: GhostDataCard,
};
