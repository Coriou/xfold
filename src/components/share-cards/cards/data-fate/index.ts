import type { ShareCardModule } from "../../types";
import { DataFateCard } from "./card";
import {
  computeDataFateCard,
  computeDataFateShareability,
  type DataFateCardProps,
} from "./compute";

export const dataFateCard: ShareCardModule<DataFateCardProps> = {
  meta: {
    id: "data-fate",
    title: "If You Left Today",
    tagline: "What actually happens to your data when you hit delete",
    category: "headline",
    slug: "if-you-left-today",
  },
  compute: computeDataFateCard,
  shareabilityScore: computeDataFateShareability,
  Component: DataFateCard,
};
